import {db} from './db.js';
import {collectTrends} from './trends.js';
import {analyzeTrend} from './opportunities.js';
import {findAffiliateOffers} from './affiliates.js';

const now=()=>new Date().toISOString();
export async function runDailyCampaign(){
  const started=now();
  const ins=await db.run('INSERT INTO runs(started_at,status) VALUES(?,?)',[started,'running']);
  const runId=ins.lastInsertRowid||ins.rows?.[0]?.id;
  let productsFound=0,postsCreated=0,trendsFound=0,qualifiedTrends=0;
  try{
    const trends=await collectTrends();
    trendsFound=trends.length;
    for(const t of trends){
      await db.run('INSERT INTO trends(term,source,score,captured_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING',
        [t.term,t.source,t.score,t.captured_at]);
    }

    const ranked=trends.map(t=>({...t,...analyzeTrend(t.term)}))
      .filter(t=>t.score>=50)
      .sort((a,b)=>b.score-a.score);
    qualifiedTrends=ranked.length;

    for(const trend of ranked.slice(0,5)){
      const offers=await findAffiliateOffers(trend);
      for(const offer of offers){
        // Only persist offers with a real product page and a real affiliate tracking URL.
        if(!offer.title || !offer.product_url || !offer.affiliate_url) continue;
        const inserted=await db.run(
          'INSERT INTO products(title,merchant,product_url,affiliate_url,price_brl,commission_note,image_url,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
          [offer.title,offer.merchant,offer.product_url,offer.affiliate_url,offer.price_brl??null,
           offer.commission_note??null,offer.image_url??null,'verified_offer',now()]);
        productsFound++;
        const commissionText=offer.commission_note ? '\\nComissão informada pelo programa: '+offer.commission_note : '';
        const caption='🛍️ Produto encontrado: '+offer.title+
          (offer.price_brl ? '\\nPreço consultado: R$ '+Number(offer.price_brl).toFixed(2).replace('.',',') : '')+
          commissionText+'\\n\\nConfira a oferta: '+offer.affiliate_url+
          '\\n\\nLink de afiliado: podemos receber comissão por compras realizadas por este link, sem custo adicional para você.';
        await db.run('INSERT INTO posts(product_id,platform,caption,status,created_at) VALUES(?,?,?,?,?)',
          [inserted.lastInsertRowid||inserted.rows?.[0]?.id||null,'facebook',caption,'draft',now()]);
        postsCreated++;
      }
    }

    await db.run('UPDATE runs SET finished_at=?,status=?,trends_found=?,products_found=?,posts_created=? WHERE id=?',
      [now(),'completed',trendsFound,productsFound,postsCreated,runId]);
    return {trendsFound,qualifiedTrends,productsFound,postsCreated};
  }catch(e){
    await db.run('UPDATE runs SET finished_at=?,status=?,error=? WHERE id=?',[now(),'failed',e.message,runId]);
    throw e;
  }
}

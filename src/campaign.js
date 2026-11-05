import {db} from './db.js';
import {collectTrends,commercialScore} from './trends.js';
import {findAffiliateOffers} from './affiliates.js';

const now=()=>new Date().toISOString();
export async function runDailyCampaign(){
  const started=now();
  const ins=await db.run('INSERT INTO runs(started_at,status) VALUES(?,?)',[started,'running']);
  const runId=ins.lastInsertRowid||ins.rows?.[0]?.id;
  let productsFound=0,postsCreated=0,trendsFound=0;
  try{
    const trends=await collectTrends();trendsFound=trends.length;
    for(const t of trends)await db.run('INSERT INTO trends(term,source,score,captured_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING',[t.term,t.source,t.score,t.captured_at]);
    const ranked=trends.map(t=>({...t,commercial_score:commercialScore(t.term)})).filter(t=>t.commercial_score>=50).sort((a,b)=>b.commercial_score+b.score-a.commercial_score-a.score);
    for(const trend of ranked.slice(0,5)){
      const offers=await findAffiliateOffers(trend);
      for(const offer of offers){
        await db.run('INSERT INTO products(title,merchant,status,created_at,commission_note) VALUES(?,?,?,?,?)',[offer.title,offer.merchant,'candidate',now(),offer.note||null]);productsFound++;
      }
    }
    const best=ranked[0];
    if(best){
      const caption='🔎 Em alta: '+best.term+'\n\nEstamos acompanhando esta tendência. Consulte preço, disponibilidade e condições diretamente na loja.\n\nPublicidade de afiliado: poderemos receber comissão por compras feitas por nossos links, sem custo adicional para você.';
      await db.run('INSERT INTO posts(platform,caption,status,created_at) VALUES(?,?,?,?)',['facebook',caption,'draft',now()]);postsCreated++;
    }
    await db.run('UPDATE runs SET finished_at=?,status=?,trends_found=?,products_found=?,posts_created=? WHERE id=?',[now(),'completed',trendsFound,productsFound,postsCreated,runId]);
    return {trendsFound,productsFound,postsCreated};
  }catch(e){
    await db.run('UPDATE runs SET finished_at=?,status=?,error=? WHERE id=?',[now(),'failed',e.message,runId]);throw e;
  }
}

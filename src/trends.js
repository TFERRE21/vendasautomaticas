import { XMLParser } from 'fast-xml-parser';

export async function collectTrends(){
  const url=process.env.GOOGLE_TRENDS_RSS_URL||'https://trends.google.com/trending/rss?geo=BR';
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'user-agent':'VendasAutomaticas/1.0'}});
  if(!response.ok)throw new Error('Google Trends RSS HTTP '+response.status);
  const parsed=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_'}).parse(await response.text());
  const items=parsed?.rss?.channel?.item||[];
  const list=Array.isArray(items)?items:[items];
  return list.slice(0,50).map((x,i)=>({term:String(x.title||'').trim(),source:'google-trends-rss',score:100-i*2,captured_at:new Date().toISOString()})).filter(x=>x.term);
}
export function commercialScore(term){
  const t=term.toLocaleLowerCase('pt-BR');
  const buying=['iphone','celular','smartphone','notebook','televis','fone','headphone','air fryer','geladeira','ferramenta','eletrodoméstico','tablet','monitor','playstation','xbox','samsung','xiaomi','motorola','promoção','oferta'];
  const exclude=['resultado','partida','eleição','acidente','morte','clima','novela'];
  if(exclude.some(x=>t.includes(x)))return 0;
  return Math.min(100,35+buying.filter(x=>t.includes(x)).length*18);
}

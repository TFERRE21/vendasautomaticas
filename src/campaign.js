import {db} from './db.js';
import {collectTrends} from './trends.js';
const now=()=>new Date().toISOString();
export async function runDailyCampaign(){
 const started=now();const ins=await db.run('INSERT INTO runs(started_at,status) VALUES(?,?)',[started,'running']);const runId=ins.lastInsertRowid||ins.rows?.[0]?.id;
 let trendsFound=0;
 try{
  const trends=await collectTrends();trendsFound=trends.length;
  for(const t of trends)await db.run('INSERT INTO trends(term,source,score,captured_at,geo,traffic_bucket,traffic_lower_bound) VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',[t.term,t.source,t.score,t.captured_at,t.geo,t.traffic_bucket,t.traffic_lower_bound]);
  const countries=[...new Set(trends.map(t=>t.geo))];
  await db.run('UPDATE runs SET finished_at=?,status=?,trends_found=?,products_found=0,posts_created=0 WHERE id=?',[now(),'completed',trendsFound,runId]);
  return {trendsFound,countries};
 }catch(e){await db.run('UPDATE runs SET finished_at=?,status=?,error=? WHERE id=?',[now(),'failed',e.message,runId]);throw e;}
}

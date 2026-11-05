import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import {db} from './db.js';
import {runDailyCampaign} from './campaign.js';
import {analyzeTrend} from './opportunities.js';

const app=express();
app.use(helmet({contentSecurityPolicy:false}));
app.use(compression());
app.use(express.json());
app.get('/health',(_req,res)=>res.json({ok:true,service:'vendasautomaticas',time:new Date().toISOString()}));

function auth(req,res,next){
  const user=process.env.DASHBOARD_USER,pass=process.env.DASHBOARD_PASSWORD;
  if(!user||!pass||pass==='change-this-password')return res.status(503).send('Configure DASHBOARD_USER e DASHBOARD_PASSWORD.');
  const [scheme,encoded]=String(req.headers.authorization||'').split(' ');
  if(scheme!=='Basic'||!encoded)return res.set('WWW-Authenticate','Basic realm="VendasAutomaticas"').status(401).send('Autenticação necessária.');
  const [u,...parts]=Buffer.from(encoded,'base64').toString().split(':');
  if(u!==user||parts.join(':')!==pass)return res.status(401).send('Credenciais inválidas.');
  next();
}
app.use('/api',auth);

app.get('/api/summary',async(_req,res,next)=>{try{
  const [a]=await db.all('SELECT COUNT(*) AS total FROM trends');
  const [b]=await db.all('SELECT COUNT(*) AS total FROM products');
  const [c]=await db.all('SELECT COUNT(*) AS total FROM posts');
  const [r]=await db.all('SELECT * FROM runs ORDER BY id DESC LIMIT 1');
  res.json({trends:Number(a.total),products:Number(b.total),posts:Number(c.total),lastRun:r||null,mode:process.env.AUTO_PUBLISH==='true'?'auto':'draft'});
}catch(e){next(e)}});

app.get('/api/opportunities',async(_req,res,next)=>{try{
  const rows=await db.all('SELECT term,source,score,captured_at FROM trends ORDER BY id DESC LIMIT 300');
  const cutoff=Date.now()-24*60*60*1000;
  const seen=new Set();
  const latest=rows.filter(row=>{
    if(new Date(row.captured_at).getTime()<cutoff)return false;
    const key=String(row.term).toLocaleLowerCase('pt-BR');
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
  const results=latest.map(row=>({...row,...analyzeTrend(row.term)})).sort((a,b)=>b.score-a.score);
  res.json({periodHours:24,total:results.length,qualified:results.filter(x=>x.score>=50).length,opportunities:results});
}catch(e){next(e)}});

for(const table of ['trends','products','posts']){
  app.get('/api/'+table,async(_req,res,next)=>{try{res.json(await db.all('SELECT * FROM '+table+' ORDER BY id DESC LIMIT 100'))}catch(e){next(e)}});
}
app.post('/api/run',async(_req,res,next)=>{try{res.status(202).json(await runDailyCampaign())}catch(e){next(e)}});

app.get('/',auth,(_req,res)=>res.type('html').send(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vendas Automáticas</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#0b1220;color:#e8edf5;font:14px system-ui,-apple-system,sans-serif}.wrap{max-width:1180px;margin:auto;padding:30px 22px}.top{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}.muted{color:#9aa9bf}.eyebrow{letter-spacing:.12em;font-size:11px;color:#91a8c5}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:14px;margin:25px 0}.card{background:#142035;border:1px solid #293b55;border-radius:14px;padding:19px}.num{font-size:30px;font-weight:750;margin-top:6px}.btn{background:#39c28a;color:#062719;border:0;border-radius:9px;padding:12px 16px;font-weight:750;cursor:pointer}.btn:disabled{opacity:.6;cursor:wait}.section{margin-top:17px}.section h2{margin:0 0 8px;font-size:18px}.hint{font-size:12px;color:#9aa9bf;line-height:1.5}.table-wrap{overflow-x:auto;margin-top:14px}table{width:100%;border-collapse:collapse;min-width:760px}th,td{text-align:left;padding:12px 10px;border-bottom:1px solid #293b55;vertical-align:top}th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9aa9bf}td{font-size:13px}.score{font-weight:800}.high{color:#5fe0a4}.medium{color:#ffd27a}.low{color:#9aa9bf}.pill{display:inline-block;padding:4px 8px;border-radius:30px;background:#20334d;font-size:11px}.money{font-weight:750;color:#74e0ad}.reason{max-width:260px;color:#aebbd0;font-size:12px}.runbox{white-space:pre-wrap;overflow:auto;color:#aebbd0;font-size:12px}.empty{padding:18px 0;color:#9aa9bf}.footer{margin:16px 0;color:#8fa0b8;font-size:12px;line-height:1.6}@media(max-width:600px){.wrap{padding:20px 13px}.num{font-size:25px}}
</style></head><body><main class="wrap">
<div class="top"><div><div class="eyebrow">CENTRAL DE AFILIADOS</div><h1 style="margin:7px 0">Vendas Automáticas</h1><p class="muted">Descubra tendências, classifique oportunidades e estime comissões.</p></div><button class="btn" id="run">Executar pesquisa agora</button></div>
<div class="grid">
<div class="card"><div class="muted">Tendências nas últimas 24h</div><div class="num" id="t">—</div></div>
<div class="card"><div class="muted">Oportunidades comerciais</div><div class="num" id="o">—</div></div>
<div class="card"><div class="muted">Produtos afiliados confirmados</div><div class="num" id="p">—</div></div>
<div class="card"><div class="muted">Publicações</div><div class="num" id="n">—</div></div>
</div>
<div class="card section"><h2>Ranking de oportunidades</h2><p class="hint">Classificação automática por aderência a produtos e intenção comercial. A comissão é uma simulação por venda, não uma oferta confirmada nem garantia de ganho.</p>
<div class="table-wrap"><table><thead><tr><th>Tendência</th><th>Categoria sugerida</th><th>Chance comercial</th><th>Comissão estimada por venda</th><th>Por que entrou?</th></tr></thead><tbody id="opps"><tr><td colspan="5">Carregando oportunidades...</td></tr></tbody></table></div>
</div>
<div class="card section"><h2>Última execução</h2><pre id="last" class="runbox">Carregando...</pre></div>
<div class="card section"><h2>Publicações recentes</h2><div id="recent" class="empty">Carregando...</div></div>
<p class="footer">Estimativas ilustrativas calculadas com faixas hipotéticas de preço e comissão. Valores reais dependem do produto, da loja, do programa de afiliados, da aprovação do link e da conversão. Nenhuma venda ou comissão é garantida. Publicação automática permanece desativada até conectar e validar as contas.</p>
</main>
<script>
const api=async(p,o)=>{const r=await fetch('/api/'+p,o);if(!r.ok)throw Error(await r.text());return r.json()};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
async function load(){
 const s=await api('summary');const data=await api('opportunities');
 document.getElementById('t').textContent=data.total;
 document.getElementById('o').textContent=data.qualified;
 document.getElementById('p').textContent=s.products;
 document.getElementById('n').textContent=s.posts;
 document.getElementById('last').textContent=s.lastRun?JSON.stringify(s.lastRun,null,2):'Nenhuma execução registrada.';
 const tbody=document.getElementById('opps');
 tbody.innerHTML=data.opportunities.length?data.opportunities.map(x=>{
   const cls=x.score>=80?'high':x.score>=50?'medium':'low';
   const estimate=x.score>=50?'<span class="money">'+esc(x.estimate)+'</span>':'<span class="muted">Não estimável</span>';
   return '<tr><td><b>'+esc(x.term)+'</b><div class="hint">'+esc(new Date(x.captured_at).toLocaleString('pt-BR'))+'</div></td><td>'+esc(x.category)+'</td><td><span class="score '+cls+'">'+x.score+'/100</span><div class="hint">'+esc(x.rating)+'</div></td><td>'+estimate+'</td><td class="reason">'+esc(x.reason)+'</td></tr>';
 }).join(''):'<tr><td colspan="5">Nenhuma tendência encontrada nas últimas 24 horas.</td></tr>';
 const posts=await api('posts');
 document.getElementById('recent').innerHTML=posts.length?posts.slice(0,8).map(x=>'<div style="padding:12px 0;border-bottom:1px solid #293b55"><b>'+esc(x.status)+'</b> · '+esc(x.platform)+'<p class="hint">'+esc(x.caption)+'</p></div>').join(''):'Nenhuma publicação criada.';
}
document.getElementById('run').onclick=async()=>{
 const b=document.getElementById('run');b.disabled=true;b.textContent='Pesquisando tendências...';
 try{await api('run',{method:'POST'});await load()}catch(e){alert('Falha na pesquisa: '+e.message)}finally{b.disabled=false;b.textContent='Executar pesquisa agora'}
};
load().catch(e=>document.getElementById('last').textContent=e.message);
</script></body></html>`));

app.use((e,_req,res,_next)=>{console.error(e);res.status(500).json({error:process.env.NODE_ENV==='production'?'Erro interno. Consulte os logs.':e.message})});
app.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Vendas Automáticas em execução.'));

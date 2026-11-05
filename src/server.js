import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import {db} from './db.js';
import {runDailyCampaign} from './campaign.js';

const app=express();app.use(helmet({contentSecurityPolicy:false}));app.use(compression());app.use(express.json());
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
  const [a]=await db.all('SELECT COUNT(*) AS total FROM trends'),[b]=await db.all('SELECT COUNT(*) AS total FROM products'),[c]=await db.all('SELECT COUNT(*) AS total FROM posts'),[r]=await db.all('SELECT * FROM runs ORDER BY id DESC LIMIT 1');
  res.json({trends:Number(a.total),products:Number(b.total),posts:Number(c.total),lastRun:r||null,mode:process.env.AUTO_PUBLISH==='true'?'auto':'draft'});
}catch(e){next(e)}});
for(const table of ['trends','products','posts'])app.get('/api/'+table,async(_req,res,next)=>{try{res.json(await db.all('SELECT * FROM '+table+' ORDER BY id DESC LIMIT 100'))}catch(e){next(e)}});
app.post('/api/run',async(_req,res,next)=>{try{res.status(202).json(await runDailyCampaign())}catch(e){next(e)}});
app.get('/',auth,(_req,res)=>res.type('html').send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vendas Automáticas</title><style>
body{margin:0;background:#0b1220;color:#e8edf5;font:15px system-ui}.wrap{max-width:1000px;margin:auto;padding:32px 20px}.top{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}.muted{color:#9aa9bf}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:28px 0}.card{background:#142035;border:1px solid #293b55;border-radius:14px;padding:20px}.num{font-size:32px;font-weight:750}.btn{background:#39c28a;border:0;border-radius:9px;padding:12px 16px;font-weight:bold;cursor:pointer}.row{white-space:pre-wrap;border-bottom:1px solid #293b55;padding:12px 0}
</style></head><body><main class="wrap"><div class="top"><div><div class="muted">CENTRAL DE AFILIADOS</div><h1>Vendas Automáticas</h1><p class="muted">Tendências, ofertas e publicações em um só lugar.</p></div><button class="btn" id="run">Executar pesquisa agora</button></div>
<div class="grid"><div class="card"><div class="muted">Tendências</div><div class="num" id="t">—</div></div><div class="card"><div class="muted">Produtos encontrados</div><div class="num" id="p">—</div></div><div class="card"><div class="muted">Publicações</div><div class="num" id="n">—</div></div><div class="card"><div class="muted">Modo</div><div class="num" id="m">RASCUNHO</div></div></div>
<div class="card"><h2>Última execução</h2><pre id="last" class="muted">Carregando...</pre></div><div class="card" style="margin-top:16px"><h2>Publicações recentes</h2><div id="recent"></div></div><p class="muted">Publicação automática desativada até conectar e validar suas contas.</p></main>
<script>
const api=async(p,o)=>{const r=await fetch('/api/'+p,o);if(!r.ok)throw Error(await r.text());return r.json()};
async function load(){const s=await api('summary');t.textContent=s.trends;p.textContent=s.products;n.textContent=s.posts;m.textContent=s.mode==='auto'?'AUTO':'RASCUNHO';last.textContent=s.lastRun?JSON.stringify(s.lastRun,null,2):'Nenhuma execução';const rows=await api('posts');recent.innerHTML=rows.slice(0,10).map(x=>'<div class="row"><b>'+x.status+'</b> · '+x.platform+'<br>'+x.caption.replaceAll('<','&lt;')+'</div>').join('')||'Nenhuma publicação.'}
document.getElementById('run').onclick=async()=>{try{await api('run',{method:'POST'});await load()}catch(e){alert(e.message)}};
load().catch(e=>last.textContent=e.message);
</script></body></html>`));
app.use((e,_req,res,_next)=>{console.error(e);res.status(500).json({error:process.env.NODE_ENV==='production'?'Erro interno. Consulte os logs.':e.message})});
app.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Vendas Automáticas em execução.'));

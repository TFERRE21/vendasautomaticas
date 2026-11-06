import { XMLParser } from 'fast-xml-parser';
const NAMES={US:'United States',GB:'United Kingdom',CA:'Canada',AU:'Australia',BR:'Brazil',DE:'Germany',IN:'India',FR:'France',JP:'Japan',ES:'Spain',IT:'Italy',MX:'Mexico',NL:'Netherlands',SG:'Singapore'};
const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_',parseTagValue:false});
const lowerBound=v=>{const n=String(v||'').replace(/[^0-9]/g,'');return n?Number(n):null;};
async function collectCountry(geo){
 const url='https://trends.google.com/trending/rss?geo='+encodeURIComponent(geo);
 const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'user-agent':'Mozilla/5.0 VendasAutomaticas/2.0'}});
 if(!response.ok)throw new Error(geo+' HTTP '+response.status);
 const parsed=parser.parse(await response.text());const raw=parsed?.rss?.channel?.item||[];const items=Array.isArray(raw)?raw:[raw];const capturedAt=new Date().toISOString();
 return items.map(x=>{const bucket=String(x['ht:approx_traffic']||x.approx_traffic||'').trim()||null;return {term:String(x.title||'').trim(),source:'google-trends-rss',geo,country:NAMES[geo]||geo,traffic_bucket:bucket,traffic_lower_bound:lowerBound(bucket),score:0,captured_at:capturedAt};}).filter(x=>x.term);
}
export async function collectTrends(){
 const countries=(process.env.TREND_COUNTRIES||'US,GB,CA,AU,BR,DE,IN,FR').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
 const settled=await Promise.allSettled([...new Set(countries)].map(collectCountry));
 const rows=settled.flatMap(x=>x.status==='fulfilled'?x.value:[]);const errors=settled.filter(x=>x.status==='rejected').map(x=>x.reason?.message||'Unknown error');
 if(!rows.length)throw new Error('No country returned trends. '+errors.join('; '));
 if(errors.length)console.warn('[trends] Some countries failed:',errors.join('; '));
 return rows;
}

const version=process.env.META_GRAPH_VERSION||'v23.0';
export async function publishFacebookPage({message,link}){
  if(process.env.AUTO_PUBLISH!=='true')return {status:'draft',reason:'AUTO_PUBLISH não está habilitado'};
  const id=process.env.META_PAGE_ID,token=process.env.META_PAGE_ACCESS_TOKEN;
  if(!id||!token)throw new Error('Configure credenciais da Página Meta no ambiente.');
  const body=new URLSearchParams({message,access_token:token});if(link)body.set('link',link);
  const response=await fetch('https://graph.facebook.com/'+version+'/'+id+'/feed',{method:'POST',body,signal:AbortSignal.timeout(20000)});
  const data=await response.json();
  if(!response.ok||data.error)throw new Error(data.error?.message||'Falha Meta API');
  return {status:'published',remote_id:data.id};
}

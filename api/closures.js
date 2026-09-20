import {getClosures} from '../server/closures.js';
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');res.statusCode=405;return res.end(JSON.stringify({error:'Use GET.'}));}
  const result=await getClosures();
  // Short shared cache protects UF. No query parameter can select an upstream URL.
  res.setHeader('Cache-Control',result.status==='available'?'public, max-age=0, s-maxage=5':'no-store');
  res.statusCode=result.status==='available'?200:503;res.end(JSON.stringify(result));
}

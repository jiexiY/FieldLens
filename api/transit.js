import {getRtsAlerts} from '../server/transit.js';

export function createTransitHandler({getAlerts=getRtsAlerts}={}){
  return async function handler(req,res){
    res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
    if(req.method!=='GET'){res.setHeader('Allow','GET');res.statusCode=405;return res.end(JSON.stringify({error:'Use GET.'}));}
    // Caller parameters never select a URL, route, or upstream query. Filtering stays local.
    const result=await getAlerts();
    res.setHeader('Cache-Control',result.status==='available'?'public, max-age=0, s-maxage=5':'no-store');
    res.statusCode=result.status==='available'?200:503;res.end(JSON.stringify(result));
  };
}
export default createTransitHandler();

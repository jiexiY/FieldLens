import {createHash} from 'node:crypto';

export const CLOSURE_SOURCE='https://campusclosures.ufl.edu/closure-home';
export const NOTICE_SOURCE='https://campusclosures.ufl.edu/api/public/impact';
export const GEOMETRY_SOURCE='https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Polygon_view/FeatureServer/0';
const UA='RealLens public closure reader (https://reallens-app.vercel.app)';
const TTL=10000, BACKOFF=30000, MAX_BYTES=8*1024*1024;

export function plain(value){
  return String(value??'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex,dec)=>{const n=parseInt(hex||dec,hex?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):' ';}).replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,4000);
}
function date(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const d=new Date(value+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===value?value:null;}
function validRings(rings){return Array.isArray(rings)&&rings.length>0&&rings.length<500&&rings.every(r=>Array.isArray(r)&&r.length>=4&&r.length<=20000&&r.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90)&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1]);}
export function sanitizeNotices(data,geometry){
  if(!Array.isArray(data)||data.length>5000||!Array.isArray(geometry?.features)||geometry.exceededTransferLimit)throw Error('Incomplete closure data');
  const ids=new Set(),polygons=new Map();
  for(const f of geometry.features){const id=String(f.attributes?.close_id);if(validRings(f.geometry?.rings)){if(!polygons.has(id))polygons.set(id,[]);polygons.get(id).push(f.geometry.rings.map(r=>r.map(p=>p.slice(0,2))));}}
  return data.filter(n=>['PUBLISHED','PROMOTED'].includes(n?.STATUS)).map(n=>{
    const id=String(n.ID);if(!/^\d{1,12}$/.test(id)||ids.has(id))throw Error('Invalid published notice ID');ids.add(id);
    let start=date(n.START_DATE),end=date(n.END_DATE);let dateWarning=!!((n.START_DATE&&!start)||(n.END_DATE&&!end));
    if(start&&end&&start>end){start=null;end=null;dateWarning=true;}
    return {id,title:plain(n.IMPACT_NAME)||'UF campus closure',start,end,dateWarning,updated:date(n.DATEMOD),description:plain(n.INFO),location:plain(n.LOCATION),alternative:plain(n.ALT_TRAVEL),accessibleAlternative:plain(n.ADA_ROUTE),urgent:String(n.URGENT_FLAG)==='1',accessibilityAffected:String(n.ADA_FLAG)==='1',types:[['TYPE_ROAD','Road'],['TYPE_SIDEWALK','Sidewalk'],['TYPE_BIKEWAY','Bikeway'],['TYPE_PARKING','Parking'],['TYPE_ENTRANCE','Entrance'],['TYPE_OTHER','Other']].filter(([key])=>String(n[key])==='1').map(([,label])=>label),source:`https://campusclosures.ufl.edu/post/${id}`,polygons:polygons.get(id)||[]};
  }).sort((a,b)=>Number(b.urgent)-Number(a.urgent)||a.id.localeCompare(b.id));
}
async function readJson(url,fetcher,signal){
  const r=await fetcher(url,{headers:{'User-Agent':UA,Accept:'application/json'},signal,redirect:'error'});
  if(!r.ok||Number(r.headers.get('content-length'))>MAX_BYTES)throw Error('Source unavailable');
  let size=0;const chunks=[];
  for await(const part of r.body){size+=part.byteLength;if(size>MAX_BYTES)throw Error('Source too large');chunks.push(Buffer.from(part));}
  const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(data.error)throw Error('Source error');return data;
}
async function geometry(fetcher,signal){
  const features=[],seen=new Set();
  for(let page=0;page<20;page++){
    const q=new URLSearchParams({where:"close_stat IN ('PUBLISHED','PROMOTED')",outFields:'objectid,close_id',outSR:'4326',orderByFields:'objectid ASC',resultOffset:String(page*200),resultRecordCount:'200',f:'json'});
    const data=await readJson(`${GEOMETRY_SOURCE}/query?${q}`,fetcher,signal);
    if(!Array.isArray(data.features))throw Error('No geometry');
    for(const f of data.features){const id=f.attributes?.objectid;if(id===undefined||seen.has(id))throw Error('Unstable geometry pages');seen.add(id);features.push(f);}
    if(!data.exceededTransferLimit)return {features};
    if(!data.features.length)throw Error('Incomplete geometry');
  }
  throw Error('Geometry pagination limit');
}
export function createClosureCrawler({fetcher=globalThis.fetch,now=Date.now,timeout=22000}={}){
  let previous=null,inflight=null,nextCheck=0;
  return async function crawl(){
    if(inflight)return inflight;if(previous&&now()<nextCheck)return previous;
    inflight=(async()=>{
      const checkedAt=new Date(now()).toISOString(),signal=AbortSignal.timeout(timeout);
      try{
        const [notices,shape]=await Promise.all([readJson(NOTICE_SOURCE,fetcher,signal),geometry(fetcher,signal).then(value=>({value}),()=>({value:{features:[]},failed:true}))]);
        const clean=sanitizeNotices(notices,shape.value),geometryStatus=shape.failed?'unavailable':'available';
        const value={status:'available',fetchedAt:checkedAt,source:CLOSURE_SOURCE,noticeSource:NOTICE_SOURCE,geometrySource:GEOMETRY_SOURCE,geometryStatus,notices:clean,refreshAfterSeconds:15,revision:createHash('sha256').update(JSON.stringify({geometryStatus,notices:clean})).digest('hex').slice(0,20)};
        previous=value;nextCheck=now()+TTL;return value;
      }catch{
        const value={...(previous||{}),status:previous?.fetchedAt?'stale':'unavailable',source:CLOSURE_SOURCE,attemptedAt:checkedAt,notices:previous?.notices||[],message:'UF could not be checked. Earlier notices are not current; absence does not mean clear.',refreshAfterSeconds:30};
        previous=value;nextCheck=now()+BACKOFF;return value;
      }
    })();
    try{return await inflight;}finally{inflight=null;}
  };
}
export const getClosures=createClosureCrawler();

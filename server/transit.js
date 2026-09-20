import {createHash} from 'node:crypto';

export const RTS_SOURCE='https://go-rts.com/category/rider-alerts/';
export const RTS_CATEGORY=41;
export const RTS_API='https://go-rts.com/wp-json/wp/v2/posts';
const MAX_BYTES=2*1024*1024,MAX_PAGES=5,TTL=10000,BACKOFF=30000;
const UA='FieldLens public RTS rider-alert reader (https://fieldlens-pi.vercel.app)';

export function rtsText(value){
  const entities={amp:'&',nbsp:' ',quot:'"',apos:"'",lt:'<',gt:'>',ndash:'–',mdash:'—',hellip:'…',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”'};
  return String(value??'').replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ').replace(/<\/?sup\b[^>]*>/gi,'').replace(/<[^>]*>/g,' ').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(entity,key)=>{
    if(key[0]!=='#')return entities[key.toLowerCase()]??entity;
    const code=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));
    return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):' ';
  }).replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim();
}
function utcDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/.test(value))return null;
  const date=new Date(value+'Z');return Number.isFinite(+date)&&date.toISOString().slice(0,19)===value?date.toISOString():null;
}
export function routeMentions(text){
  const routes=new Set();let uncertain=false;
  // These are explicit text mentions, not a route catalog or proof a route is affected.
  const pattern=/\broutes?\s*(?:numbers?\s*|no\.?\s*)?((?:#?\d{1,3}[a-z]?\b)(?:\s*(?:,\s*(?:and\s*)?|and\s+|&\s*|\/\s*|to\s+|[-–]\s*)#?\d{1,3}[a-z]?\b)*)/gi;
  for(const match of text.matchAll(pattern)){
    const group=match[1];
    if(/\d\s*(?:to|[-–])\s*\d/i.test(group))uncertain=true;
    for(const route of group.match(/\d{1,3}[a-z]?\b/gi)||[])routes.add(route.replace(/^0+(?=\d)/,'').toUpperCase());
  }
  return {routes:[...routes].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),routeUncertain:uncertain};
}
export function sanitizeRtsPosts(posts){
  if(!Array.isArray(posts)||posts.length>500)throw Error('Invalid RTS posts');
  const seen=new Set();
  return posts.map(post=>{
    if(!post||!Number.isSafeInteger(post.id)||post.id<=0||seen.has(post.id)||post.status!=='publish'||!Array.isArray(post.categories)||!post.categories.includes(RTS_CATEGORY)||post.content?.protected!==false)throw Error('Unexpected RTS post');
    seen.add(post.id);
    const source=new URL(post.link);
    if(source.origin!=='https://go-rts.com'||source.username||source.password||source.search||source.hash||!/^\/[a-z0-9-]+\/$/.test(source.pathname))throw Error('Invalid RTS source link');
    if(typeof post.title?.rendered!=='string'||typeof post.content?.rendered!=='string'||post.content.rendered.length>150000)throw Error('Invalid RTS text');
    const title=rtsText(post.title.rendered).slice(0,260)||'RTS rider information';
    const text=rtsText(post.content.rendered),body=text.slice(0,6500),truncated=text.length>6500;
    const {routes,routeUncertain}=routeMentions(title+' '+text);
    const media=/<(?:img|iframe|video|object)\b/i.test(post.content.rendered);
    const postedAt=utcDate(post.date_gmt),modifiedAt=utcDate(post.modified_gmt);
    const serviceRelated=/\b(detours?|delays?|cancelled|canceled|suspended|suspension|closures?)\b|\b(?:no|reduced|holiday|limited|modified) service\b|\b(?:service|route|schedule|bus stop) changes?\b/i.test(title);
    return {id:String(post.id),title,body,postedAt,modifiedAt,source:source.href,routes,routeUncertain:routeUncertain||truncated||media,serviceRelated,media,truncated};
  }).sort((a,b)=>Number(b.id)-Number(a.id));
}
async function readPage(page,fetcher,signal){
  const query=new URLSearchParams({categories:String(RTS_CATEGORY),status:'publish',per_page:'100',page:String(page),orderby:'id',order:'desc',_fields:'id,status,categories,date_gmt,modified_gmt,link,title,content'});
  const response=await fetcher(`${RTS_API}?${query}`,{headers:{Accept:'application/json','User-Agent':UA},redirect:'error',signal,cache:'no-store'});
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json')||Number(response.headers.get('content-length'))>MAX_BYTES)throw Error('RTS unavailable');
  const pagesText=response.headers.get('x-wp-totalpages'),totalText=response.headers.get('x-wp-total');
  if(!/^\d+$/.test(pagesText??'')||!/^\d+$/.test(totalText??''))throw Error('Missing RTS pagination');
  const pages=Number(pagesText),total=Number(totalText);
  if(pages>MAX_PAGES||total>500||pages!==Math.ceil(total/100))throw Error('Incomplete RTS archive');
  const chunks=[];let size=0;
  for await(const chunk of response.body){size+=chunk.byteLength;if(size>MAX_BYTES)throw Error('RTS response too large');chunks.push(Buffer.from(chunk));}
  const posts=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!Array.isArray(posts)||posts.length>100)throw Error('Invalid RTS page');
  return {posts,pages,total};
}
export function createRtsCrawler({fetcher=globalThis.fetch,now=Date.now,timeout=22000}={}){
  let previous=null,inflight=null,nextCheck=0;
  return async function crawl(){
    if(inflight)return inflight;if(previous&&now()<nextCheck)return previous;
    inflight=(async()=>{
      const attemptedAt=new Date(now()).toISOString();
      try{
        const signal=AbortSignal.timeout(timeout),first=await readPage(1,fetcher,signal),posts=[...first.posts];
        for(let page=2;page<=first.pages;page++){
          const next=await readPage(page,fetcher,signal);
          if(next.pages!==first.pages||next.total!==first.total)throw Error('RTS archive changed during paging');
          posts.push(...next.posts);
        }
        if(posts.length!==first.total)throw Error('Incomplete RTS posts');
        const notices=sanitizeRtsPosts(posts);
        previous={status:'available',source:RTS_SOURCE,fetchedAt:new Date(now()).toISOString(),notices,refreshAfterSeconds:15,revision:createHash('sha256').update(JSON.stringify(notices)).digest('hex').slice(0,20)};
        nextCheck=now()+TTL;return previous;
      }catch{
        previous={...(previous||{}),status:previous?.fetchedAt?'stale':'unavailable',source:RTS_SOURCE,notices:previous?.notices||[],attemptedAt,refreshAfterSeconds:30,message:'RTS could not be checked. Earlier posts are stale; missing posts do not mean normal service.'};
        nextCheck=now()+BACKOFF;return previous;
      }
    })();
    try{return await inflight;}finally{inflight=null;}
  };
}
export const getRtsAlerts=createRtsCrawler();

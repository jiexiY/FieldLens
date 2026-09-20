export const CLOSURE_POLL_MS=15000;
export const CLOSURE_STALE_MS=60000;
export function mergeClosureSnapshot(previous,incoming,now=Date.now()){
  const stamp=Date.parse(incoming?.fetchedAt);
  if(incoming?.status==='available'&&Array.isArray(incoming.notices)&&Number.isFinite(stamp)&&now-stamp<=CLOSURE_STALE_MS&&stamp-now<60000)return incoming;
  // A failed refresh must never replace a previously visible warning with empty data.
  const last=previous?.fetchedAt?previous:incoming?.fetchedAt?incoming:null;
  return {...(last||{}),status:last?'stale':'unavailable',notices:last?.notices||[],attemptedAt:incoming?.attemptedAt||new Date(now).toISOString()};
}
export function compareClosureNotices(before,after){
  const old=new Map(before.map(n=>[n.id,n])),next=new Map(after.map(n=>[n.id,n]));
  return {added:after.filter(n=>!old.has(n.id)),updated:after.filter(n=>old.has(n.id)&&JSON.stringify(old.get(n.id))!==JSON.stringify(n)),removed:before.filter(n=>!next.has(n.id))};
}
export function closureChangeText(change){
  const parts=[];
  for(const [key,label] of [['added','new'],['updated','updated'],['removed','no longer flagged for this journey']])if(change[key].length)parts.push(`${change[key].length} ${label}: ${change[key].slice(0,3).map(n=>n.title).join('; ')}${change[key].length>3?'; and more':''}`);
  return parts.length?`UF notice changes. ${parts.join('. ')}.${change.removed.length?' A notice no longer appearing is not confirmation that a path has reopened.':''}`:'';
}
export function createClosureMonitor({fetcher=globalThis.fetch,onData=()=>{},onState=()=>{},now=Date.now,schedule=setTimeout,unschedule=clearTimeout,interval=CLOSURE_POLL_MS}={}){
  let active=false,visible=true,online=true,enabled=true,timer=null,controller=null,epoch=0,lastAttempt=0,retryDelay=interval;
  const clear=()=>{unschedule(timer);timer=null;};
  function plan(){clear();if(active&&visible&&online&&enabled)timer=schedule(()=>void refresh(),Math.max(1000,retryDelay-(now()-lastAttempt)));}
  function cancel(){epoch++;controller?.abort();controller=null;clear();}
  async function refresh(manual=false){
    if(!active||!visible||!online||controller)return;
    if(!enabled&&!manual)return;
    const token=epoch;controller=new AbortController();const request=controller;lastAttempt=now();onState('checking');
    try{
      const r=await fetcher('/api/closures',{signal:AbortSignal.any([request.signal,AbortSignal.timeout(26000)]),headers:{Accept:'application/json'}});
      const data=await r.json();if(!r.ok&&data.status!=='stale'&&data.status!=='unavailable')throw Error('Invalid response');
      if(token===epoch){retryDelay=data.status==='available'?interval:Math.min(120000,Math.max(30000,retryDelay*2));onData(data,{manual});}
    }catch{if(token===epoch){retryDelay=Math.min(120000,Math.max(30000,retryDelay*2));onData({status:'unavailable',attemptedAt:new Date(now()).toISOString()},{manual});}}
    finally{if(token===epoch){controller=null;onState(enabled?(retryDelay>interval?'retrying':'active'):'paused');plan();}}
  }
  return {
    start(){cancel();active=true;lastAttempt=now();onState(!visible?'hidden':!online?'offline':enabled?'active':'paused');plan();},
    stop(){cancel();active=false;},
    refresh:()=>refresh(true),
    setEnabled(value){enabled=value;cancel();onState(enabled?'active':'paused');if(enabled){lastAttempt=0;void refresh();}},
    setVisible(value){visible=value;cancel();onState(value?(!online?'offline':enabled?'active':'paused'):'hidden');if(value&&now()-lastAttempt>=interval)void refresh();else plan();},
    setOnline(value){online=value;cancel();onState(value?(enabled?'active':'paused'):'offline');if(value)void refresh();}
  };
}

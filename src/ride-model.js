export const MAX_FIX_AGE=15000;
export const MAX_ACCURACY=50;
export function distanceMetres(a,b){
  const rad=Math.PI/180,dl=(b.lat-a.lat)*rad,dn=(b.lon-a.lon)*rad;
  const v=Math.sin(dl/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dn/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(v),Math.sqrt(Math.max(0,1-v)));
}
export function feedUsable(feed,now=Date.now()){
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now)).replaceAll('-','');
  return /^\d{8}$/.test(feed?.startDate)&&/^\d{8}$/.test(feed?.endDate)&&date>=feed.startDate&&date<=feed.endDate;
}
export function goodFix(position,now=Date.now()){
  const c=position?.coords;
  return !!c&&Number.isFinite(position.timestamp)&&now-position.timestamp>=-1000&&now-position.timestamp<=MAX_FIX_AGE&&
    Number.isFinite(c.latitude)&&Math.abs(c.latitude)<=90&&Number.isFinite(c.longitude)&&Math.abs(c.longitude)<=180&&
    Number.isFinite(c.accuracy)&&c.accuracy>=0&&c.accuracy<=MAX_ACCURACY;
}
// Proximity to one user-confirmed ordered pattern, NOT vehicle tracking. Never
// infer a new direction or skip a missed stop from the nearest arbitrary point.
export function createStopJourney(stops){
  if(!Array.isArray(stops)||stops.length<2||stops.some(s=>!s?.id||!Number.isFinite(s.lat)||!Number.isFinite(s.lon)))throw Error('Choose boarding and destination stops in order.');
  let next=1,approached=false,candidate=null,lastTimestamp=0,lastNear=null,complete=false;
  return {get complete(){return complete;},get nextIndex(){return next;},update(position,now=Date.now()){
    if(complete)return {state:'complete'};
    if(!goodFix(position,now)){candidate=null;return {state:'uncertain',message:'Location is stale or imprecise. Stop announcements are waiting for a better signal.'};}
    if(position.timestamp<=lastTimestamp)return {state:'duplicate'};
    lastTimestamp=position.timestamp;
    const point={lat:position.coords.latitude,lon:position.coords.longitude};
    const stop=stops[next],distance=distanceMetres(point,stop),accuracy=position.coords.accuracy;
    if(Math.min(...stops.map(s=>distanceMetres(point,s)))>800){candidate=null;return {state:'off-route',message:'Your phone is far from the selected stop pattern. Check your bus route and direction with the operator. No stop progression was guessed.'};}
    if(lastNear&&distanceMetres(point,lastNear)<120)return {state:'tracking',distance,stop};
    // Require the uncertainty circle to fit inside the near radius, and two
    // distinct fresh fixes. A single GPS jump must not announce arrival.
    if(distance+accuracy<=100){
      if(!candidate||position.timestamp-candidate>MAX_FIX_AGE){candidate=position.timestamp;return {state:'tracking',distance,stop};}
      if(position.timestamp-candidate<1000)return {state:'tracking',distance,stop};
      candidate=null;lastNear=stop;next++;approached=false;complete=next>=stops.length;
      const message=`Your phone is near ${stop.name}, stop ${stop.code||stop.id}. ${complete?'This is your selected destination. Confirm the stop with the operator before leaving the bus.':`The next scheduled stop is ${stops[next].name}. Confirm actual stops with the operator.`}`;
      return {state:complete?'destination':'near',message,stop,distance};
    }
    candidate=null;
    if(distance+accuracy<=250&&!approached){approached=true;return {state:'approaching',stop,distance,message:`Approaching the area of ${stop.name}, stop ${stop.code||stop.id}. ${next===stops.length-1?'This is your selected destination. ':''}Phone location estimate, not a confirmed bus stop.`};}
    return {state:'tracking',distance,stop};
  }};
}

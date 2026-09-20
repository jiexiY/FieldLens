import {prefs,createPageSpeech} from './app-shell.js';
import {voiceEnabled,stopAllSpeech} from './narration.js';
import {createStopJourney,feedUsable,MAX_FIX_AGE,goodFix} from './ride-model.js';
const $=id=>document.getElementById(id);
let feed,stops,pattern,watch=null,timer=null,journey=null,active=false,version=0,lastFix=0,lastState='',lastMessage='Location is off.',reminderAt=0;
const player=createPageSpeech();
function say(message,{location=false}={}){reminderAt=location?Date.now():0;lastMessage=message;$('ride-status').textContent=message;player.speak(message,prefs.rate,location?{expiresMs:15000}:{});}
function options(node,values){node.replaceChildren(...values.map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;}));}
const selectedStops=()=>pattern.stops.slice(Number($('ride-board').value),Number($('ride-destination').value)+1).map(id=>stops.get(id));
function showList(){const selected=selectedStops();$('ride-list').replaceChildren(...selected.map(stop=>{const li=document.createElement('li');li.textContent=`${stop.name} · stop ${stop.code||stop.id}. ${stop.description}`;return li;}));}
function destinations(){const boarding=Number($('ride-board').value);options($('ride-destination'),pattern.stops.flatMap((id,i)=>i>boarding?[[i,`${stops.get(id).name} · stop ${stops.get(id).code||id} · ${i+1}`]]:[]));$('ride-destination').value=String(pattern.stops.length-1);showList();}
function boarding(){pattern=feed.routes.find(r=>r.id===$('ride-route').value).patterns.find(p=>p.id===$('ride-pattern').value);options($('ride-board'),pattern.stops.slice(0,-1).map((id,i)=>[i,`${stops.get(id).name} · stop ${stops.get(id).code||id} · ${i+1}`]));destinations();}
function directions(){const route=feed.routes.find(r=>r.id===$('ride-route').value);options($('ride-pattern'),route.patterns.map(p=>[p.id,`${p.headsign||route.name} · ${p.stops.length} stops · starts ${stops.get(p.stops[0]).name} · pattern ${p.id}`]));boarding();}
function end(message,{speak=true}={}){
  version++;active=false;if(watch!==null)navigator.geolocation.clearWatch(watch);watch=null;clearInterval(timer);timer=null;journey=null;lastFix=0;
  $('ride-fields').disabled=false;$('ride-start').disabled=false;$('ride-stop').disabled=true;$('ride-progress').textContent='';stopAllSpeech();
  if(message){lastMessage=message;$('ride-status').textContent=message;if(speak&&voiceEnabled()&&!document.hidden)player.speak(message,prefs.rate);}
}
function statusOnce(state,message){if(lastState===state)return;lastState=state;say(message);}
function fix(position,token){
  if(!active||token!==version)return;
  if(!feedUsable(feed)){end('The bundled stop feed is outside its published dates. Journey ended. Check RTS for current stops.');return;}
  if(goodFix(position))lastFix=position.timestamp;
  const update=journey.update(position);
  if(update.state==='duplicate')return;
  if(['uncertain','off-route'].includes(update.state)){statusOnce(update.state,update.message);return;}
  if(update.stop)$('ride-progress').textContent=`Next selected stop: ${update.stop.name}. Approximate phone distance: ${Math.round(update.distance/10)*10} metres.`;
  if(update.state==='destination'){
    const message=update.message;end(message,{speak:false});$('ride-progress').textContent='Selected destination reminder completed. Location is off.';say(message,{location:true});return;
  }
  if(update.message){lastState=update.state;say(update.message,{location:true});}
  else if(['uncertain','off-route','waiting'].includes(lastState)){lastState='tracking';say('Location updates are available. Waiting for the next selected stop.');}
}
$('ride-form').addEventListener('submit',event=>{
  event.preventDefault();if(active)return;
  if(!voiceEnabled()){say('Voice is off. Turn voice on before starting stop announcements.');$('narration-toggle').focus();return;}
  if(!navigator.geolocation){say('Location is unavailable in this browser. Ask the operator for stop announcements.');return;}
  if(!feedUsable(feed)){say('This stop feed is outside its published dates. Use the official RTS service.');return;}
  const selected=selectedStops();if(selected.length<2){say('Choose a destination after the boarding stop.');return;}
  journey=createStopJourney(selected);active=true;lastFix=0;lastState='waiting';const token=++version,started=Date.now();
  $('ride-progress').textContent='';
  $('ride-fields').disabled=true;$('ride-start').disabled=true;$('ride-stop').disabled=false;
  say(`Starting stop announcements for route ${$('ride-route').selectedOptions[0].textContent}. Destination: ${selected.at(-1).name}. Next scheduled stop: ${selected[1].name}. Allow location access and keep this page visible.`);
  try{watch=navigator.geolocation.watchPosition(position=>fix(position,token),error=>{if(token!==version||!active)return;if(error.code===1)end('Location permission was denied. Journey ended. You can change permission in your browser or ask the operator for announcements.');else statusOnce('uncertain','Location could not be updated. Stop announcements are waiting; confirm stops with the operator.');},{enableHighAccuracy:true,maximumAge:0,timeout:15000});}
  catch{end('Location access failed. Journey ended. Use the official bus announcements.');return;}
  timer=setInterval(()=>{if(active&&Date.now()-(lastFix||started)>MAX_FIX_AGE)statusOnce('uncertain','Location has not updated recently. Stop announcements are waiting; confirm stops with the operator.');},3000);
});
$('ride-stop').addEventListener('click',()=>end('Journey ended. Location is off.'));
$('ride-repeat').addEventListener('click',()=>{if(reminderAt&&Date.now()-reminderAt>15000)say('The earlier location reminder is no longer current. '+(active?'Keep this page visible for new location updates.':'Location is off. Confirm your stop with the operator.'));else say(lastMessage,{location:!!reminderAt});});
$('ride-route').addEventListener('change',directions);$('ride-pattern').addEventListener('change',boarding);$('ride-board').addEventListener('change',destinations);$('ride-destination').addEventListener('change',showList);
window.addEventListener('reallens:voice-change',event=>{if(!event.detail.enabled&&active)end('Voice turned off. Journey ended and location is off. Start again when ready.',{speak:false});});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)end('Journey paused because this page was hidden. Location is off. Check your boarding stop and choose Start journey to restart.',{speak:false});});
window.addEventListener('pagehide',()=>end('Journey ended because you left the page. Location is off.',{speak:false}));
void(async()=>{try{
  const response=await fetch('/data/rts-stops.json',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();feed=await response.json();
  if(!Array.isArray(feed.routes)||!feed.routes.length||!Array.isArray(feed.stops)||!feedUsable(feed))throw Error();
  stops=new Map(feed.stops.map(s=>[s.id,s]));
  if(feed.routes.some(r=>!r.patterns?.length||r.patterns.some(p=>p.stops.length<2||p.stops.some(id=>!stops.has(id)))))throw Error();
  options($('ride-route'),[['','Choose your bus route'],...feed.routes.map(r=>[r.id,`${r.number} · ${r.name}`])]);
  // Require a deliberate route selection, not an inferred bus or direction.
  $('ride-route').removeEventListener('change',directions);$('ride-route').addEventListener('change',()=>{if($('ride-route').value)directions();else{options($('ride-pattern'),[]);options($('ride-board'),[]);options($('ride-destination'),[]);$('ride-list').replaceChildren();}});
  $('ride-source').textContent=`RTS published static GTFS. ${feed.version}. Retrieved ${feed.retrievedAt.slice(0,10)}. Published feed range ${feed.startDate}–${feed.endDate}; individual services vary. No live detours, vehicle positions or arrival estimates.`;
  $('ride-loading').hidden=true;$('ride-form').hidden=false;
}catch{$('ride-loading').textContent='Current stop data could not be loaded. Automatic announcements are unavailable. Use the official RTS service and ask the operator for help.';}})();

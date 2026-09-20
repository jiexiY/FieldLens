import {session,announce} from './app-shell.js';
import {consumeTrip,readDraft,PLACE_SPECS,tripError} from './trip-state.js';
import {parseDeparture,formatDate,timeLabel} from './journey-model.js';
import {prepareBrief} from './journey-engine.js';
import {mountBrief} from './brief-view.js';
const $=id=>document.getElementById(id);
const pending=consumeTrip(session),draft=pending||readDraft(session);
const name=id=>PLACE_SPECS.find(p=>p[0]===id)?.[2]||'Unknown place';
const departure=parseDeparture(draft.departure);
$('trip-summary').textContent=`${name(draft.origin)} to ${name(draft.destination)}. ${formatDate(departure)} at ${timeLabel(departure)} Eastern. ${draft.duration} minutes outdoors.`;
let controller=null,view=null,version=0;
async function prepare(){
 const error=tripError(draft);
 if(error){$('condition-error').hidden=false;$('condition-error').textContent=error+' Choose Change trip.';return;}
 const token=++version;controller?.abort();controller=new AbortController();view?.destroy();view=null;
 $('condition-error').hidden=true;$('check-conditions').disabled=true;$('check-conditions').textContent='Checking…';$('results').setAttribute('aria-busy','true');
 $('results').innerHTML='<p class="panel">Preparing your environmental briefing. Missing data will stay unknown.</p>';announce('Checking conditions.');
 try{
  const bundle=await prepareBrief(draft,{signal:controller.signal});if(token!==version)return;
  view=mountBrief(bundle);document.getElementById('brief-title').focus();announce('Briefing ready. Review the sources and unknowns before traveling.');
 }catch(error){if(token!==version||error.name==='AbortError')return;$('condition-error').hidden=false;$('condition-error').textContent=error.message||'Unable to prepare a briefing. Try again.';$('results').replaceChildren();}
 finally{if(token===version){$('results').setAttribute('aria-busy','false');$('check-conditions').disabled=false;$('check-conditions').textContent='Refresh conditions';}}
}
$('check-conditions').addEventListener('click',prepare);
window.addEventListener('pagehide',()=>{version++;controller?.abort();$('results').setAttribute('aria-busy','false');$('check-conditions').disabled=false;$('check-conditions').textContent='Check conditions';});
if(pending)void prepare();

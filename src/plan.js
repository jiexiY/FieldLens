import {session,local,announce} from './app-shell.js';
import {PLACE_SPECS,DURATIONS,SAVED_KEY,readJson,readDraft,queueTrip,tripError,validPlaces} from './trip-state.js';
import {localInput} from './journey-model.js';
const $=id=>document.getElementById(id);
let draft=readDraft(session);
for(const key of ['origin','destination'])$(''+key).innerHTML=PLACE_SPECS.map(([id,,name])=>`<option value="${id}">${name}</option>`).join('');
$('duration').innerHTML=DURATIONS.map(n=>`<option value="${n}">${n} minutes</option>`).join('');
function fill(){for(const key of ['origin','destination','departure','duration'])$(key).value=draft[key];}
fill();$('departure').min=localInput(new Date());$('departure').max=localInput(new Date(Date.now()+6*86400000));
$('swap').addEventListener('click',()=>{const origin=$('origin').value;$('origin').value=$('destination').value;$('destination').value=origin;announce('Starting place and destination swapped.');});
const saved=readJson(local,SAVED_KEY);$('load-saved').hidden=!validPlaces(saved);
$('load-saved').addEventListener('click',()=>{draft={...draft,origin:saved.origin,destination:saved.destination,duration:saved.duration};fill();announce('Saved places and duration loaded. Review your departure time.');});
$('journey-form').addEventListener('submit',event=>{
 event.preventDefault();
 const trip={origin:$('origin').value,destination:$('destination').value,departure:$('departure').value,duration:Number($('duration').value)};
 let error=tripError(trip);
 if(!error&&!queueTrip(session,trip))error='Browser session storage is unavailable. Open Talk to RealLens and use its typed trip request instead.';
 $('form-error').hidden=!error;$('form-error').textContent=error;
 $('departure').removeAttribute('aria-invalid');$('destination').removeAttribute('aria-invalid');
 if(error){const field=trip.origin===trip.destination?'destination':'departure';$(field).setAttribute('aria-invalid','true');$(field).setAttribute('aria-describedby','form-error');$(field).focus();return;}
 location.assign('/conditions');
});

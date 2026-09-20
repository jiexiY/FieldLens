import {session,prefs,createPageSpeech} from './app-shell.js';
import {readDraft,saveDraft} from './trip-state.js';
import {prepareBrief} from './journey-engine.js';
import {mountVoiceAssistant} from './voice-assistant.js';
import {answerFromBrief} from './voice-model.js';
import {transitSnapshot,transitSpeech} from './transit-model.js';
let brief=null,speaking=false,assistant=null,request=null;
const draft=readDraft(session);
const player=createPageSpeech({onState(active){speaking=active;assistant?.updateSpeechState(active);},onError:message=>assistant?.speechError(message)});
const fullAnswer=()=>!brief?answerFromBrief('weather',null):['weather','closures','surroundings','unknowns'].map(command=>answerFromBrief(command,brief)).join('\n\n');
assistant=mountVoiceAssistant({
 root:document.getElementById('voice-assistant'),getDuration:()=>draft.duration,
 speak:text=>player.speak(text,prefs.rate),stopSpeech:()=>player.cancel(),isSpeaking:()=>speaking,isSpeechSupported:()=>player.supported,setProvider:value=>player.setProvider(value),
 onCancel:()=>{request?.abort();brief=null;document.getElementById('voice-trip-link').hidden=true;},
 async getAnswer(command,intent){
  if(command==='transit'){
   let feed;try{const response=await fetch('/api/transit',{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error();feed=transitSnapshot(null,await response.json());}catch{feed={status:'unavailable'};}
   return transitSpeech(feed,intent?.route||'');
  }
  return command==='briefing'?fullAnswer():answerFromBrief(command,brief);
 },
 async onConfirm(trip){
  brief=null;document.getElementById('voice-trip-link').hidden=true;
  request?.abort();request=new AbortController();
  const bundle=await prepareBrief(trip,{signal:request.signal});brief=bundle.brief;draft.duration=trip.duration;
  const saved=saveDraft(session,trip);document.getElementById('voice-trip-link').hidden=!saved;
  return {message:fullAnswer(),speech:fullAnswer()};
 }
});
window.addEventListener('pagehide',()=>{request?.abort();assistant.stop();});

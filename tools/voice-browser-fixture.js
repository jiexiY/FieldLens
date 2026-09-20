// Browser QA ONLY: simulates speech-service events, never real microphone capture.
// This file is excluded from Vercel deployment with the tools directory.
const state={sessions:[],utterances:[],autoFinish:true,cancels:0};
class Recognition{
  start(){state.sessions.push(this);this.lateResult=this.onresult;this.onstart?.();}
  abort(){this.aborted=true;}
}
class Utterance{constructor(text){this.text=text;}}
Object.defineProperty(window,'SpeechRecognition',{value:Recognition,configurable:true});
Object.defineProperty(window,'SpeechSynthesisUtterance',{value:Utterance,configurable:true});
Object.defineProperty(window,'speechSynthesis',{value:{speak(u){state.utterances.push(u);if(state.autoFinish)setTimeout(()=>u.onend?.(),0);},cancel(){state.cancels++;}},configurable:true});
window.__fieldlensVoiceQA={
  state,
  emit(text,confidence=.99,late=false){const session=state.sessions.at(-1),handler=late?session.lateResult:session.onresult;handler?.({resultIndex:0,results:[Object.assign([{transcript:text,confidence}],{isFinal:true})]});},
  error(code){state.sessions.at(-1)?.onerror?.({error:code});},
  end(){state.sessions.at(-1)?.onend?.();}
};

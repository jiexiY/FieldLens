import {prefs,createPageSpeech} from './app-shell.js';
import {mountTransitPanel} from './transit-panel.js';
let speaking=false,panel=null;
const player=createPageSpeech({onState(active){speaking=active;panel?.setSpeaking(active);}});
panel=mountTransitPanel({root:document.getElementById('transit'),speak:text=>player.speak(text,prefs.rate),stopSpeech:()=>player.cancel(),isSpeaking:()=>speaking,canSpeak:()=>player.supported,onChanged:()=>player.cancel()});

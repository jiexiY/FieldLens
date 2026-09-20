async (page) => {
 const checks=[],responses=[],errors=[];
 const assert=(value,message)=>{if(!value)throw Error(message);checks.push(message);};
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.url().endsWith('/api/voice')&&response.request().method()==='POST')responses.push({status:response.status(),type:response.headers()['content-type']});});
 // Observe genuine HTMLAudioElement playback, without mocking requests, speech,
 // permissions, media playback, or autoplay policy. Never request GPS or a mic.
 await page.addInitScript(()=>{
  const NativeAudio=window.Audio;
  window.__realLensLiveAudio={playing:0,paused:0,pauseCalls:0,seconds:0,errors:[],elements:[]};
  window.Audio=function(...args){const audio=new NativeAudio(...args),state=window.__realLensLiveAudio;
   state.elements.push(audio);const nativePause=audio.pause.bind(audio);audio.pause=()=>{state.pauseCalls++;return nativePause();};
   audio.addEventListener('playing',()=>state.playing++);
   audio.addEventListener('pause',()=>state.paused++);
   audio.addEventListener('timeupdate',()=>{state.seconds=Math.max(state.seconds,audio.currentTime);});
   audio.addEventListener('error',()=>state.errors.push(audio.error?.code));return audio;
  };
 });
 await page.goto('https://reallens-app.vercel.app/welcome');
 await page.getByRole('button',{name:'Turn voice off',exact:true}).waitFor({timeout:30000});
 assert(await page.locator('.welcome-tile').count()===4,'Published home retains four large actions');
 await page.waitForFunction(()=>window.__realLensLiveAudio.playing>0||!document.getElementById('narration-retry').hidden,{},{timeout:40000});
 if(await page.getByRole('button',{name:'Play voice',exact:true}).isVisible())await page.getByRole('button',{name:'Play voice',exact:true}).click();
 await page.waitForFunction(()=>window.__realLensLiveAudio.seconds>.1,{},{timeout:15000});
 assert(responses.some(r=>r.status===200&&r.type?.startsWith('audio/')),'Real ElevenLabs request returned playable audio through the production server');
 assert(await page.evaluate(()=>__realLensLiveAudio.playing>0&&__realLensLiveAudio.errors.length===0),'Real browser audio playback started and advanced');
 const count=responses.length;
 await page.getByRole('button',{name:'Turn voice off',exact:true}).click();
 assert(await page.evaluate(()=>__realLensLiveAudio.pauseCalls>0&&__realLensLiveAudio.elements.every(audio=>audio.paused)),'Voice off pauses active native audio');
 await page.reload();await page.waitForTimeout(700);
 assert(await page.getByRole('button',{name:'Turn voice on',exact:true}).isVisible()&&responses.length===count,'Off preference survives reload without another speech request');
 await page.goto('https://reallens-app.vercel.app/');
 assert(await page.getByRole('button',{name:'Turn voice on',exact:true}).isVisible(),'Product intro also has the voice control and respects Off');
 assert(await page.locator('.pilot-note,.project-footer a[href="/explorer.html"],.project-footer a[href*="github.com"]').count()===0,'Requested intro cleanup remains published');
 await page.getByRole('button',{name:'Turn voice on',exact:true}).click();
 await page.waitForFunction(()=>__realLensLiveAudio.seconds>.1,{},{timeout:40000});
 assert(responses.length>count&&responses.at(-1).status===200,'Product introduction also plays genuine ElevenLabs narration');
 await page.getByRole('button',{name:'Turn voice off',exact:true}).click();
 await page.goto('https://reallens-app.vercel.app/ride');await page.locator('#ride-form').waitFor();
 assert(await page.locator('#ride-route option').count()===28,'Published stop page serves the official 27-route catalog');
 assert((await page.locator('#ride-status').textContent())==='Location is off.','Stop page does not request location until Start journey');
 await page.setViewportSize({width:390,height:844});await page.goto('https://reallens-app.vercel.app/welcome');
 await page.screenshot({path:'output/playwright/reallens-voice-live-mobile.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Published home has no mobile horizontal overflow');
 await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
 const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>v.id));
 assert(!violations.length,'Published home voice controls pass axe '+violations.join(','));
 assert(errors.length===0,'No JavaScript page errors '+errors.join('; '));
 return {passed:checks.length,checks,responses,note:'Real server speech and browser playback tested. Human hearing, microphone, VoiceOver/NVDA and field GPS accuracy not tested.'};
}

async (page) => {
  const requests=[];
  const sample='output/playwright/voice-qa.wav';
  await page.route('**/api/voice',async route=>{
    if(route.request().method()==='GET')return route.fulfill({json:{configured:true}});
    const body=route.request().postDataJSON();requests.push({action:body.action,text:body.text,audioLength:body.audio?.length});
    if(body.action==='transcribe')return route.fulfill({json:{text:'From Reitz Union to Marston tomorrow at eight AM.'}});
    return route.fulfill({path:sample,contentType:'audio/wav'});
  });
  await page.addInitScript(()=>{
    window.__fieldlensElevenQA={streams:[],gets:0,voiced:0};
    const NativeWorklet=window.AudioWorkletNode;
    window.AudioWorkletNode=class extends NativeWorklet{constructor(...args){super(...args);this.port.addEventListener('message',event=>{for(const value of event.data)if(Math.abs(value)>.012)window.__fieldlensElevenQA.voiced++;});}};
    navigator.mediaDevices.getUserMedia=async()=>{
      window.__fieldlensElevenQA.gets++;
      const context=new AudioContext(),oscillator=context.createOscillator(),volume=context.createGain(),destination=context.createMediaStreamDestination();
      volume.gain.value=.15;oscillator.connect(volume);volume.connect(destination);oscillator.start();await context.resume();
      const stream=destination.stream;window.__fieldlensElevenQA.streams.push(stream);
      for(const track of stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{stop();oscillator.stop();void context.close();};}
      return stream;
    };
  });
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#voice-provider')?.value==='elevenlabs'&&!document.querySelector('#create')?.disabled);
  if(await page.evaluate(()=>window.__fieldlensElevenQA.gets)!==0)throw Error('Microphone started without a request');
  const before=await page.locator('#destination').inputValue();
  await page.getByRole('button',{name:'Talk · microphone off',exact:true}).click();
  await page.getByRole('button',{name:'Finish speaking',exact:true}).waitFor();
  // Allow ample audio beyond the 150 ms speech gate, including at 48 kHz.
  await page.waitForFunction(()=>window.__fieldlensElevenQA.voiced>48000);
  await page.getByRole('button',{name:'Finish speaking',exact:true}).click();
  await page.getByRole('button',{name:'Confirm trip',exact:true}).waitFor();
  if(await page.locator('#destination').inputValue()!==before)throw Error('Unconfirmed transcription changed the form');
  if(!requests.some(r=>r.action==='transcribe'&&r.audioLength>1000))throw Error('Worklet audio did not reach transcription boundary');
  if(!await page.evaluate(()=>window.__fieldlensElevenQA.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))))throw Error('Microphone tracks still active');
  await page.getByRole('button',{name:'Stop audio / microphone',exact:true}).click();
  await page.getByRole('button',{name:'Confirm trip',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#announcer')?.textContent.includes('Your briefing is ready'),null,{timeout:30000});
  if(await page.locator('#destination').inputValue()!=='marston')throw Error('Confirmed trip was not applied');
  await page.getByRole('button',{name:'Stop audio / microphone',exact:true}).click();
  const sent=requests.length;
  await page.getByRole('button',{name:'Talk · microphone off',exact:true}).click();
  await page.getByRole('button',{name:'Finish speaking',exact:true}).waitFor();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  if(requests.length!==sent)throw Error('Escape sent a recording');
  if(!await page.evaluate(()=>window.__fieldlensElevenQA.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))))throw Error('Escape did not stop tracks');
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  const axe=await page.evaluate(async()=>{const a=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:a.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),incomplete:a.incomplete.map(v=>v.id)};});
  if(axe.violations.length)throw Error(JSON.stringify(axe));
  return {mode:'synthetic microphone + mocked ElevenLabs; live environment data',requests,axe,passed:true};
}

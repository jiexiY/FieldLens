// Explicit live check: consumes one short TTS request and one STT request.
// Run only on the authorized production site. No personal microphone is used.
async (page) => {
  if(await page.evaluate(()=>location.origin)!=='https://fieldlens-pi.vercel.app')throw Error('Wrong test origin');
  const result=await page.evaluate(async()=>{
    const text='From Reitz Union to Marston tomorrow at eight A M.';
    const speech=await fetch('/api/voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'speak',text})});
    if(!speech.ok)return {stage:'speech',status:speech.status,error:await speech.json()};
    const bytes=await speech.arrayBuffer(),context=new AudioContext();
    let decoded;try{decoded=await context.decodeAudioData(bytes.slice(0));}finally{await context.close();}
    if(decoded.duration>20)throw Error('Test speech exceeds recording limit');
    const frames=Math.floor(decoded.duration*16000),wav=new ArrayBuffer(44+frames*2),view=new DataView(wav);
    const label=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
    label(0,'RIFF');view.setUint32(4,wav.byteLength-8,true);label(8,'WAVE');label(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);label(36,'data');view.setUint32(40,frames*2,true);
    const samples=decoded.getChannelData(0),ratio=decoded.sampleRate/16000;
    for(let i=0;i<frames;i++){let sum=0,count=0;for(let j=Math.floor(i*ratio);j<Math.min(samples.length,Math.floor((i+1)*ratio));j++){sum+=samples[j];count++;}const value=Math.max(-1,Math.min(1,sum/Math.max(1,count)));view.setInt16(44+i*2,value<0?value*32768:value*32767,true);}
    let binary='';const data=new Uint8Array(wav);for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));
    const transcript=await fetch('/api/voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'transcribe',audio:btoa(binary)})});
    return {speech:{status:speech.status,bytes:bytes.byteLength,duration:decoded.duration},transcription:{status:transcript.status,...await transcript.json()}};
  });
  if(result.stage||result.transcription?.status!==200)throw Error(JSON.stringify(result));
  return {mode:'Real ElevenLabs synthetic-speech round trip; no human microphone',...result};
}

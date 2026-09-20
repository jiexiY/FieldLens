import {encodeWav,resample,wavBase64,MAX_SECONDS} from './voice-audio.js';
export const canCapture=host=>!!(host.isSecureContext&&host.navigator?.mediaDevices?.getUserMedia&&(host.AudioContext||host.webkitAudioContext)&&host.AudioWorkletNode);

export function createElevenInput({host=window,onStatus=()=>{},onResult=()=>{},onError=()=>{},onRecording=()=>{},fetcher=host.fetch.bind(host)}={}){
  let epoch=0,stream=null,context=null,node=null,source=null,timer=null,controller=null,chunks=[],length=0,recording=false,active=false,heardSpeech=false;
  function release(){clearTimeout(timer);timer=null;stream?.getTracks().forEach(track=>track.stop());stream=null;source?.disconnect();source=null;if(node){node.port.onmessage=null;node.disconnect();node=null;}if(context){void context.close().catch(()=>{});context=null;}recording=false;onRecording(false);}
  function cancel(){epoch++;active=false;controller?.abort();controller=null;release();chunks=[];length=0;heardSpeech=false;}
  async function finish(){
    if(!recording)return;const id=epoch,rate=context.sampleRate;const samples=new Float32Array(length);let offset=0;for(const chunk of chunks){samples.set(chunk,offset);offset+=chunk.length;}release();chunks=[];length=0;
    if(samples.length<rate*.1||!heardSpeech){active=false;onError('No speech was detected. Nothing was sent. Tap Talk again, move closer to the microphone, or type your request.');return;}
    controller=new AbortController();timer=setTimeout(()=>controller?.abort(),27000);onStatus('Microphone off. Sending this short recording to ElevenLabs for transcription…');
    try {
      const response=await fetcher('/api/voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'transcribe',audio:wavBase64(encodeWav(resample(samples,rate)),host.btoa.bind(host))}),signal:controller.signal});
      let data;try{data=await response.json();}catch{throw Error('The voice service is temporarily busy. Select Browser voice or use text.');}
      if(!response.ok)throw Error(data.message||'Transcription could not finish. Select Browser voice or use text.');
      if(id!==epoch)return;active=false;
      if(!data.text)onError('No speech was recognized. Tap Talk again, or type your request.');else onResult(data.text);
    } catch(e){if(id===epoch){active=false;onError(e.name==='AbortError'?'Transcription timed out. The microphone is off. Try Browser voice or type your request.':e.message);}}
    finally{if(id===epoch){clearTimeout(timer);timer=null;controller=null;}}
  }
  async function start(){
    cancel();if(!canCapture(host)){onError('This browser cannot capture ElevenLabs audio. Select Browser voice or type your request.');return;}
    const id=epoch;active=true;onStatus('Allow microphone access to record one short request. Nothing is sent until the recording finishes.');
    timer=setTimeout(()=>{if(id===epoch){cancel();onError('Microphone access timed out. Tap Talk to try again.');}},20000);
    try {
      const granted=await host.navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1},video:false});
      if(id!==epoch){granted.getTracks().forEach(track=>track.stop());return;}stream=granted;
      const Audio=host.AudioContext||host.webkitAudioContext;context=new Audio();const ctx=context;
      await ctx.audioWorklet.addModule(new URL('./voice-capture-worklet.js',import.meta.url));if(id!==epoch)return;
      await ctx.resume();if(id!==epoch)return;
      source=ctx.createMediaStreamSource(stream);node=new host.AudioWorkletNode(ctx,'fieldlens-capture');source.connect(node);node.connect(ctx.destination);
      let speech=false,silent=0,voiced=0;recording=true;onRecording(true);clearTimeout(timer);timer=setTimeout(()=>void finish(),MAX_SECONDS*1000);
      onStatus('Listening with ElevenLabs. Finish speaking, then pause. Or press Finish speaking. Stop cancels without sending.');
      node.port.onmessage=event=>{
        if(id!==epoch||!recording)return;
        const available=Math.max(0,ctx.sampleRate*MAX_SECONDS-length),part=event.data.subarray(0,available);chunks.push(part);length+=part.length;
        let energy=0;for(const x of part)energy+=x*x;const loud=Math.sqrt(energy/Math.max(1,part.length))>.012;
        if(loud){voiced+=part.length;silent=0;if(voiced>ctx.sampleRate*.15){speech=true;heardSpeech=true;}}else silent+=part.length;
        if(length>=ctx.sampleRate*MAX_SECONDS || (speech&&silent>=ctx.sampleRate*1.8))void finish();
      };
    }catch(e){if(id!==epoch)return;cancel();onError(e.name==='NotAllowedError'?'Microphone permission was denied. Allow it in browser settings or type your request.':'The microphone could not start. Select Browser voice or type your request.');}
  }
  return {start,finish,cancel,get active(){return active;},get recording(){return recording;}};
}

import {createSpeechPlayer,speechChunks} from './speech-output.js';

export function createHybridSpeechPlayer({host=window,onState=()=>{},onError=()=>{},onNotice=()=>{},onBlocked=()=>{},fetcher=host.fetch.bind(host)}={}){
  let provider='browser',epoch=0,active=false,controller=null,audio=null,objectUrl=null,resumePlayback=null,rejectPlayback=null;
  const browser=createSpeechPlayer({host,onState:value=>{active=value;onState(value);},onError});
  function release(){resumePlayback=null;rejectPlayback?.(Error('Playback cancelled.'));rejectPlayback=null;if(audio){audio.onended=null;audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load();audio=null;}if(objectUrl){host.URL.revokeObjectURL(objectUrl);objectUrl=null;}}
  function cancel(){epoch++;controller?.abort();controller=null;release();browser.cancel();active=false;onState(false);}
  function speak(text,rate=1){
    cancel();if(provider!=='elevenlabs')return browser.speak(text,rate);
    if(String(text).length>12000){onNotice('This is a long briefing. Using Browser voice to conserve the demo allowance.');return browser.speak(text,rate);}
    if(!host.Audio){onError('Audio playback is unavailable. Use the visible text or your screen reader.');return false;}
    const chunks=speechChunks(text,1000);if(!chunks.length)return false;
    const id=epoch;active=true;onState(true);
    // Audio errors/limits use browser speech for the remaining text only. No
    // retries that charge the provider twice, and Stop invalidates every callback.
    void (async()=>{
      for(let index=0;index<chunks.length;index++){
        if(id!==epoch)return;
        try{
          controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),27000);
          let blob;
          try{const response=await fetcher('/api/voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'speak',text:chunks[index]}),signal:controller.signal});
            if(!response.ok){let data;try{data=await response.json();}catch{}throw Error(data?.message||'ElevenLabs is temporarily busy.');}
            if(!(response.headers.get('content-type')||'').startsWith('audio/'))throw Error('ElevenLabs did not return playable audio.');
            blob=await response.blob();if(!blob.size)throw Error('The audio response was empty.');
          }finally{clearTimeout(timeout);}
          if(id!==epoch)return;
          release();objectUrl=host.URL.createObjectURL(blob);audio=new host.Audio(objectUrl);audio.playbackRate=rate;
          await new Promise((resolve,reject)=>{
            rejectPlayback=reject;audio.onended=resolve;audio.onerror=()=>reject(Error('Audio playback failed.'));
            const play=()=>{
              if(id!==epoch)return false;
              resumePlayback=null;active=true;onState(true);
              Promise.resolve(audio.play()).catch(error=>{
                if(id!==epoch)return;
                if(error?.name==='NotAllowedError'){
                  active=false;onState(false);resumePlayback=play;
                  onBlocked('Your browser needs a tap before audio can play. Choose Play voice.');
                }else reject(Error('Audio playback failed.'));
              });return true;
            };play();
          });
        }catch(e){
          if(id!==epoch)return;release();controller=null;
          onNotice(`${e.name==='AbortError'?'ElevenLabs timed out.':e.message} Using Browser voice for the remaining reply.`);
          if(browser.supported)browser.speak(chunks.slice(index).join(' '),rate);else{active=false;onState(false);onError('Speech could not play. The complete reply remains available as text.');}
          return;
        }
      }
      if(id===epoch){release();controller=null;active=false;onState(false);}
    })();
    return true;
  }
  return {speak,cancel,resume:()=>resumePlayback?.()||false,get waiting(){return !!resumePlayback;},setProvider(value){cancel();provider=value==='elevenlabs'?'elevenlabs':'browser';},get supported(){return browser.supported||(provider==='elevenlabs'&&!!host.Audio);},get active(){return active;}};
}

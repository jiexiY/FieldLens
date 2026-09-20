export function speechChunks(text,max=240){
  const words=String(text).replace(/https:\/\/\S+/g,'Source link is available in the text.').replace(/\s+/g,' ').trim().split(' ');
  const chunks=[];let part='';for(const word of words){if(part&&(part.length+word.length+1>max)){chunks.push(part);part='';}part+=(part?' ':'')+word;}if(part)chunks.push(part);return chunks;
}
export function createSpeechPlayer({host=globalThis,onState=()=>{},onError=()=>{}}={}){
  const supported=!!(host.speechSynthesis&&host.SpeechSynthesisUtterance);let token=0,active=false,current=null;
  function cancel(){token++;active=false;current=null;if(supported)host.speechSynthesis.cancel();onState(false);}
  function speak(text,rate=1){
    cancel();if(!supported){onError('Speech is unavailable in this browser. The reply remains available as text.');return false;}
    const chunks=speechChunks(text);if(!chunks.length)return false;
    const id=token;let index=0;active=true;onState(true);
    const next=()=>{if(id!==token)return;if(index===chunks.length){active=false;current=null;onState(false);return;}
      const utterance=new host.SpeechSynthesisUtterance(chunks[index++]);current=utterance;utterance.lang='en-US';utterance.rate=rate;
      utterance.onend=next;utterance.onerror=()=>{if(id!==token)return;cancel();onError('Speech could not finish. The reply remains available as text; use Read reply to try again.');};
      try{host.speechSynthesis.speak(utterance);}catch{utterance.onerror();}
    };next();return true;
  }
  return {supported,speak,cancel,get active(){return active;}};
}

export const SAMPLE_RATE=16000,MAX_SECONDS=20;
export function encodeWav(samples){
  const count=Math.min(samples.length,SAMPLE_RATE*MAX_SECONDS),buffer=new ArrayBuffer(44+count*2),view=new DataView(buffer);
  const str=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  str(0,'RIFF');view.setUint32(4,36+count*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,SAMPLE_RATE,true);view.setUint32(28,SAMPLE_RATE*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,count*2,true);
  for(let i=0;i<count;i++){const sample=Number.isFinite(samples[i])?Math.max(-1,Math.min(1,samples[i])):0;view.setInt16(44+i*2,sample<0?sample*32768:sample*32767,true);}
  return buffer;
}
export function resample(samples,fromRate){
  if(fromRate===SAMPLE_RATE)return samples;
  const step=fromRate/SAMPLE_RATE,out=new Float32Array(Math.floor(samples.length/step));
  for(let i=0;i<out.length;i++){const start=Math.floor(i*step),end=Math.max(start+1,Math.floor((i+1)*step));let sum=0;for(let j=start;j<end&&j<samples.length;j++)sum+=samples[j];out[i]=sum/(end-start);}
  return out;
}
export function wavBase64(buffer,encode=globalThis.btoa){
  const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return encode(binary);
}

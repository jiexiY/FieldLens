// Runs on the audio thread; no network, storage, speech interpretation, or output.
class FieldLensCapture extends AudioWorkletProcessor {
  constructor(){super();this.samples=new Float32Array(2048);this.position=0;}
  process(inputs){
    const input=inputs[0]?.[0];if(!input)return true;
    for(const sample of input){this.samples[this.position++]=sample;if(this.position===this.samples.length){this.port.postMessage(this.samples);this.samples=new Float32Array(2048);this.position=0;}}
    return true;
  }
}
registerProcessor('fieldlens-capture',FieldLensCapture);

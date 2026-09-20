// A bounded speech proxy. Secrets, raw provider errors, recordings, and transcripts
// are never written to logs or storage. No caller-selected URLs, voices, or models.
export const MAX_AUDIO_SECONDS = 20;
export const MAX_TEXT = 1200;
const MAX_BODY = 900000;
const VOICE = 'EXAVITQu4vr4xnSDxMaL'; // Sarah, a default voice (not a cloned/library voice).
const buckets = new Map();
const error = (status, code, message) => Object.assign(new Error(message), {status, code});
const SAFE_PROVIDER_CODES=new Set(['invalid_api_key','invalid_api_key_prefix','missing_api_key','unauthorized','missing_permissions','insufficient_permissions','feature_not_available','subscription_required','voice_access_denied','model_access_denied','voice_not_found','model_not_found','invalid_parameters','missing_required_field','invalid_voice_settings','invalid_voice_id','unsupported_model','invalid_audio','invalid_audio_format','invalid_output_format','quota_exceeded','insufficient_credits','rate_limit_exceeded','concurrent_limit_exceeded','system_busy','internal_error','service_unavailable','maintenance','detected_unusual_activity']);

export function validateWav(audio) {
  if (audio.length < 44 || audio.toString('ascii',0,4)!=='RIFF' || audio.toString('ascii',8,12)!=='WAVE' ||
      audio.toString('ascii',12,16)!=='fmt ' || audio.readUInt32LE(16)!==16 || audio.readUInt16LE(20)!==1 ||
      audio.readUInt16LE(22)!==1 || audio.readUInt32LE(24)!==16000 || audio.readUInt32LE(28)!==32000 ||
      audio.readUInt16LE(32)!==2 || audio.readUInt16LE(34)!==16 || audio.toString('ascii',36,40)!=='data' ||
      audio.readUInt32LE(4)!==audio.length-8 || audio.readUInt32LE(40)!==audio.length-44 || (audio.length-44)%2) {
    throw error(400,'invalid_audio','Use a short microphone recording in FieldLens.');
  }
  const seconds=(audio.length-44)/32000;
  if(seconds<.1 || seconds>MAX_AUDIO_SECONDS) throw error(400,'audio_length','Record between a moment and 20 seconds.');
  return seconds;
}

export function validateVoiceRequest(body) {
  if (!body || typeof body!=='object' || Array.isArray(body)) throw error(400,'invalid_request','Invalid voice request.');
  if(body.action==='speak') {
    const text=typeof body.text==='string'?body.text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim():'';
    if(!text || body.text.length>MAX_TEXT) throw error(400,'text_length','This speech segment is too long or empty.');
    return {action:'speak',text};
  }
  if(body.action==='transcribe') {
    if(typeof body.audio!=='string' || body.audio.length>854000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.audio)) throw error(400,'invalid_audio','Invalid microphone recording.');
    const audio=Buffer.from(body.audio,'base64');
    if(audio.toString('base64')!==body.audio) throw error(400,'invalid_audio','Invalid microphone recording.');
    validateWav(audio);
    return {action:'transcribe',audio};
  }
  throw error(400,'invalid_action','Unknown voice action.');
}

// An extra process-local throttle; the deployed Vercel WAF supplies the
// cross-instance IP limit. Neither is a substitute for an ElevenLabs key cap.
export function takeAllowance(ip, cost, now=Date.now(), state=buckets) {
  for(const [key,b] of state) if(now-b.since>=600000) state.delete(key);
  if(state.size>=5000 && !state.has(ip)) return false;
  const b=state.get(ip)||{since:now,count:0,characters:0};
  if(b.count>=40 || b.characters+cost>18000) return false;
  b.count++;b.characters+=cost;state.set(ip,b);return true;
}

async function readBody(req) {
  if(Number(req.headers['content-length'])>MAX_BODY) throw error(413,'too_large','The voice request is too large.');
  if(req.body!==undefined) {
    const raw=Buffer.isBuffer(req.body)?req.body.toString('utf8'):typeof req.body==='string'?req.body:JSON.stringify(req.body);
    if(Buffer.byteLength(raw)>MAX_BODY) throw error(413,'too_large','The voice request is too large.');
    try{return JSON.parse(raw);}catch{throw error(400,'invalid_json','Invalid voice request.');}
  }
  let bytes=0;const chunks=[];
  for await(const chunk of req){const b=Buffer.from(chunk);bytes+=b.length;if(bytes>MAX_BODY)throw error(413,'too_large','The voice request is too large.');chunks.push(b);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw error(400,'invalid_json','Invalid voice request.');}
}

function send(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));}
export function createVoiceHandler({env=process.env,fetcher=globalThis.fetch,allow=takeAllowance,report=metadata=>console.warn('FieldLens voice provider rejection',metadata)}={}) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
    const key=env.ELEVENLAB_API_KEY||env.ELEVENLABS_API_KEY;
    const enabled=!!key && env.FIELDLENS_ELEVENLABS_DISABLED!=='1';
    if(req.method==='GET') return send(res,200,{configured:enabled,maxSeconds:MAX_AUDIO_SECONDS,maxText:MAX_TEXT,provider:'ElevenLabs'});
    if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(res,405,{code:'method',message:'Use a supported voice request.'});}
    let controller;const aborted=()=>controller?.abort();
    try {
      const origin=req.headers.origin;
      let sameOrigin=false;
      try {const parsed=new URL(origin);sameOrigin=parsed.host===req.headers.host && ['https:','http:'].includes(parsed.protocol);}catch{}
      if(!sameOrigin || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site']!=='same-origin')) throw error(403,'origin','Open FieldLens directly to use speech.');
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')) throw error(415,'content_type','Use a JSON voice request.');
      if(!enabled) throw error(503,'not_configured','ElevenLabs is not configured here. Select Browser voice or use text.');
      const input=validateVoiceRequest(await readBody(req));
      const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
      if(!allow(ip,input.text?.length||0)){res.setHeader('Retry-After','600');throw error(429,'rate_limit','The demo voice allowance is temporarily busy. Select Browser voice or use text.');}
      controller=new AbortController();req.once?.('aborted',aborted);res.once?.('close',aborted);
      const timer=setTimeout(aborted,23000);
      try {
        let response;
        if(input.action==='speak') response=await fetcher(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`,{
          method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},signal:controller.signal,
          body:JSON.stringify({text:input.text,model_id:'eleven_flash_v2_5',voice_settings:{stability:.55,similarity_boost:.75}})
        });
        else {
          const form=new FormData();form.append('file',new Blob([input.audio],{type:'audio/wav'}),'request.wav');
          form.append('model_id','scribe_v2');form.append('language_code','en');form.append('tag_audio_events','false');form.append('diarize','false');form.append('timestamps_granularity','none');
          response=await fetcher('https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers:{'xi-api-key':key},signal:controller.signal,body:form});
        }
        if(!response.ok) {
          let providerCode='';try{const detail=(await response.json())?.detail;providerCode=detail?.code||detail?.status||'';}catch{}
          // Only allowlisted codes and numeric status are logged. Never raw
          // messages, headers, input text, audio, or provider request details.
          report({action:input.action,status:response.status,code:SAFE_PROVIDER_CODES.has(providerCode)?providerCode:'unknown'});
          if(['invalid_api_key','invalid_api_key_prefix','missing_api_key'].includes(providerCode))throw error(503,'provider_key','ElevenLabs rejected the saved API key. The owner needs to check that Vercel holds the full secret key, not its name or ID. Select Browser voice for now.');
          if(response.status===402 || response.status===429 || /quota|credit|rate_limit/.test(providerCode)) throw error(429,'provider_limit','ElevenLabs has reached its usage limit. Select Browser voice or use text.');
          if(['voice_not_found','voice_access_denied'].includes(providerCode))throw error(503,'provider_voice','The configured ElevenLabs voice is unavailable for this account. Select Browser voice for now.');
          if([401,403].includes(response.status)) throw error(503,'provider_access','ElevenLabs access is unavailable. The owner needs to check the key, speech permissions, or voice access. Select Browser voice for now.');
          throw error(502,'provider_unavailable','ElevenLabs could not complete this request. Select Browser voice or try again later.');
        }
        if(input.action==='speak') {
          if(!(response.headers.get('content-type')||'').startsWith('audio/')) throw error(502,'invalid_response','The speech provider did not return audio.');
          const audio=Buffer.from(await response.arrayBuffer());
          if(!audio.length || audio.length>2500000) throw error(502,'invalid_response','The speech provider returned unusable audio.');
          res.statusCode=200;res.setHeader('Content-Type','audio/mpeg');return res.end(audio);
        }
        const data=await response.json();
        if(typeof data.text!=='string' || data.text.length>1000) throw error(502,'invalid_transcript','No usable short request was recognized. Try again or type it.');
        return send(res,200,{text:data.text.trim()});
      } finally {clearTimeout(timer);}
    } catch(e) {
      if(res.destroyed || res.writableEnded)return;
      send(res,e.status||502,{code:e.code||'voice_unavailable',message:e.status?e.message:'The speech connection timed out or failed. Select Browser voice or use text.'});
    } finally {req.off?.('aborted',aborted);res.off?.('close',aborted);}
  };
}
export default createVoiceHandler();

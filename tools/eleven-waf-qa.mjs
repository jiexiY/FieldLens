// Explicit production rate-limit test. Invalid actions never call ElevenLabs.
// The test IP may be throttled on the voice endpoint for up to one minute.
const origin='https://fieldlens-pi.vercel.app';
const counts={};
for(let i=0;i<35;i++){
  const response=await fetch(`${origin}/api/voice`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'invalid-qa-action'}),signal:AbortSignal.timeout(10000)});
  counts[response.status]=(counts[response.status]||0)+1;
  await response.arrayBuffer();
  if(response.status===429)break;
  if(response.status!==400)throw Error(`Unexpected status: ${response.status}`);
}
const home=await fetch(origin,{signal:AbortSignal.timeout(10000)});
console.log(JSON.stringify({counts,homeStatus:home.status,passed:!!counts[429]&&home.status===200}));
if(!counts[429]||home.status!==200)process.exitCode=1;

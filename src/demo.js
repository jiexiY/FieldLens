import './welcome.js';

// Replace the splash history entry so Back does not restart the opening timer.
document.getElementById('demo-hint').textContent='Home opens automatically in two seconds. Activate the RealLens icon to continue now. Audio and microphone are off.';
let timer;
const cancel=()=>{window.clearTimeout(timer);timer=null;};
const start=()=>{
  cancel();
  if(!document.hidden)timer=window.setTimeout(()=>window.location.replace('/welcome'),2000);
};
document.addEventListener('visibilitychange',()=>document.hidden?cancel():start());
window.addEventListener('pagehide',cancel);
window.addEventListener('pageshow',event=>{if(event.persisted)start();});
document.querySelector('.demo-entry').addEventListener('click',event=>{
  // Preserve normal browser behavior for modified clicks and opening a new tab.
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();cancel();window.location.replace('/welcome');
});
start();

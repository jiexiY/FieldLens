import {prefs,savePreferences} from './app-shell.js';
const $=id=>document.getElementById(id);
$('pref-large').checked=prefs.large;$('pref-contrast').checked=prefs.contrast;$('pref-detail').value=prefs.detail;$('pref-rate').value=prefs.rate;
document.querySelector('form').addEventListener('submit',event=>event.preventDefault());
document.querySelector('form').addEventListener('change',()=>{
 const saved=savePreferences({large:$('pref-large').checked,contrast:$('pref-contrast').checked,detail:$('pref-detail').value,rate:Number($('pref-rate').value)});
 $('settings-status').textContent=saved?'Preferences saved in this browser.':'Browser storage is unavailable. These settings apply to this page only.';
});

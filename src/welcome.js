import {PREFERENCES_KEY,readingPreferences} from './home-model.js';
import './narration.js';

// Static links work without JavaScript. Narration never requests a microphone.
let prefs=readingPreferences(null);
try{prefs=readingPreferences(JSON.parse(localStorage.getItem(PREFERENCES_KEY)||'null'));}catch{/* Browser storage is optional. */}
document.documentElement.dataset.contrast=prefs.contrast?'high':'normal';
document.documentElement.dataset.reading=prefs.large?'large':'normal';

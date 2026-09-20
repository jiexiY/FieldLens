import './app-shell.js';
import {loadCampus} from './journey-engine.js';
import {formatDate} from './journey-model.js';
import {link} from './app-icons.js';
import {escapeHtml as esc} from './notebook.js';
loadCampus().then(({grid,campus})=>{
 document.getElementById('satellite-source').innerHTML='Scene: '+esc(formatDate(grid.date))+'. '+link(grid.source,'Original Sentinel-2 scene')+'.';
 document.getElementById('map-source').textContent='Map snapshot retrieved '+formatDate(campus.retrievedAt)+'. Retrieval is not a field inspection.';
}).catch(()=>{document.getElementById('satellite-source').textContent='Dataset metadata is unavailable on this visit. Download the source files or try again.';});

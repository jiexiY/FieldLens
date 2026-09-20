// Reproducible, bounded OSM snapshot. Never query Overpass from the public app.
import { mkdir, writeFile } from 'node:fs/promises';
const bbox = [29.643, -82.355, 29.6535, -82.338];
const query = `[out:json][timeout:40];(way["highway"~"^(footway|pedestrian|path|steps)$"](${bbox});way["building"](${bbox});way["natural"~"^(water|wood)$"](${bbox});way["landuse"~"^(grass|forest)$"](${bbox}););out body geom;`;
const source = `https://api.openstreetmap.org/api/0.6/map?bbox=${[bbox[1],bbox[0],bbox[3],bbox[2]].join(',')}`;
const response = await fetch(source, { headers: { Accept:'application/json', 'User-Agent':'FieldLens one-time campus research extract (fieldlens-pi.vercel.app)' }, signal:AbortSignal.timeout(55000) });
if (!response.ok) throw new Error(`OSM HTTP ${response.status}`);
const result = await response.json();
if (result.remark || !result.elements) throw new Error(JSON.stringify(result));
const allowedTags = ['name','highway','footway','surface','smoothness','access','foot','wheelchair','lit','incline','tactile_paving','crossing','building','natural','landuse','covered','indoor','area'];
const nodes = new Map(result.elements.filter(e=>e.type==='node').map(n=>[n.id,[n.lon,n.lat]]));
const ways = result.elements.filter(e=>e.type==='way' && (e.tags?.building || /^(footway|pedestrian|path|steps)$/.test(e.tags?.highway) || ['water','wood'].includes(e.tags?.natural) || ['grass','forest'].includes(e.tags?.landuse))).map(e => ({ id:e.id, nodes:e.nodes,
  geometry:e.nodes.map(id=>nodes.get(id)), tags:Object.fromEntries(Object.entries(e.tags??{}).filter(([key])=>allowedTags.includes(key))) })).filter(w=>w.geometry.every(Boolean));
const output = { bbox, retrievedAt:new Date().toISOString(), databaseTimestamp:result.osm3s?.timestamp_osm_base ?? null,
  source, attribution:'© OpenStreetMap contributors', license:'https://www.openstreetmap.org/copyright', ways };
await mkdir(new URL('../public/data/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/data/campus-osm.json',import.meta.url),JSON.stringify(output));
console.log(JSON.stringify({ways:ways.length, paths:ways.filter(w=>w.tags.highway).length,
  places:ways.filter(w=>/Reitz|Marston|Library West|Baughman|Harn|Florida Museum/i.test(w.tags.name??'')).map(w=>({id:w.id,name:w.tags.name,center:w.geometry.reduce((a,p)=>[a[0]+p[0]/w.geometry.length,a[1]+p[1]/w.geometry.length],[0,0])}))},null,2));

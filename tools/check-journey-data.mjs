import { readFile } from 'node:fs/promises';
import {buildGraph,findRoute,environmentAlong} from '../src/journey-model.js';
import {getEnvironment} from '../api/environment.js';
const campus=JSON.parse(await readFile(new URL('../public/data/campus-osm.json',import.meta.url)));
const grid=JSON.parse(await readFile(new URL('../public/data/campus-vegetation.json',import.meta.url)));
const graph=buildGraph(campus.ways);
const ids=[863211313,150860048,150684197,154223625,150926632,150926630];
const places=ids.map(id=>{const way=campus.ways.find(w=>w.id===id),xs=way.geometry.map(p=>p[0]),ys=way.geometry.map(p=>p[1]);return {name:way.tags.name,coord:[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2]};});
for(let i=0;i<places.length;i++)for(let j=i+1;j<places.length;j++){
  const r=findRoute(graph,places[i].coord,places[j].coord);if(!r)throw Error(`Disconnected pilot: ${places[i].name} to ${places[j].name}`);
  console.log(JSON.stringify({journey:`${places[i].name} → ${places[j].name}`,m:Math.round(r.metres),startGap:Math.round(r.startGap),endGap:Math.round(r.endGap),sections:environmentAlong(r,grid).map(s=>({ndvi:s.ndvi?.toFixed(2),coverage:s.coverage.toFixed(2)}))}));
}
if(process.argv.includes('--live')){
  const environment=await getEnvironment(29.6485,-82.345);
  console.log(JSON.stringify(Object.fromEntries(Object.entries(environment).map(([key,value])=>[key,{status:value.status,generatedAt:value.generatedAt,fetchedAt:value.fetchedAt,count:value.notices?.length??value.items?.length??value.periods?.length,firstWeather:value.periods?.[0],mapped:value.notices?.filter(n=>n.polygons.length).length}])),null,2));
}

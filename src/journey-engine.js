import {buildGraph,findRoute,parseDeparture,forecastWindow,relevantClosures,environmentAlong} from './journey-model.js';
import {mergeClosureSnapshot} from './closure-updates.js';
import {PLACE_SPECS,tripError} from './trip-state.js';

let datasetPromise;
export function loadCampus(){
  if(!datasetPromise)datasetPromise=(async()=>{
    const [campus,grid]=await Promise.all(['/data/campus-osm.json','/data/campus-vegetation.json'].map(async url=>{
      const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw Error('Campus data is unavailable. Please try again.');
      return response.json();
    }));
    const graph=buildGraph(campus.ways);
    const places=PLACE_SPECS.map(([id,osmId,name])=>{
      const way=campus.ways.find(w=>w.id===osmId);if(!way)throw Error('A campus place is missing from the dataset.');
      const bounds=way.geometry.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);
      return {id,osmId,name,coord:[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2]};
    });
    return {campus,grid,graph,places};
  })().catch(error=>{datasetPromise=null;throw error;});
  return datasetPromise;
}
export async function prepareBrief(draft,{signal}={}){
  const error=tripError(draft);if(error)throw Error(error);
  const data=await loadCampus();
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  const {graph,places,grid}=data;
  const origin=places.find(p=>p.id===draft.origin),destination=places.find(p=>p.id===draft.destination);
  const departure=parseDeparture(draft.departure),duration=draft.duration;
  const route=findRoute(graph,origin.coord,destination.coord);
  if(!route?.segments.length)throw Error('No connected mapped study line was found. Try another pair of places.');
  const center=route.coordinates[Math.floor(route.coordinates.length/2)];
  let environment;
  try{
    const signals=[AbortSignal.timeout(30000)];if(signal)signals.push(signal);
    const response=await fetch(`/api/environment?lat=${center[1].toFixed(4)}&lon=${center[0].toFixed(4)}`,{signal:AbortSignal.any(signals)});
    if(!response.ok)throw Error('Source unavailable');
    environment=await response.json();
    if(!environment.weather||!environment.closures||!environment.alerts)throw Error('Incomplete response');
  }catch{
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    environment={weather:{status:'unavailable'},closures:{status:'unavailable'},alerts:{status:'unavailable'}};
  }
  environment.closures=mergeClosureSnapshot(null,environment.closures);
  return {...data,brief:{origin,destination,departure,duration,route,environment,weather:forecastWindow(environment.weather,departure,duration),closures:relevantClosures(route,environment.closures,departure,duration),sections:environmentAlong(route,grid),createdAt:new Date()}};
}

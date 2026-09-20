import {localInput,parseDeparture} from './journey-model.js';

export const PLACE_SPECS=[['reitz',863211313,'Reitz Union'],['marston',150860048,'Marston Science Library'],['turlington',150684197,'Turlington Hall'],['smathers',154223625,'Smathers Library'],['hub',150926632,'The Hub'],['newell',150926630,'Newell Hall']];
export const DURATIONS=[15,30,45,60,90,120];
export const SAVED_KEY='fieldlens.journey.saved.v1';
const DRAFT_KEY='reallens.trip.v1', PENDING_KEY='reallens.confirmed-trip.v1';
export function defaultTrip(now=Date.now()){
  const date=new Date(now+3600000);date.setUTCMinutes(0,0,0);
  return {origin:'reitz',destination:'marston',departure:localInput(date),duration:30};
}
export function validPlaces(value){
  return !!value&&PLACE_SPECS.some(p=>p[0]===value.origin)&&PLACE_SPECS.some(p=>p[0]===value.destination)&&value.origin!==value.destination&&DURATIONS.includes(value.duration);
}
export function tripError(value,now=Date.now()){
  if(!validPlaces(value))return 'Choose different starting and destination places, and an outdoor duration.';
  const date=typeof value.departure==='string'&&value.departure.length<=20?parseDeparture(value.departure):null;
  return !date||date.getTime()<now-60000||date.getTime()>now+6*86400000?'Choose a future departure within six days, in Gainesville time.':'';
}
export function cleanTrip(value){return {origin:value.origin,destination:value.destination,departure:value.departure,duration:value.duration};}
export function readJson(storage,key){try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}}
export function writeJson(storage,key,value){try{storage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function readDraft(storage,now=Date.now()){
  const value=readJson(storage,DRAFT_KEY);
  return validPlaces(value)?{...cleanTrip(value),departure:tripError(value,now)?defaultTrip(now).departure:value.departure}:defaultTrip(now);
}
export function saveDraft(storage,value){return validPlaces(value)&&writeJson(storage,DRAFT_KEY,cleanTrip(value));}
export function queueTrip(storage,value,now=Date.now()){
  if(tripError(value,now))return false;
  return saveDraft(storage,value)&&writeJson(storage,PENDING_KEY,{draft:cleanTrip(value),confirmedAt:now});
}
export function consumeTrip(storage,now=Date.now()){
  const value=readJson(storage,PENDING_KEY);
  try{storage.removeItem(PENDING_KEY);}catch{return null;}
  if(!value||!Number.isFinite(value.confirmedAt)||now-value.confirmedAt<0||now-value.confirmedAt>120000||tripError(value.draft,now))return null;
  return cleanTrip(value.draft);
}

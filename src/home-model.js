export const PREFERENCES_KEY='fieldlens.journey.preferences.v1';

export function readingPreferences(value){
  const p=value&&typeof value==='object'?value:{};
  return {contrast:p.contrast===true,large:p.large===true,detail:p.detail==='short'?'short':'standard',rate:[.85,1,1.15].includes(p.rate)?p.rate:1};
}

const aliases={reitz:['reitz','reitz union'],marston:['marston','marston library','marston science library'],turlington:['turlington','turlington hall'],smathers:['smathers','smathers library'],hub:['hub','the hub'],newell:['newell','newell hall']};
const normalize=value=>String(value??'').trim().replace(/\s+/g,' ').toLowerCase();

// Only resolve a supported place by an exact name or explicit alias. Never guess a route.
export function resolveHomeDestination(value,places){
  const query=normalize(value);
  if(!query)return null;
  const matches=places.filter(place=>normalize(place.name)===query||(aliases[place.id]||[]).includes(query));
  return matches.length===1?matches[0]:null;
}

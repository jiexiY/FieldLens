// Only public, fixed-origin, read-only sources. Never forwards arbitrary URLs.
import {getClosures as closures,plain} from '../server/closures.js';
export {CLOSURE_SOURCE,sanitizeNotices,plain} from '../server/closures.js';
const UA = 'FieldLens environmental journey prototype (https://fieldlens-pi.vercel.app)';
const cache = new Map();
const TTL = 5 * 60 * 1000;
async function json(url) {
  const response = await fetch(url, { headers: { 'User-Agent':UA, Accept:'application/json' }, signal:AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error('Source returned an error');
  return data;
}
async function cached(key, fn) {
  const previous = cache.get(key);
  if (previous && Date.now() - previous.time < TTL) return previous.value;
  const value = await fn();
  if (cache.size > 100) cache.clear();
  cache.set(key, { time:Date.now(), value });
  return value;
}
async function weather(lat, lon) {
  return cached(`weather:${lat},${lon}`, async () => {
    const point = await json(`https://api.weather.gov/points/${lat},${lon}`);
    const hourlyUrl = point.properties?.forecastHourly;
    if (!/^https:\/\/api\.weather\.gov\/gridpoints\/[A-Z]{3}\/\d+,\d+\/forecast\/hourly$/.test(hourlyUrl ?? '')) throw new Error('No validated hourly endpoint');
    const hourly = await json(hourlyUrl);
    if (!Array.isArray(hourly.properties?.periods)) throw new Error('No hourly periods');
    return { status:'available', source:hourlyUrl, pointSource:`https://api.weather.gov/points/${lat},${lon}`, fetchedAt:new Date().toISOString(),
      generatedAt:hourly.properties.generatedAt, updated:hourly.properties.updateTime, periods:hourly.properties.periods.map(p=>({
        start:p.startTime,end:p.endTime,temperature:p.temperature,temperatureUnit:p.temperatureUnit,
        rain:p.probabilityOfPrecipitation?.value ?? null,wind:p.windSpeed,windDirection:p.windDirection,description:p.shortForecast
      })), resolution:'NWS area forecast, approximately 2.5 km grid; not a pavement-condition measurement.' };
  });
}
async function alerts(lat,lon) {
  return cached(`alerts:${lat},${lon}`,async()=>{
    const source = `https://api.weather.gov/alerts/active?point=${lat},${lon}`;
    const data = await json(source);
    if (!Array.isArray(data.features)) throw new Error('No alerts response');
    return { status:'available',source,fetchedAt:new Date().toISOString(),items:data.features.map(f=>({
      event:plain(f.properties.event),headline:plain(f.properties.headline),description:plain(f.properties.description),
      instruction:plain(f.properties.instruction),severity:f.properties.severity,effective:f.properties.effective,expires:f.properties.expires,
      source:f.id?.startsWith('https://api.weather.gov/alerts/') ? f.id : source
    })) };
  });
}
export async function getEnvironment(lat,lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat<29.635 || lat>29.655 || lon< -82.372 || lon> -82.335) throw new Error('Outside campus pilot');
  const tasks = { weather:()=>weather(lat.toFixed(4),lon.toFixed(4)), closures, alerts:()=>alerts(lat.toFixed(4),lon.toFixed(4)) };
  return Object.fromEntries(await Promise.all(Object.entries(tasks).map(async([name,fn])=>{
    try { return [name,await fn()]; }
    catch { return [name,{status:'unavailable',message:'This source could not be refreshed. Conditions are unknown, not clear.',attemptedAt:new Date().toISOString()}]; }
  })));
}
export default async function handler(req,res) {
  if(req.method!=='GET') { res.setHeader('Allow','GET'); res.statusCode=405; return res.end('Method not allowed'); }
  const url=new URL(req.url,'http://localhost');
  const lat=url.searchParams.has('lat') ? Number(url.searchParams.get('lat')) : NaN;
  const lon=url.searchParams.has('lon') ? Number(url.searchParams.get('lon')) : NaN;
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  try { res.end(JSON.stringify(await getEnvironment(lat,lon))); }
  catch { res.statusCode=400;res.end(JSON.stringify({error:'Choose a location within the UF campus pilot.'})); }
}

import {localInput,parseDeparture,formatDate,timeLabel} from './journey-model.js';
import {closureSpeech} from './closure-view.js';

// Deliberately bounded language support. No geocoding, inferred safe routes, or LLM facts.
export const VOICE_PLACES = {
  reitz: ['reitz union','reitz'], marston: ['marston science library','marston library','marston'],
  turlington: ['turlington hall','turlington'], smathers: ['smathers library','smathers'],
  hub: ['the hub','hub'], newell: ['newell hall','newell']
};
export const PLACE_NAMES = {reitz:'Reitz Union',marston:'Marston Science Library',turlington:'Turlington Hall',smathers:'Smathers Library',hub:'The Hub',newell:'Newell Hall'};
export const VOICE_HELP = 'Say “from Reitz Union to Marston tomorrow at eight A M.” I will ask you to confirm before updating the form. You can also say “read briefing”, “explain rain”, “wind”, “closures”, “surroundings”, “repeat”, “cancel”, or “stop”. Tap Talk each time; I do not keep listening.';
const numberWords={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,ninety:90};
export function normalizeSpeech(value) {
  return String(value??'').slice(0,1000).toLowerCase().replace(/[’']/g,'').replace(/(\d)\s*([ap])\s*\.?\s*m\b\.?/g,'$1 $2m').replace(/\ba\s*\.?\s*m\b\.?/g,'am').replace(/\bp\s*\.?\s*m\b\.?/g,'pm').replace(/[^a-z0-9:\s-]/g,' ').replace(/\s+/g,' ').trim();
}
function numeric(text){
  let s=text.replace(/\b(twenty|thirty|forty|fifty)[ -](one|two|three|four|five|six|seven|eight|nine)\b/g,(_,a,b)=>String(numberWords[a]+numberWords[b]));
  return s.replace(/\b[a-z]+\b/g,w=>Object.hasOwn(numberWords,w)?String(numberWords[w]):w);
}
function place(value){const s=value.trim().replace(/^the /,'');return Object.entries(VOICE_PLACES).find(([,aliases])=>aliases.some(a=>a.replace(/^the /,'')===s))?.[0]??null;}
function dayFrom(text,now){
  if(/\b(yesterday|last|next week|next month)\b/.test(text))return {error:'Choose today, tomorrow, or a weekday within the next six days.'};
  const weekdays=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const today=localInput(now).slice(0,10),anchor=new Date(`${today}T12:00:00Z`);
  const dates=[];let remaining=text;
  if(/\bday after tomorrow\b/.test(text)){dates.push(2);remaining=remaining.replace(/day after tomorrow/g,'');}
  if(/\btomorrow\b/.test(remaining))dates.push(1);
  if(/\btoday\b/.test(remaining))dates.push(0);
  weekdays.forEach((w,i)=>{if(new RegExp(`\\b${w}\\b`).test(remaining)){const delta=(i-anchor.getUTCDay()+7)%7;dates.push(delta===0&&new RegExp(`next ${w}`).test(remaining)?7:delta);}});
  if(new Set(dates).size>1)return {error:'I heard more than one day. Please say just one day.'};
  if(!dates.length)return {};
  if(dates[0]>6)return {error:'That day is outside the six-day pilot window.'};
  anchor.setUTCDate(anchor.getUTCDate()+dates[0]);return {date:anchor.toISOString().slice(0,10)};
}
function timeFrom(text,previous){
  if(/\b(half|quarter|past|until|between|or)\b/.test(text))return {error:'Please give one exact time, such as “at eight thirty A M”. I do not interpret time ranges or fractional hours.'};
  if(/\bnoon\b/.test(text)&&/\bmidnight\b/.test(text))return {error:'Please give one departure time.'};
  if(/\bnoon\b/.test(text))return {hour:12,minute:0,meridiem:'pm'};
  if(/\bmidnight\b/.test(text))return {hour:12,minute:0,meridiem:'am'};
  let s=numeric(text).replace(/\boclock\b/g,'').replace(/\boh (?=\d\b)/g,'0').replace(/\b0 (?=\d\b)/g,'');
  if([...s.matchAll(/\b\d{1,2}(?::\d{2}|\s+\d{1,2})?\s*(?:am|pm)\b/g)].length>1)return {error:'Please give one departure time.'};
  const marker=/\b(am|pm|morning|afternoon|evening|night)\b/g;
  const markers=[...s.matchAll(marker)].map(m=>['am','morning'].includes(m[1])?'am':'pm');
  if(new Set(markers).size>1)return {error:'I heard both morning and evening. Please give one time with A M or P M.'};
  const matches=[...s.matchAll(/\bat\s+(\d{1,2})(?::(\d{2})|\s+(\d{1,2}))?(?:\s*(am|pm))?\b/g)];
  if(matches.length>1)return {error:'Please give one departure time.'};
  const m=matches[0]??s.match(/^\s*(\d{1,2})(?::(\d{2})|\s+(\d{1,2}))?(?:\s*(am|pm))?(?:\s+(?:in the )?(?:morning|afternoon|evening|night))?\s*$/)??s.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if(!m){if(markers.length&&previous?.hour)return {...previous,meridiem:markers[0]};return {};}
  const hour=Number(m[1]),minute=Number(m[2]??(/^[0-9]+$/.test(m[3]??'')?m[3]:0));
  const meridiem=markers[0]??m[4]??(['am','pm'].includes(m[3])?m[3]:null);
  if(hour<1||hour>12||minute<0||minute>59)return {error:'Please use a time from 1 to 12, with valid minutes and A M or P M. You can use the form for a 24-hour time.'};
  return {hour,minute,meridiem};
}
export function draftStatus(draft,now=new Date()){
  if(!draft.origin)return {ready:false,prompt:'Where are you starting? Say one of the six campus places, such as Reitz Union.'};
  if(!draft.destination)return {ready:false,prompt:'Where are you going? Say Marston, Smathers, Turlington, the Hub, Newell, or Reitz Union.'};
  if(draft.origin===draft.destination)return {ready:false,prompt:'Start and destination are the same. Say “to” followed by a different campus place.'};
  if(!draft.date)return {ready:false,prompt:'Which day? Say today, tomorrow, or a weekday within the next six days.'};
  if(!draft.time)return {ready:false,prompt:'What time are you leaving? Say, for example, “at eight thirty A M”.'};
  if(!draft.time.meridiem)return {ready:false,prompt:`Did you mean ${draft.time.hour}${draft.time.minute?`:${String(draft.time.minute).padStart(2,'0')}`:''} A M or P M? Say A M or P M.`};
  const hour=draft.time.hour%12+(draft.time.meridiem==='pm'?12:0);
  const departure=`${draft.date}T${String(hour).padStart(2,'0')}:${String(draft.time.minute).padStart(2,'0')}`,date=parseDeparture(departure);
  if(!date||date<now||date>now.getTime()+6*86400000)return {ready:false,prompt:'That departure is in the past, invalid, or more than six days away. Please give a future day and time.'};
  const summary=`${PLACE_NAMES[draft.origin]} to ${PLACE_NAMES[draft.destination]}, ${formatDate(date)} at ${timeLabel(date)} Eastern, with ${draft.duration} minutes outdoors${draft.durationFromForm?' using the duration currently in the form':''}.`;
  return {ready:true,departure,summary,prompt:`I understood: ${summary} Is that correct? Choose Confirm trip, or tap Talk and say “confirm”. Nothing in your form has changed yet.`};
}
export function parseVoiceIntent(value,{pending=null,duration=30,now=new Date()}={}){
  const text=normalizeSpeech(value).replace(/^please /,'').replace(/ please$/,'');
  if(!text)return {kind:'unknown',message:'I did not get a request. Try again or type it below.'};
  if(/\b(pst|pdt|cst|cdt|mst|mdt|utc|gmt|pacific|central|mountain)\b/.test(text))return {kind:'unknown',message:'Please give the time in Gainesville Eastern time. I do not convert spoken time zones.'};
  if(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b|\d{4}-\d\d-\d\d/.test(text))return {kind:'unknown',message:'For voice input, say today, tomorrow, or a weekday within six days. Use the form for a calendar date.'};
  if(/\b(not|instead of|rather than)\b/.test(text))return {kind:'unknown',message:'To avoid reversing your correction, please restate the trip using “from” and “to”, followed by the day and time.'};
  const commands={stop:/^(stop|stop listening|stop talking|stop audio|be quiet)$/,cancel:/^(cancel|cancel trip|never mind|nevermind|no|start over)$/,confirm:/^(confirm|confirm trip|yes|yes confirm|thats correct)$/,repeat:/^(repeat|repeat that|say that again)$/,help:/^(help|what can i say|commands)$/,briefing:/^(read briefing|read my briefing|read the briefing|listen to briefing|briefing)$/,rain:/^(rain|rain forecast|explain rain|explain the rain forecast|will it rain|what about rain)$/,weather:/^(weather|forecast|weather forecast|explain weather|explain the weather|what is the weather|whats the weather)$/,wind:/^(wind|explain wind|what about wind|how windy is it)$/,closures:/^(closures|construction|explain closures|what about closures|are there closures)$/,surroundings:/^(surroundings|vegetation|explain surroundings|what are the surroundings)$/,unknowns:/^(unknowns|limitations|what is unknown|what cant you verify|is it safe|is this safe)$/};
  for(const [command,pattern] of Object.entries(commands))if(pattern.test(text))return {kind:'command',command};
  // Questions with unrecognized qualifications must not fall through to trip parsing.
  if(/^(what|whats|will|is|are|how|can|could|should|tell|explain)\b/.test(text))return {kind:'unknown',message:'I answer the listed questions for your prepared journey only. Try “explain rain”, “closures”, or “surroundings”. To change the time, describe a new trip.'};
  const draft=pending?structuredClone(pending):{origin:null,destination:null,date:null,time:null,duration:[15,30,45,60,90,120].includes(Number(duration))?Number(duration):30,durationFromForm:true};
  let recognized=false;
  const from=text.match(/\bfrom\s+(.+?)(?=\s+(?:to|today|tomorrow|at|on|for|this|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|$)/);
  const to=text.match(/\bto\s+(.+?)(?=\s+(?:today|tomorrow|at|on|for|this|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|$)/);
  // A new complete route starts a fresh proposal; do not inherit a hidden old time.
  if(from&&to){draft.date=null;draft.time=null;}
  for(const [key,m] of [['origin',from],['destination',to]])if(m){const id=place(m[1]);if(!id)return {kind:'unknown',message:`I could not identify that ${key==='origin'?'starting place':'destination'}. This pilot only supports Reitz Union, Marston, Smathers, Turlington, the Hub, and Newell. Please restate the trip.`};draft[key]=id;recognized=true;}
  const bare=place(text);if(bare){draft[!draft.origin?'origin':'destination']=bare;recognized=true;}
  const day=dayFrom(text,now);if(day.error)return {kind:'unknown',message:day.error};if(day.date){draft.date=day.date;recognized=true;}
  const time=timeFrom(text,draft.time);if(time.error)return {kind:'unknown',message:time.error};if(time.hour){draft.time=time;recognized=true;}
  const dur=numeric(text).match(/\bfor\s+(\d+)\s*(minutes?|hours?)\b/);
  if(dur){const mins=Number(dur[1])*(dur[2].startsWith('hour')?60:1);if(![15,30,45,60,90,120].includes(mins))return {kind:'unknown',message:'Choose 15, 30, 45, 60, 90, or 120 minutes outdoors.'};draft.duration=mins;draft.durationFromForm=false;recognized=true;}
  if(!recognized)return {kind:'unknown',message:'I could not understand that request. Use one of the six campus places and today, tomorrow, or a weekday; give the time with A M or P M. You can always use the form.'};
  return {kind:'trip',draft,...draftStatus(draft,now)};
}

export function answerFromBrief(command,b,now=new Date()){
  if(!b)return 'Prepare a journey briefing first. Tell me your starting place, destination, day, and time, or use the form.';
  if((command!=='closures'&&now-new Date(b.createdAt)>15*60000)||new Date(b.departure)<now)return 'This briefing is more than 15 minutes old or its departure has passed. Refresh it with a future departure before asking about conditions.';
  const intro=`For ${b.origin.name} to ${b.destination.name}, ${formatDate(b.departure)} at ${timeLabel(b.departure)} Eastern: `;
  const w=b.weather;
  if(['rain','weather','wind'].includes(command)){
    if(w.status!=='available')return intro+'The forecast is unavailable or does not cover your selected time. I cannot tell you the conditions. Check the official forecast or refresh the briefing.';
    if(command==='wind')return intro+`Wind: ${w.wind||'unavailable'}. This is an area forecast, not a measurement of gusts along the path.`;
    const rain=w.rain===null?'The rain probability is unknown.':`The highest hourly rain chance during your outdoor window is ${w.rain} percent. That is not the probability for the entire trip, and it does not tell us whether a path is wet, slippery, or flooded.`;
    if(command==='rain')return intro+rain+(w.rain>=30?' Consider the rain protection and footwear you normally prefer.':'');
    return intro+`${w.description||'Weather description unavailable'}. ${rain} Air temperature: ${Number.isFinite(w.low)?`${w.low===w.high?w.low:`${w.low} to ${w.high}`} degrees Fahrenheit`:'unknown'}. Wind: ${w.wind||'unknown'}.`;
  }
  if(command==='closures')return intro+closureSpeech(b,now);
  if(command==='surroundings')return intro+`The satellite vegetation information is from September 22, 2024. It is historical context, not current shade or a path inspection. ${b.sections.some(s=>s.steps)?'Steps are tagged on the mapped study path.':'No steps were identified in the available path tags; that does not establish step-free access.'} ${b.sections.some(s=>s.crossings)?'Crossings are mapped, but their accessibility and conditions are not verified.':''} Building entrances and the connections to the mapped path are not verified.`;
  return 'I cannot establish whether a journey is safe. Current obstacles, puddles, pavement damage, safe crossings, shade, and entrance access are not verified. FieldLens is a preparation tool, not navigation or obstacle detection. It does not recommend modifying mobility equipment.';
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultTrip,validPlaces,tripError,readDraft,queueTrip,consumeTrip} from '../src/trip-state.js';
const now=Date.parse('2026-09-20T14:00:00Z');
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),data};};
test('Trip handoff stores only inputs and is consumed once',()=>{
 const store=storage(),draft=defaultTrip(now);
 assert.equal(queueTrip(store,{...draft,audio:'private',brief:{weather:'invented'}},now),true);
 assert.deepEqual(consumeTrip(store,now),draft);
 assert.equal(consumeTrip(store,now),null);
 assert.doesNotMatch([...store.data.values()].join(''),/private|invented/);
});
test('Unconfirmed, expired and future handoffs cannot auto-request conditions',()=>{
 for(const elapsed of [120001,-1]){const store=storage();queueTrip(store,defaultTrip(now),now);assert.equal(consumeTrip(store,now+elapsed),null);}
 assert.equal(consumeTrip(storage(),now),null);
});
test('Trip validation rejects unsupported places, identical places and invalid duration or time',()=>{
 const d=defaultTrip(now);
 for(const change of [{origin:'alice'},{destination:d.origin},{duration:31},{departure:'garbage'},{departure:'2020-01-01T10:00'}])assert.ok(tripError({...d,...change},now));
 assert.equal(validPlaces(d),true);assert.equal(tripError(d,now),'');
});
test('Saved draft refreshes expired departure and denied storage fails safely',()=>{
 const store=storage(),d=defaultTrip(now);queueTrip(store,d,now);
 assert.equal(readDraft(store,now+86400000).departure,defaultTrip(now+86400000).departure);
 const denied={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};
 assert.deepEqual(readDraft(denied,now),d);assert.equal(queueTrip(denied,d,now),false);assert.equal(consumeTrip(denied,now),null);
});
const page=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('White welcome has a native named link and no timer, microphone or autoplay',()=>{
 const html=page('demo.html');
 assert.match(html,/href="\/welcome" aria-labelledby="demo-title demo-action" aria-describedby="demo-hint"/);
 assert.equal((html.match(/<a /g)||[]).length,1);
 assert.doesNotMatch(html,/setTimeout|autoplay|getUserMedia/);
});
test('Distinct feature pages mount only their own entry module and main heading',()=>{
 for(const feature of ['plan','conditions','talk','bus']){
  const html=page(feature+'.html');assert.equal((html.match(/<h1>/g)||[]).length,1);
  assert.ok(html.includes('/src/'+feature+'.js'));
  for(const other of ['plan','conditions','talk','bus'].filter(v=>v!==feature))assert.ok(!html.includes('/src/'+other+'.js'));
 }
});
test('Sources name actual environmental method and non-use of optional packages',()=>{
 const html=page('sources.html');
 for(const term of ['Chapter 3, Lesson 3','September 22, 2024','single-scene adaptation','GLOBE Observer and the geoemerge package are not used','campus-vegetation.json'])assert.ok(html.includes(term));
});

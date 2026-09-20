import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveHomeDestination,readingPreferences} from '../src/home-model.js';
const places=[{id:'marston',name:'Marston Science Library'},{id:'hub',name:'The Hub'},{id:'reitz',name:'Reitz Union'}];
test('Home search resolves exact supported names and explicit aliases',()=>{assert.equal(resolveHomeDestination('  MARSTON   science Library ',places).id,'marston');assert.equal(resolveHomeDestination('marston',places).id,'marston');assert.equal(resolveHomeDestination('hub',places).id,'hub');});
test('Home search never guesses unknown, partial, unavailable, or ambiguous destinations',()=>{for(const value of ['',null,'library','marst','Newell Hall','Lake Alice','<script>'])assert.equal(resolveHomeDestination(value,places),null);assert.equal(resolveHomeDestination('reitz',[...places,{id:'reitz',name:'Duplicate'}]),null);});
test('Reading preferences share safe defaults across pages',()=>{assert.deepEqual(readingPreferences(null),{contrast:false,large:false,detail:'standard',rate:1});assert.deepEqual(readingPreferences({contrast:'true',large:1,detail:'invented',rate:100}),readingPreferences(null));});
test('Landing changes preserve valid speech and detail preferences',()=>{assert.deepEqual(readingPreferences({contrast:true,large:true,detail:'short',rate:.85}),{contrast:true,large:true,detail:'short',rate:.85});});
const page=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('Start-screen labels reference visible names and hidden concise descriptions',()=>{
  const html=page('welcome.html');
  assert.ok(html.includes('role="group" aria-label="Home actions"'));
  assert.ok(html.includes('class="sr-only">RealLens home</h1>'));
  for(const id of ['plan','talk','conditions','bus']){
    assert.ok(html.includes('aria-labelledby="'+id+'-label" aria-describedby="'+id+'-hint"'));
    assert.ok(html.includes('id="'+id+'-label"'));
    assert.ok(html.includes('id="'+id+'-hint" hidden>'));
  }
});
test('Home actions navigate to separate pages, not sections',()=>{
  const html=page('welcome.html');
  for(const name of ['plan','talk','conditions','bus'])assert.ok(html.includes('href="/'+name+'"'));
  assert.doesNotMatch(html,/href="\/\#/);
});
test('App entry has exactly four static action links and no promotional chrome',()=>{
  const html=page('welcome.html');
  assert.equal((html.match(/class="welcome-tile /g)||[]).length,4);
  assert.equal((html.match(/<a\s/g)||[]).length,4);
  for(const label of ['Plan a trip','Talk to RealLens','Check conditions','Bus alerts'])assert.ok(html.includes(label));
  assert.doesNotMatch(html,/<header|<footer|<nav|<dialog|<p[\s>]/);
  assert.ok(html.includes('id="welcome-title"')&&html.includes('aria-labelledby="welcome-title"'));
});
test('Start screen only reads existing preferences and never starts data or voice',()=>{
  const script=page('src/welcome.js');
  assert.doesNotMatch(script,/fetch\(|getUserMedia|speechSynthesis|localStorage.setItem|setInterval/);
  assert.match(script,/readingPreferences/);
  assert.match(page('src/welcome.css'),/min-height:100dvh/);
});
test('Root product intro has icon demo links and honest boundaries',()=>{
  const html=page('index.html');
  assert.equal((html.match(/class="primary-link" href="\/demo"/g)||[]).length,2);
  assert.ok(html.includes('Try it out'));
  assert.equal(html,page('project.html'));
  for(const value of ['National Weather Service','UF Campus Closures','Gainesville RTS','Sentinel-2 + EMERGE','not a current conditions report','not yet been evaluated','Not live bus positions','September 22, 2024'])assert.ok(html.includes(value),value);
  assert.doesNotMatch(html,/src="\/src\/journey.js"/);
  assert.ok(html.includes('rel="canonical"'));
});
test('Both production and local builds resolve separate product and feature pages',()=>{
  const rewrites=JSON.parse(page('vercel.json')).rewrites;
  for(const route of ['welcome','project','demo','plan','conditions','talk','bus','sources','settings']){
    assert.ok(rewrites.some(r=>r.source==='/'+route&&r.destination==='/'+route+'.html'));
    assert.ok(page('vite.config.js').includes("'"+route+"'"));
    assert.match(page(route+'.html'),/<title>[^<]*RealLens/);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveHomeDestination,readingPreferences} from '../src/home-model.js';
const places=[{id:'marston',name:'Marston Science Library'},{id:'hub',name:'The Hub'},{id:'reitz',name:'Reitz Union'}];
test('Home search resolves exact supported names and explicit aliases',()=>{assert.equal(resolveHomeDestination('  MARSTON   science Library ',places).id,'marston');assert.equal(resolveHomeDestination('marston',places).id,'marston');assert.equal(resolveHomeDestination('hub',places).id,'hub');});
test('Home search never guesses unknown, partial, unavailable, or ambiguous destinations',()=>{for(const value of ['',null,'library','marst','Newell Hall','Lake Alice','<script>'])assert.equal(resolveHomeDestination(value,places),null);assert.equal(resolveHomeDestination('reitz',[...places,{id:'reitz',name:'Duplicate'}]),null);});
test('Reading preferences share safe defaults across pages',()=>{assert.deepEqual(readingPreferences(null),{contrast:false,large:false,detail:'standard',rate:1});assert.deepEqual(readingPreferences({contrast:'true',large:1,detail:'invented',rate:100}),readingPreferences(null));});
test('Landing changes preserve valid speech and detail preferences',()=>{assert.deepEqual(readingPreferences({contrast:true,large:true,detail:'short',rate:.85}),{contrast:true,large:true,detail:'short',rate:.85});});

import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,views,observations} from '../src/study.js';

test('opening a scene photograph preserves the selected viewpoint',()=>{
  const state={...initialState(),view:2,fly:true};
  const photo=transition(state,{type:'PHOTO',index:1});
  assert.equal(photo.mode,'scene');
  assert.equal(photo.view,2);
  assert.equal(photo.activePhoto,1);
  assert.equal(photo.fly,false);
  const peek=transition(photo,{type:'PEEK'});
  assert.equal(peek.peek,true);
  assert.equal(peek.activePhoto,1);
  const back=transition(peek,{type:'BACK'});
  assert.equal(back.activePhoto,null);
  assert.equal(back.peek,false);
  assert.equal(back.view,2);
  assert.equal(state.activePhoto,null,'input is not mutated');
});

test('source-photo mode remembers the last photograph and disallows scene peeking',()=>{
  const selected=transition(initialState(),{type:'PHOTO',index:3});
  const mode=transition(selected,{type:'MODE',mode:'photos'});
  assert.equal(mode.activePhoto,3);
  const next=transition(mode,{type:'PHOTO',index:0});
  assert.equal(next.mode,'photos');
  assert.equal(transition(next,{type:'PEEK'}).peek,false);
  const scene=transition(next,{type:'MODE',mode:'scene'});
  assert.equal(scene.activePhoto,null);
  assert.equal(transition(scene,{type:'MODE',mode:'photos'}).activePhoto,0);
});

test('view selection leaves overlays and map state cleanly',()=>{
  const state={...initialState(),mode:'map',locatedPhoto:2,peek:true,inspected:{x:4},fly:true,panel:'log'};
  const selected=transition(state,{type:'VIEW',index:3});
  assert.equal(selected.mode,'scene');
  assert.equal(selected.view,3);
  assert.equal(selected.activePhoto,null);
  assert.equal(selected.locatedPhoto,null);
  assert.equal(selected.inspected,null);
  assert.equal(selected.peek,false);
  assert.equal(selected.fly,false);
  assert.equal(selected.panel,'log','evidence tab stays independent');
});

test('each observation opens its own instrument and exact date without comparison carryover',()=>{
  observations.forEach((event,index)=>{
    const state=transition({...initialState(),compare:true,locatedPhoto:2},{type:'EVENT',index});
    assert.equal(state.event,index);
    assert.equal(state.panel,'log');
    assert.equal(state.mode,event.mode);
    assert.equal(state.activePhoto,event.photo??null);
    assert.equal(state.locatedPhoto,null);
    assert.equal(state.compare,false);
    if(event.layer)assert.equal(state.layer,event.layer);
    if(event.season)assert.equal(state.season,event.season);
  });
});

test('camera views have usable positions and valid evidence references',()=>{
  assert.equal(views.length,4);
  for(const view of views){
    for(const key of ['camera','target','position']){
      assert.equal(view[key].length,3);
      assert.ok(view[key].every(Number.isFinite));
    }
    assert.ok(view.photo>=0&&view.photo<4);
    assert.ok(['ndvi','ndwi','rgb'].includes(view.layer));
  }
});

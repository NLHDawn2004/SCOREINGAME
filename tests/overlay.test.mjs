import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateOverlayState,overlayRowHeight,isCprReached} from '../dist/overlay-state.mjs';
test('overlay accepts presentation data only and supports unknown points',()=>{const s=validateOverlayState({teams:[{name:'A',pts:10,elims:null,states:['alive','knocked','dead','alive'],logo:null}]});assert.equal(s.teams[0].name,'A');assert.equal(s.teams[0].states.length,4);assert.throws(()=>validateOverlayState({teams:[{name:'A',pts:10,elims:1,states:['bad'],logo:null}]}));});
test('overlay dimensions fit twelve and fifteen teams within 350x730 layout',()=>{assert.equal(overlayRowHeight(12),58);assert.equal(overlayRowHeight(15)*15+34,730);});

test('requested overlay dimensions survive validation and keep all rows inside the frame',()=>{
 const size={width:520,height:960};
 assert.deepEqual(validateOverlayState({teams:[],size}).size,size);
 assert.throws(()=>validateOverlayState({teams:[],size:{width:1921,height:960}}));
 assert.ok(overlayRowHeight(15,960)*15+45<=960);
 assert.ok(overlayRowHeight(64,200)*64+16<=200);
});

test('CPR marks teams at or above the chosen points and keeps the mark in the exported state',()=>{
 for(const [pts,threshold,expected] of [[69,70,false],[70,70,true],[90,70,true],[null,70,false],[90,null,false]]){
  const cpr=isCprReached(pts,threshold);
  assert.equal(cpr,expected);
  assert.equal(validateOverlayState({teams:[{name:'A',pts,elims:0,cpr,logo:null}]}).teams[0].cpr,expected);
 }
});

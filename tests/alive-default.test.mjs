import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aliveBars} from '../dist/alive-bars.mjs';
test('an unbound team starts with four yellow bars by explicit user default',()=>{
 assert.deepEqual(aliveBars({alive:null,players:[]}),Array(4).fill('alive'));
});
test('known death and knock replace the corresponding yellow bars',()=>{
 assert.deepEqual(aliveBars({alive:3,players:[{status:'alive',alive:true},{status:'knocked',alive:true},{status:'dead',alive:false},{status:'alive',alive:true}]}),['alive','knocked','dead','alive']);
});
test('a roster still loading keeps a four-player default, without losing known states',()=>{
 assert.deepEqual(aliveBars({alive:1,players:[{status:'knocked',alive:true},{status:'dead',alive:false}]}),['knocked','dead','alive','alive']);
});

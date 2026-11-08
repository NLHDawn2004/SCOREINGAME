import {test} from 'node:test';
import assert from 'node:assert/strict';
import {overrideMatchScore,teamEditIdentity,cleanDisplayName} from '../dist/team-presentation.mjs';
const team=(name,uid)=>({name,players:uid?[{userId:uid}]:[],scoreId:1});const snap=(teams,start='match1')=>({teams,start});
test('unique team correction survives score/rank changes and changing match IDs',()=>{const t=team('Wrong','11'),s=snap([t]);const r={...teamEditIdentity(t,s),displayName:'Correct'};assert.ok(overrideMatchScore(r,{...t,id:'total:9',pts:99},s)>0);assert.ok(overrideMatchScore(r,{...t,players:[{userId:'11'}],scoreId:8},snap([t],'match2'))>0);assert.equal(t.name,'Wrong');});
test('duplicate names never apply one team correction to another UID roster',()=>{const a=team('TTE','11'),b=team('TTE','22'),s=snap([a,b]);const r=teamEditIdentity(a,s);assert.ok(overrideMatchScore(r,a,s)>0);assert.equal(overrideMatchScore(r,b,s),0);});
test('unbound duplicate uses same-match reference until UID is known',()=>{const a=team('TTE'),b={...team('TTE'),scoreId:2},s=snap([a,b]);const r=teamEditIdentity(a,s);assert.ok(overrideMatchScore(r,a,s)>0);assert.equal(overrideMatchScore(r,b,s),0);assert.equal(overrideMatchScore(r,a,snap([a,b],'next')),0);});
test('cumulative and individual view share a correction via roster UID or source reference',()=>{const a=team('A','11'),s=snap([a]);const r=teamEditIdentity(a,s);const total={name:'A',duplicate:false,players:[],identityUids:['11'],sourceRefs:[{start:'match1',scoreId:1}]};assert.ok(overrideMatchScore(r,total,snap([total],'total'))>0);});
test('trim display name and reject empty or excessive names',()=>{assert.equal(cleanDisplayName('  Đội Mới  '),'Đội Mới');assert.throws(()=>cleanDisplayName(' '));assert.throws(()=>cleanDisplayName('x'.repeat(81)));});

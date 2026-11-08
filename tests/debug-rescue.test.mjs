import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LogParser} from '../dist/parser.mjs';
const l=(s,f=1)=>`[2026-11-03 15:17:30.807][1][${f}] ${s}\n`;
const make=()=>{const p=new LogParser();p.feed(l('Join Match Result, ERR_NONE')+l('[UIModelSpectator] AddPlayer id2,nameVictim,gsTeam1')+l('[UIModelSpectator] AddPlayer id1,nameHelper,gsTeam1')+l("Player '2' Knock Down, by '3'"));return p;};
const status=p=>p.current().players.get('2').status;
test('debug rescue target and successful completion clear red immediately across chunks',()=>{
 const p=make();p.feed(l('SyncAssistedDuringBeRescured pID 2 start True',2)+l('OnSyncAssistRescure: assistPlayer 1 isSuccess True',2));assert.equal(status(p),'knocked');
 p.feed(l('SyncAssistedDuringBeRescured pID 2 start False',3));assert.equal(status(p),'knocked');const revision=p.revision;
 p.feed(l('OnSyncAssistRescure: assistPlayer 1 isSuccess True',3));assert.equal(status(p),'alive');assert.ok(p.revision>revision);
 p.feed(l("Player '2' Knock Down, by '3'",4)+l('OnSyncAssistRescure: assistPlayer 1 isSuccess True',5));assert.equal(status(p),'knocked');
});
test('cancelled, unrelated-frame or helper-only rescue never clears a victim',()=>{
 for(const [success,frame] of [['False',3],['True',4]]){const p=make();p.feed(l('SyncAssistedDuringBeRescured pID 2 start False',3)+l(`OnSyncAssistRescure: assistPlayer 1 isSuccess ${success}`,frame));assert.equal(status(p),'knocked');}
});
test('rescue completion never revives a dead victim',()=>{const p=make();p.feed(l('Player 2 Dead, killed by 3',2)+l('SyncAssistedDuringBeRescured pID 2 start False',3)+l('OnSyncAssistRescure: assistPlayer 1 isSuccess True',3));assert.equal(status(p),'dead');});

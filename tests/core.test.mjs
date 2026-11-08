import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LogParser} from '../dist/parser.mjs';
import {FileTailer} from '../dist/tailer.mjs';
const line=(s,t='20:00:00.000')=>`[2026-10-25 ${t}][1][1] ${s}\n`;
const start=()=>line('Join Match Result, ERR_NONE');
const add=(id,name,team)=>line(`[UIModelSpectator] AddPlayer id${id},name${name},gsTeam${team}`);
test('different team namespaces are never silently joined',()=>{
 const p=new LogParser();p.feed(start()+add(1,'Một',12)+line('OnTeamScoreInited -> TeamName: EME TeamID: 4'));
 assert.equal(p.snapshot().teams[0].name,'Đội GS12');assert.equal(p.snapshot().teams[0].mapping,'unknown');
 p.setMapping(0,12,4);assert.equal(p.snapshot().teams[0].name,'EME');
});
test('death/revive and duplicate events preserve correct alive and kills',()=>{
 const p=new LogParser();p.feed(start()+add(1,'A',12)+add(2,'B',13));
 const death=line('Player 2 Dead, killed by 1');p.feed(death+death+add(2,'B',13));
 assert.equal(p.snapshot().teams.find(t=>t.id===12).elims,1);
 assert.equal(p.snapshot().teams.find(t=>t.id===13).alive,0);
 p.feed(line('NotifyPlayerEnterPendingRevive -> 2'));assert.equal(p.snapshot().teams.find(t=>t.id===13).alive,0);
 p.feed(line('Revive Player 2, revivePosition=(0,0,0)')+line('Player 2 Dead, killed by 1','20:00:01.000'));
 assert.equal(p.snapshot().teams.find(t=>t.id===12).elims,2);
});
test('a unique score-increase/death pair links a one-kill team immediately',()=>{
 const p=new LogParser();p.feed(start()+add(1,'A',12)+add(2,'B',13)+line('OnTeamScoreInited -> TeamName: EME TeamID: 4'));
 p.feed(line('OnTeamScoreChanged -> TeamID: 4 TeamScore: 1')+line('Player 2 Dead, killed by 1'));
 assert.equal(p.snapshot().teams.find(t=>t.id===12).mapping,'inferred');
 p.feed(line('Revive Player 2, revivePosition=(0,0,0)')+line('OnTeamScoreChanged -> TeamID: 4 TeamScore: 2','20:00:01.000')+line('Player 2 Dead, killed by 1','20:00:01.001'));
 assert.equal(p.snapshot().teams.find(t=>t.id===12).name,'EME');
 assert.equal(p.snapshot().teams.find(t=>t.id===12).mapping,'inferred');
});
test('simultaneous increases from multiple teams never guess a first-kill mapping',()=>{
 const p=new LogParser();p.feed(start()+add(1,'A',12)+add(2,'B',13)+line('OnTeamScoreInited -> TeamName: EME TeamID: 4'));
 p.feed(line('OnTeamScoreChanged -> TeamID: 4 TeamScore: 1')+line('OnTeamScoreChanged -> TeamID: 5 TeamScore: 1')+line('Player 2 Dead, killed by 1'));
 assert.equal(p.snapshot().teams.find(t=>t.id===12).mapping,'unknown');
});
test('an increase in a different game frame cannot bind an unrelated death',()=>{
 const p=new LogParser();p.feed(start()+add(1,'A',12)+add(2,'B',13));
 p.feed(line('OnTeamScoreChanged -> TeamID: 4 TeamScore: 1')+line('Player 2 Dead, killed by 1').replace('][1][1]','][1][2]'));
 assert.equal(p.snapshot().teams.find(t=>t.id===12).mapping,'unknown');
});
test('new matches reset player states and repeated init does not split matches',()=>{
 const p=new LogParser();const init=line('OnTeamScoreInited -> TeamName: X TeamID: 1');
 p.feed(start()+add(1,'A',1)+init+init+start()+add(1,'A',1));
 assert.equal(p.matches.length,2);assert.equal(p.snapshot(0).teams.length,1);assert.equal(p.snapshot().teams[0].elims,0);
});
test('unknown deaths mark partial state; self/environment deaths do not award kills',()=>{
 const p=new LogParser();p.feed(start()+add(1,'A',1)+line('Player 99 Dead, killed by 1'));
 assert.equal(p.snapshot().teams[0].elims,null);assert.equal(p.snapshot().unknownEvents,1);
 p.feed(line('Player 1 Dead, killed by 1'));assert.equal(p.snapshot().teams[0].elims,null);
});
test('partial lines retained; attaching midway does not fabricate totals',()=>{
 const p=new LogParser();const a=add(1,'Đội Việt',1);p.feed(a.slice(0,-3));assert.equal(p.matches.length,0);
 p.feed(a.slice(-3));assert.equal(p.snapshot().teams[0].players[0].name,'Đội Việt');assert.equal(p.snapshot().teams[0].elims,null);
});
test('incremental UTF8 tailing, unchanged reads, truncation and replacement',async()=>{
 const p=new LogParser();const t=new FileTailer(p);const bytes=new TextEncoder().encode(start()+add(1,'Đội Việt',1));
 const split=bytes.indexOf(0xc4)+1;
 const first=new Blob([bytes.slice(0,split)]);await t.poll(first);await t.poll(new Blob([bytes]));
 assert.equal(p.snapshot().teams[0].players[0].name,'Đội Việt');
 assert.equal((await t.poll(new Blob([bytes]))).changed,false);
 await t.poll(new Blob([start()+add(2,'B',2)]));assert.equal(p.snapshot().teams[0].id,2);assert.equal(p.matches.length,1);
 const replacement=new Blob([start()+add(3,'CCCCCCCCCCCCCCCCCC',3)]);assert.equal((await t.poll(replacement)).reset,true);
 assert.equal(p.snapshot().teams[0].id,3);
});
test('read interrupted by file mutation can recover on the next poll',async()=>{
 const p=new LogParser();const t=new FileTailer(p);const chunk=start()+add(1,'A',1)+'x'.repeat(1024*1024);
 const blob=new Blob([chunk]);let calls=0;
 const failing={size:blob.size,slice(a,b){calls++;if(calls===2)return {arrayBuffer(){throw new Error('file changed');}};return blob.slice(a,b);}};
 await assert.rejects(t.poll(failing),/file changed/);
 await t.poll(blob);assert.equal(p.snapshot().teams[0].id,1);assert.equal(p.matches.length,1);
});
test('conflicting mapping evidence never produces a confirmed team name',()=>{
 const p=new LogParser();p.feed(start()+add(1,'A',12)+add(2,'B',13)+line('OnTeamScoreInited -> TeamName: EME TeamID: 4'));
 for(let i=1;i<=2;i++)p.feed(line(`OnTeamScoreChanged -> TeamID: 4 TeamScore: ${i}`,`20:00:0${i}.000`)+line('Player 2 Dead, killed by 1',`20:00:0${i}.001`)+line('Revive Player 2, revivePosition=(0,0,0)',`20:00:0${i}.002`));
 assert.equal(p.snapshot().teams.find(t=>t.id===12).mapping,'inferred');
 p.feed(line('OnTeamScoreChanged -> TeamID: 5 TeamScore: 1','20:00:03.000')+line('Player 2 Dead, killed by 1','20:00:03.001'));
 assert.equal(p.snapshot().teams.find(t=>t.id===12).mapping,'unknown');
});
test('fresh initialization after match end splits even when player IDs are reused',()=>{
 const p=new LogParser();p.feed(start()+add(1,'A',1)+add(2,'B',2)+line('OnTeamScoreInited -> TeamName: OLD TeamID: 1')+line('Player 2 Dead, killed by 1')+line('Server Side Match Result!'));
 const init=line('OnTeamScoreInited -> TeamName: NEW TeamID: 1','20:10:00.000');
 p.feed(init+init+add(1,'C',1)+add(2,'D',2));
 assert.equal(p.matches.length,2);assert.equal(p.snapshot(0).scoreTeams[0].name,'OLD');
 assert.equal(p.snapshot().ended,false);assert.equal(p.snapshot().teams.find(t=>t.id===2).aliveObserved,1);
 assert.equal(p.snapshot().teams[0].elimsObserved,0);assert.equal(p.snapshot().fromStart,false);
});
test('unknown victim lifecycle is retained and kill attribution waits for roster',()=>{
 const p=new LogParser();p.feed(start()+add(1,'A',1)+line('Player 99 Dead, killed by 1')+line('Player 99 Dead, killed by 1','20:00:01.000'));
 assert.equal(p.snapshot().teams[0].elims,null);assert.equal(p.snapshot().teams[0].elimsObserved,0);assert.equal(p.snapshot().deaths,1);
 p.feed(add(99,'Teammate',1));assert.equal(p.snapshot().teams[0].elimsObserved,0);assert.equal(p.snapshot().teams[0].elims,0);
 assert.equal(p.snapshot().teams[0].players.find(p=>p.id==='99').alive,false);
});
test('unknown enemy death is reconciled once roster arrives',()=>{
 const p=new LogParser();p.feed(start()+add(1,'A',1)+line('Player 99 Dead, killed by 1')+add(99,'Enemy',2));
 assert.equal(p.snapshot().teams.find(t=>t.id===1).elims,1);assert.equal(p.snapshot().unknownEvents,0);
});
test('PTS is independent from ELIMS, uses the mapped score and sorts by points',()=>{
 const p=new LogParser();p.feed(start()+add(1,'A',12)+add(2,'B',13)+line('OnTeamScoreInited -> TeamName: A TeamID: 4')+line('OnTeamScoreInited -> TeamName: B TeamID: 5'));
 p.setMapping(0,12,4);p.setMapping(0,13,5);
 assert.equal(p.snapshot().teams[0].pts,0);
 p.feed(line('Player 2 Dead, killed by 1')+line('OnTeamScoreChanged -> TeamID: 4 TeamScore: 11')+line('OnTeamScoreChanged -> TeamID: 5 TeamScore: 32'));
 const s=p.snapshot();assert.equal(s.teams[0].name,'B');assert.equal(s.teams[0].pts,32);assert.equal(s.teams[0].elims,0);
 assert.equal(s.teams[1].pts,11);assert.equal(s.teams[1].elims,1);
 p.feed(line('OnTeamScoreChanged -> TeamID: 5 TeamScore: 0'));assert.equal(p.snapshot().teams[1].pts,0);
 p.feed(start()+add(1,'A',12));assert.equal(p.snapshot().teams[0].pts,null);
});
test('PTS is unknown for an unmapped GS group even with equal numeric score ID',()=>{
 const p=new LogParser();p.feed(start()+add(1,'A',12)+line('OnTeamScoreChanged -> TeamID: 12 TeamScore: 32'));
 assert.equal(p.snapshot().teams[0].pts,null);
});

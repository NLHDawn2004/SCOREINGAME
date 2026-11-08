import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LogParser} from '../dist/parser.mjs';
const line=(s,t='20:00:00.000')=>`[2026-10-25 ${t}][1][1] ${s}\n`;
const start=line('Join Match Result, ERR_NONE');
const add=(id,team)=>line(`[UIModelSpectator] AddPlayer id${id},namePlayer ${id},gsTeam${team}`);
test('official team names display before any kill without guessing a GS mapping',()=>{
 const p=new LogParser();p.feed(start+add(1,12)+add(2,13)+line('OnTeamScoreInited -> TeamName: Đội Rồng TeamID: 4')+line('OnTeamScoreInited -> TeamName: FL TeamID: 5')+line('OnTeamScoreChanged -> TeamID: 4 TeamScore: 32'));
 const s=p.scoreboard();assert.equal(s.teams.length,2);assert.equal(s.teams[0].name,'Đội Rồng');assert.equal(s.teams[0].pts,32);
 assert.equal(s.teams[0].alive,null);assert.equal(s.teams[0].gsTeam,null);assert.equal(s.groups.length,2);
 p.setMapping(0,12,4);const named=p.scoreboard().teams.find(t=>t.scoreId===4);
 assert.equal(named.id,'score:4');assert.equal(named.gsTeam,12);assert.equal(named.alive,1);assert.equal(named.name,'Đội Rồng');
});
test('duplicate official names remain separate and zero-kill teams are not omitted',()=>{
 const p=new LogParser();p.feed(start+line('OnTeamScoreInited -> TeamName: TTE TeamID: 1')+line('OnTeamScoreInited -> TeamName: TTE TeamID: 14'));
 assert.deepEqual(p.scoreboard().teams.map(t=>[t.id,t.name]),[['score:1','TTE'],['score:14','TTE']]);
});
test('knockdown is distinct from death and does not award kills or remove alive players',()=>{
 const p=new LogParser();p.feed(start+add(1,12)+add(2,13));
 p.feed(line("Player '2' Knock Down, by '1'")+line('Teammate 2 Knock Down'));
 let t=p.snapshot().teams.find(t=>t.id===13);assert.equal(t.players[0].status,'knocked');assert.equal(t.alive,1);assert.equal(t.knocked,1);
 assert.equal(p.snapshot().teams.find(t=>t.id===12).elims,0);
 p.feed(line('Player 2 Dead, killed by 1','20:00:01.000'));
 t=p.snapshot().teams.find(t=>t.id===13);assert.equal(t.players[0].status,'dead');assert.equal(t.alive,0);assert.equal(t.knocked,0);
 p.feed(line('Revive Player 2, revivePosition=(0,0,0)','20:00:02.000'));
 t=p.snapshot().teams.find(t=>t.id===13);assert.equal(t.players[0].status,'alive');assert.equal(t.alive,1);
});
test('late roster and stale duplicate knock do not resurrect a dead player',()=>{
 const p=new LogParser();p.feed(start+add(1,12)+line("Player '2' Knock Down, by '1'")+add(2,13));
 assert.equal(p.snapshot().teams.find(t=>t.id===13).players[0].status,'knocked');
 p.feed(line('Player 2 Dead, killed by 1')+line('Teammate 2 Knock Down','20:00:01.000'));
 assert.equal(p.snapshot().teams.find(t=>t.id===13).players[0].status,'dead');
});
test('unlabeled log groups never appear as fabricated team names on the board',()=>{
 const p=new LogParser();p.feed(start+add(1,3));assert.equal(p.scoreboard().teams[0].name,'Chờ tên đội');
});
test('explicit get-up clears knock, but rescue-assistant ID is not a recovered victim',()=>{
 const p=new LogParser();p.feed(start+add(1,12)+add(2,13)+line("Player '2' Knock Down, by '1'"));
 p.feed(line('OnSyncAssistRescure: assistPlayer 1 isSuccess True'));
 assert.equal(p.snapshot().teams.find(t=>t.id===13).players[0].status,'knocked');
 p.feed(line("Player '2' Get Up",'20:00:01.000'));
 assert.equal(p.snapshot().teams.find(t=>t.id===13).players[0].status,'alive');
 assert.equal(p.snapshot().teams.find(t=>t.id===12).elims,0);
});

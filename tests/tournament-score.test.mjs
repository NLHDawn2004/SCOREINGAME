import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LogParser} from '../dist/parser.mjs';
const line=(message,frame=1)=>`[2026-11-08 20:00:00.${String(frame).padStart(3,'0')}][1][${frame}] ${message}\n`;
function setup(){
 const parser=new LogParser({tournament:true});
 parser.feed(line('Join Match Result, ERR_NONE'));
 for(const [scoreId,group] of [[9,1],[8,2],[7,3]]){
  parser.feed(line(`OnTeamScoreInited -> TeamName: Team ${group} TeamID: ${scoreId}`));
  for(let id=1;id<=4;id++)parser.feed(line(`[UIModelSpectator] AddPlayer id${group*10+id},nameP${id},gsTeam${group}`));
  parser.setMapping(0,group,scoreId);
 }
 return parser;
}
const teams=parser=>Object.fromEntries(parser.scoreboard().teams.map(t=>[t.name,[t.pts,t.elims,t.eliminated,t.placement]]));
test('a wipe is visible live and verified finish awards placement once alongside confirmed kills',()=>{
 const parser=setup();
 parser.feed(line('OnTeamScoreChanged -> TeamID: 9 TeamScore: 99'));
 for(let id=31;id<=34;id++)parser.feed(line(`Player ${id} Dead, killed by 11`,2));
 assert.deepEqual(teams(parser)['Team 1'],[4,4,false,null]);
 assert.deepEqual(teams(parser)['Team 3'],[0,0,true,null]);
 parser.feed(line('Revive Player 34, revivePosition=(0,0,0)',3));
 assert.equal(teams(parser)['Team 3'][2],false);
 for(let id=21;id<=24;id++)parser.feed(line(`Player ${id} Dead, killed by 11`,4));
 parser.feed(line('Player 34 Dead, killed by 11',5));
 const end=line('[MatchResult] receive S2C_RUDP_MatchEnd_Res from GS',6);
 parser.feed(end+end);
 assert.deepEqual(teams(parser),{'Team 1':[21,9,false,1],'Team 3':[9,0,true,2],'Team 2':[8,0,true,3]});
});
test('a result with two surviving teams does not award guessed placement',()=>{
 const parser=setup();parser.feed(line('@qhz Server Side Match Result!',2));
 assert.deepEqual(teams(parser)['Team 1'],[0,0,false,null]);
});

import {MatchArchive} from '../dist/match-archive.mjs';
import {cumulativeStandings} from '../dist/standings.mjs';
const source = boards => ({matches:boards,scoreboard:index=>boards[index]});
test('confirmed replay folds into the original archived time even when both old copies were saved',()=>{
 const archive=new MatchArchive({getItem:()=>null,setItem:()=>{}});
 const old=(start)=>({start,ended:true,teams:[{players:[]}],groups:[]});
 archive.saveMatch(old('a'));
 archive.saveMatch(old('b'));
 const replay=source(['a','b'].map(start=>({...old(start),scoring:'placement-v1',replayKey:'complete combat history'})));
 archive.capture(replay);
 assert.deepEqual(archive.boards().map(board=>[board.start,board.scoring]),[['a','placement-v1']]);
 archive.deleteMatch('a');
 archive.capture(replay);
 assert.equal(archive.boards().length,0);
});
test('the unique archived roster association supplies live points and an elimination flag together',()=>{
 const players=[1,2,3,4].map(id=>({id:String(id),userId:String(id),alive:false}));
 const first={start:'a',ended:true,scoring:'placement-v1',teams:[{id:'score:1',name:'Team A',gsTeam:3,pts:12,elims:0,players}],groups:[]};
 const live={start:'b',ended:false,scoring:'placement-v1',teams:[{id:'score:9',name:'Team A',gsTeam:null,pts:null,elims:null,players:[]}],groups:[{id:7,players,elims:4,placementPoints:null,eliminated:true}]};
 const [team]=cumulativeStandings(source([live]),[first]).teams;
 assert.deepEqual([team.pts,team.elims,team.eliminated],[16,4,true]);
});

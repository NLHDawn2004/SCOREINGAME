import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DirectoryLogSource} from '../dist/debug-log-directory.mjs';
import {LiveReader} from '../dist/live-reader.mjs';
import {LogParser} from '../dist/parser.mjs';
import {FileTailer} from '../dist/tailer.mjs';
const line=s=>`[2026-10-25 20:00:00.000][1][1] ${s}\n`;
test('folder source follows newest session instead of an old closed log',async()=>{
 let files=[new File(['old'],'debugger-2026-10-24T19-55-58.log')];
 const dir={async *values(){for(const file of files)yield {kind:'file',name:file.name,getFile:async()=>file};}};
 const source=new DirectoryLogSource(dir);assert.equal((await source.getFile()).name,files[0].name);
 files.push(new File(['new'],'debugger-2026-10-25T01-42-20.log'),new File(['ignored'],'passwords.txt'));
 assert.equal((await source.getFile()).name,'debugger-2026-10-25T01-42-20.log');
});
test('no log yet is retried, not treated as a permanently stopped source',async()=>{
 let files=[];const dir={async *values(){for(const file of files)yield {kind:'file',name:file.name,getFile:async()=>file};}};
 const reader=new LiveReader(new DirectoryLogSource(dir),new FileTailer(new LogParser()));
 assert.equal((await reader.poll()).status,'retrying');files=[new File([line('Join Match Result, ERR_NONE')],'debugger-2026-10-25T01-42-20.log')];
 assert.equal((await reader.poll()).status,'ok');
});
test('changing filename forces a fresh session even if contents share the same prefix',async()=>{
 const p=new LogParser(),t=new FileTailer(p);let name='debugger-2026-10-24T19-55-58.log';
 const reader=new LiveReader({getFile:async()=>new File([line('Join Match Result, ERR_NONE')],name)},t);
 await reader.poll();name='debugger-2026-10-25T01-42-20.log';
 const r=await reader.poll();assert.equal(r.sourceChanged,true);assert.equal(r.result.reset,true);assert.equal(p.matches.length,1);
});
test('pregame names initialize zero kills and zero points without waiting for the first kill',()=>{
 const p=new LogParser();p.feed(line('Join Match Result, ERR_NONE')+line('OnTeamScoreInited -> TeamName: EME TeamID: 4'));
 const t=p.scoreboard().teams[0];assert.equal(t.name,'EME');assert.equal(t.elims,0);assert.equal(t.pts,0);assert.equal(t.alive,null);
});
test('Player Join registers roster earlier than spectator avatar loading and keeps state on duplicate add',()=>{
 const p=new LogParser();p.feed(line('Join Match Result, ERR_NONE')+line('Player Join, 123456, 16777217, A,name,False1'));
 assert.equal(p.snapshot().teams[0].players[0].userId,'123456');assert.equal(p.snapshot().teams[0].players[0].name,'A,name');
 p.feed(line("Player '16777217' Knock Down, by '2'")+line('[UIModelSpectator] AddPlayer id16777217,nameAlias,gsTeam1'));
 assert.equal(p.snapshot().teams[0].players[0].status,'knocked');assert.equal(p.snapshot().teams[0].players.length,1);
});

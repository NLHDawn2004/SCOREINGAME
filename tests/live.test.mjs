import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LiveReader} from '../dist/live-reader.mjs';
import {LogParser} from '../dist/parser.mjs';
import {FileTailer} from '../dist/tailer.mjs';
const line=s=>`[2026-10-25 20:00:00.000][1][1] ${s}\n`;
const seed=line('Join Match Result, ERR_NONE')+line('[UIModelSpectator] AddPlayer id1,nameA,gsTeam12')+line('[UIModelSpectator] AddPlayer id2,nameB,gsTeam13');
test('reader survives more than three failures and resumes without manual intervention',async()=>{
 const parser=new LogParser(),tailer=new FileTailer(parser);let fails=0,reads=0,extra='';
 const reader=new LiveReader({getFile:async()=>{reads++;if(fails>0){fails--;throw new Error('file busy');}return new Blob([seed+extra]);}},tailer);
 assert.equal((await reader.poll()).status,'ok');fails=10;
 for(let i=0;i<10;i++){const r=await reader.poll();assert.equal(r.status,'retrying');assert.equal(parser.snapshot().teams[0].elims,0);}
 extra=line('Player 2 Dead, killed by 1');assert.equal((await reader.poll()).status,'ok');
 assert.equal(reads,12);assert.equal(parser.snapshot().teams.find(t=>t.id===12).elims,1);
});
test('idle file and ended match never stop subsequent reads',async()=>{
 const p=new LogParser();let text=seed;const reader=new LiveReader({getFile:async()=>new Blob([text])},new FileTailer(p));
 await reader.poll();for(let i=0;i<6;i++)assert.equal((await reader.poll()).status,'ok');
 text+=line('Server Side Match Result!');await reader.poll();
 text+=line('Join Match Result, ERR_NONE')+line('[UIModelSpectator] AddPlayer id5,nameNEW,gsTeam3');
 assert.equal((await reader.poll()).status,'ok');assert.equal(p.matches.length,2);
});
test('overlapping poll requests do not ingest data twice',async()=>{
 const p=new LogParser();let release;const blocker=new Promise(resolve=>{release=resolve;});
 const reader=new LiveReader({getFile:async()=>{await blocker;return new Blob([seed]);}},new FileTailer(p));
 const pending=reader.poll();assert.equal((await reader.poll()).status,'busy');release();await pending;assert.equal(p.matches.length,1);
});
test('failed incremental read preserves the last good board and manual mappings',async()=>{
 const p=new LogParser(),t=new FileTailer(p);await t.poll(new Blob([seed]));p.setMapping(0,12,4);
 const before=p.snapshot();const blob=new Blob([seed+line('Player 2 Dead, killed by 1')]);let calls=0;
 const changing={size:blob.size,slice(a,b){calls++;if(calls===4)return {arrayBuffer(){throw new Error('busy');}};return blob.slice(a,b);}};
 await assert.rejects(t.poll(changing),/busy/);assert.deepEqual(p.snapshot(),before);
 await t.poll(blob);assert.equal(p.snapshot().teams.find(t=>t.id===12).mapping,'manual');assert.equal(p.snapshot().teams.find(t=>t.id===12).elims,1);
});

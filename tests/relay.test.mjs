import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createScoreServer} from '../relay-server.mjs';
test('separate browser reads published state and logos; cross-site and unauthorized writes rejected',async t=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');const server=createScoreServer(root);server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));const origin='http://127.0.0.1:'+server.address().port;
 const request=(url,opts)=>fetch(origin+url,opts);const {token}=await(await request('/api/session')).json();
 assert.deepEqual(await(await request('/api/scoreboard')).json(),{teams:[]});
 const state={teams:[{name:'Đội đã sửa',pts:10,elims:3,states:['alive','knocked','dead','alive'],logo:null,privatePlayerIds:['must-not-export']}]};
 assert.equal((await request('/api/scoreboard',{method:'POST',body:JSON.stringify(state)})).status,403);
 assert.equal((await request('/api/scoreboard',{method:'POST',headers:{Authorization:'Bearer '+token,Origin:'https://unrelated.example'},body:JSON.stringify(state)})).status,403);
 assert.equal((await request('/api/session',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
 const bytes=Buffer.from('test image payload');const hash=createHash('sha256').update(bytes).digest('hex');assert.equal((await request('/api/logo/'+hash,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'image/png'},body:bytes})).status,200);
 state.teams[0].logo=hash;
 assert.equal((await request('/api/scoreboard',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(state)})).status,200);
 const read=await(await request('/api/scoreboard')).json();assert.equal(read.teams[0].pts,10);assert.equal(read.teams[0].name,'Đội đã sửa');assert.equal(read.teams[0].privatePlayerIds,undefined);
 const logo=await request('/api/logo/'+hash);assert.equal(logo.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await logo.arrayBuffer()),bytes);
 state.teams[0].pts=11;state.teams[0].states[1]='alive';await request('/api/scoreboard',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(state)});const next=await(await request('/api/scoreboard')).json();assert.equal(next.teams[0].pts,11);assert.equal(next.teams[0].states[1],'alive');
 assert.equal((await request('/overlay.html')).status,200);assert.equal((await request('/api/scoreboard')).headers.get('cross-origin-resource-policy'),'same-origin');
});

test('KV assets stay available to OBS while selected and are released when removed', async t=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
 const server=createScoreServer(root);server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const origin='http://127.0.0.1:'+server.address().port;
 const {token}=await(await fetch(origin+'/api/session')).json();
 const post=(path,body,type)=>fetch(origin+path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':type},body});
 const ids=[];
 for(const bytes of ['atlas','header']){
  const id=createHash('sha256').update(bytes).digest('hex');
  assert.equal((await post('/api/logo/'+id,bytes,'image/png')).status,200);
  ids.push(id);
 }
 const kv={atlas:ids[0],header:ids[1],height:590,bands:[[7,51],[55,99]]};
 const update=state=>post('/api/scoreboard',JSON.stringify(state),'application/json');
 assert.equal((await update({teams:[],kv})).status,200);
 assert.deepEqual(await(await fetch(origin+'/api/scoreboard')).json(),{teams:[],kv});
 for(const id of ids)assert.equal((await fetch(origin+'/api/logo/'+id)).status,200);
 assert.equal((await update({teams:[],kv:{...kv,bands:[[7,51],[50,99]]}})).status,400);
 assert.equal((await update({teams:[]})).status,200);
 for(const id of ids)assert.equal((await fetch(origin+'/api/logo/'+id)).status,404);
});

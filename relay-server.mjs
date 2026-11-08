import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {validateOverlayState} from './dist/overlay-state.mjs';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf','.png':'image/png'};
async function body(req,limit){let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>limit)throw Error('Payload too large');parts.push(part);}return Buffer.concat(parts);}
const newSession=()=>({token:randomBytes(32).toString('hex'),state:{teams:[]},assets:new Map(),assetBytes:0,touched:Date.now()});
export function createScoreServer(root,{hosted=false,publicHost}={}){
 const localSession=hosted?null:newSession();
 const sessions=new Map();
 const maxSessions=8;
 const expiry=30*60*1000;
 return http.createServer(async(req,res)=>{
  const send=(code,data,type='application/json; charset=utf-8')=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Referrer-Policy':'no-referrer'});res.end(typeof data==='string'||Buffer.isBuffer(data)?data:JSON.stringify(data));};
  try{
   if(hosted&&req.method==='GET'&&req.url==='/healthz')return send(200,{ok:true});
   const host=req.headers.host||'';if(hosted ? host!==publicHost : !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))return send(403,{});
   const origin=(hosted?'https://':'http://')+host;const url=new URL(req.url,origin);
   if(url.pathname.startsWith('/api/')){
    if(req.headers.origin&&req.headers.origin!==origin)return send(403,{});
    if(req.headers['sec-fetch-site']==='cross-site')return send(403,{});
    let session=localSession;
    let route=url.pathname.slice(4);
    if(hosted){
     const now=Date.now();
     for(const [id,entry] of sessions)if(now-entry.touched>expiry)sessions.delete(id);
     if(route==='/session'&&req.method==='POST'){
      const authorization=req.headers.authorization;
      const supplied=authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
      if(authorization&&!supplied)return send(403,{});
      const token=supplied??randomBytes(32).toString('hex');
      const id=createHash('sha256').update(token).digest('hex').slice(0,32);
      session=sessions.get(id);
      if(!session){
       if(sessions.size>=maxSessions)return send(503,{});
       session={...newSession(),token};
       sessions.set(id,session);
      }
      session.touched=now;
      return send(200,{id,token});
     }
     const live=route.match(/^\/live\/([a-f0-9]{32})(\/.*)$/);
     session=live&&sessions.get(live[1]);
     if(!session)return send(404,{});
     route=live[2];
    }else if(req.method==='GET'&&route==='/session'){
     return send(200,{token:session.token});
    }
    if(req.method==='GET'&&route==='/scoreboard')return send(200,session.state);
    const {assets}=session;
    const asset=route.match(/^\/logo\/([a-f0-9]{64})$/);
    if(req.method==='GET'&&asset){const a=assets.get(asset[1]);return a?send(200,a.bytes,a.type):send(404,{});}
    if(req.method!=='POST'||req.headers.authorization!=='Bearer '+session.token)return send(403,{});
    session.touched=Date.now();
    if(route==='/scoreboard'){
     const state=validateOverlayState(JSON.parse((await body(req,128*1024)).toString('utf8')));
     session.state=state;
     const used=new Set([...state.teams.map(t=>t.logo),state.kv?.atlas,state.kv?.header]);for(const [key,a]of assets)if(!used.has(key)){session.assetBytes-=a.bytes.length;assets.delete(key);}
     return send(200,{ok:true});
    }
    if(asset){const type=(req.headers['content-type']||'').split(';')[0];if(!['image/png','image/jpeg','image/webp'].includes(type))return send(415,{});const bytes=await body(req,2*1024*1024);if(createHash('sha256').update(bytes).digest('hex')!==asset[1])return send(400,{});if(!assets.has(asset[1])){if(session.assetBytes+bytes.length>(hosted?16:80)*1024*1024)return send(413,{});assets.set(asset[1],{bytes,type});session.assetBytes+=bytes.length;}return send(200,{ok:true});}
    return send(404,{});
   }
   if(req.method!=='GET')return send(405,{});
   const pathname=decodeURIComponent(url.pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))return send(403,{});
   try{return send(200,await fs.readFile(file),types[path.extname(file)]||'application/octet-stream');}catch{return send(404,'Not found','text/plain');}
  }catch(e){if(!res.headersSent)send(e.message==='Payload too large'?413:400,{error:'Invalid request'});else res.end();}
 });
}

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {validateOverlayState} from './dist/overlay-state.mjs';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf','.png':'image/png'};
async function body(req,limit){let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>limit)throw Error('Payload too large');parts.push(part);}return Buffer.concat(parts);}
export function createScoreServer(root){
 const token=randomBytes(32).toString('hex');let state={teams:[]},assets=new Map(),assetBytes=0;
 return http.createServer(async(req,res)=>{
  const send=(code,data,type='application/json; charset=utf-8')=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Referrer-Policy':'no-referrer'});res.end(typeof data==='string'||Buffer.isBuffer(data)?data:JSON.stringify(data));};
  try{
   const host=req.headers.host||'';if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))return send(403,{});
   const origin='http://'+host;const url=new URL(req.url,origin);
   if(url.pathname.startsWith('/api/')){
    if(req.headers.origin&&req.headers.origin!==origin)return send(403,{});
    if(req.headers['sec-fetch-site']==='cross-site')return send(403,{});
    if(req.method==='GET'&&url.pathname==='/api/session')return send(200,{token});
    if(req.method==='GET'&&url.pathname==='/api/scoreboard')return send(200,state);
    const asset=url.pathname.match(/^\/api\/logo\/([a-f0-9]{64})$/);
    if(req.method==='GET'&&asset){const a=assets.get(asset[1]);return a?send(200,a.bytes,a.type):send(404,{});}
    if(req.method!=='POST'||req.headers.authorization!=='Bearer '+token)return send(403,{});
    if(url.pathname==='/api/scoreboard'){
     state=validateOverlayState(JSON.parse((await body(req,128*1024)).toString('utf8')));
     const used=new Set([...state.teams.map(t=>t.logo),state.kv?.atlas,state.kv?.header]);for(const [key,a]of assets)if(!used.has(key)){assetBytes-=a.bytes.length;assets.delete(key);}
     return send(200,{ok:true});
    }
    if(asset){const type=(req.headers['content-type']||'').split(';')[0];if(!['image/png','image/jpeg','image/webp'].includes(type))return send(415,{});const bytes=await body(req,2*1024*1024);if(createHash('sha256').update(bytes).digest('hex')!==asset[1])return send(400,{});if(!assets.has(asset[1])){if(assetBytes+bytes.length>80*1024*1024)return send(413,{});assets.set(asset[1],{bytes,type});assetBytes+=bytes.length;}return send(200,{ok:true});}
    return send(404,{});
   }
   if(req.method!=='GET')return send(405,{});
   const pathname=decodeURIComponent(url.pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))return send(403,{});
   try{return send(200,await fs.readFile(file),types[path.extname(file)]||'application/octet-stream');}catch{return send(404,'Not found','text/plain');}
  }catch(e){if(!res.headersSent)send(e.message==='Payload too large'?413:400,{error:'Invalid request'});else res.end();}
 });
}

import {validateOverlayState} from './overlay-state.mjs';
export class OverlayPublisher{
 constructor(onStatus){this.onStatus=onStatus;this.active=false;this.running=false;this.pending=null;this.latest={teams:[]};this.token='';this.lastJSON='';this.assets=new Map();this.sent=new Set();this.lastSent=0;setInterval(()=>{if(this.active)this.update(this.latest);},1000);}
 async enable(){const r=await fetch('/api/session',{cache:'no-store'});if(!r.ok)throw Error('Không kết nối được bộ xuất tại máy');this.token=(await r.json()).token;this.sent.clear();this.lastJSON='';this.active=true;}
 update(state){this.latest=state;if(!this.active)return;this.pending=state;if(!this.running)void this.drain();}
 async logo(url){if(!url)return null;let a=this.assets.get(url);if(!a){const blob=await(await fetch(url)).blob();const bytes=await blob.arrayBuffer();const hash=await crypto.subtle.digest('SHA-256',bytes);const id=[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');a={id,blob};this.assets.set(url,a);}if(!this.sent.has(a.id)){const r=await fetch('/api/logo/'+a.id,{method:'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':a.blob.type||'image/png'},body:a.blob});if(!r.ok)throw Error('Không xuất được logo');this.sent.add(a.id);}return a.id;}
 async drain(){
  this.running=true;
  try{while(this.pending){const input=this.pending;this.pending=null;const teams=[];let missing=0;
   for(const t of input.teams){let logo=null;try{logo=await this.logo(t.logoSrc);}catch{missing++;}teams.push({name:t.name,pts:t.pts,elims:t.elims,id:t.id,eliminated:t.eliminated,cpr:t.cpr,states:t.states,logo});}
   const kv=input.kv?{...input.kv,atlas:await this.logo(input.kv.atlas),header:await this.logo(input.kv.header)}:null;
   const state=validateOverlayState({teams,kv,size:input.size});const json=JSON.stringify(state);
   if(json!==this.lastJSON||Date.now()-this.lastSent>=1000){const r=await fetch('/api/scoreboard',{method:'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},body:json});if(!r.ok){if(r.status===403)await this.enable();throw Error('Chưa truyền được bảng điểm');}this.lastJSON=json;this.lastSent=Date.now();this.sent=new Set([...state.teams.map(t=>t.logo),state.kv?.atlas,state.kv?.header].filter(Boolean));}
   const usedURLs=new Set([...input.teams.map(t=>t.logoSrc),input.kv?.atlas,input.kv?.header]);for(const url of this.assets.keys())if(!usedURLs.has(url))this.assets.delete(url);
   this.onStatus(!state.teams.length?'Đã kết nối OBS/vMix · chờ dữ liệu đội từ file debug':missing?'Đang xuất bảng · '+missing+' logo chưa truyền được':'Đang xuất trực tiếp · '+(state.size?.width??350)+' × '+(state.size?.height??730)+' px');
  }}catch{this.onStatus('Đang kết nối lại bộ xuất · giữ bảng gần nhất');clearTimeout(this.retry);this.retry=setTimeout(()=>{this.pending=this.latest;if(!this.running)void this.drain();},1200);}
  finally{this.running=false;}
 }
}

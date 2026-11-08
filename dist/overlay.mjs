import {validateOverlayState,overlayRowHeight,overlayHeaderHeight,DEFAULT_OVERLAY_SIZE} from './overlay-state.mjs';
import {applyKv,kvRowStyle} from './kv-skin.mjs';
import {paintRows} from './score-motion.mjs';
const cache=new Map();let previous='',busy=false;
const overlay=document.querySelector('#overlay');
let displaySize=DEFAULT_OVERLAY_SIZE;
function fitViewport(){
 const {width,height}=displaySize;
 const scale=Math.min(1,window.innerWidth/width,window.innerHeight/height);
 overlay.style.setProperty('--board-fit',String(scale));
}
window.addEventListener('resize',fitViewport);
function applySize(size,count){
 displaySize=size??DEFAULT_OVERLAY_SIZE;
 const {width,height}=displaySize;
 const rowHeight=overlayRowHeight(count,height);
 const dimensions={
  'board-width':width+'px','board-height':height+'px',
  'header-height':overlayHeaderHeight(height)+'px','row-height':rowHeight+'px',
  'row-gap':Math.min(4*height/730,rowHeight*.18)+'px','width-ratio':width/350,
 };
 for(const [key,value]of Object.entries(dimensions))overlay.style.setProperty('--'+key,String(value));
 fitViewport();
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function paint(state,images,kvImages){
 const atlas=kvImages?.atlas||cache.get(state.kv?.atlas);
 const header=kvImages?.header||cache.get(state.kv?.header);
 const kv=state.kv&&atlas?{...state.kv,atlas,header}:null;
 applyKv(overlay,kv);
 applySize(state.size,state.teams.length);
 overlay.hidden=!state.teams.length;
 const rows=state.teams.map((t,i)=>{
  const image=images?images[i]:cache.get(t.logo);
  const eliminated=t.eliminated??(t.states?.length===4&&t.states.every(status=>status==='dead'));
  return `<section data-row-key="${esc(t.id??t.name+'-'+i)}" ${kvRowStyle(kv,i)} class="row ${eliminated?'out':''}"><div class="team">${image?`<img class="logo" src="${esc(image)}" alt="">`:`<span class="logo fallback">${esc(t.name.slice(0,2))}</span>`}<div class="team-label"><span class="name">${esc(t.name)}</span>${t.cpr?'<img class="cpr-icon" src="./cpr-white.png" alt="Đạt CPR">':''}</div></div><span class="number">${t.elims??'—'}</span><span class="number pts">${t.pts??'—'}</span>${eliminated?'<span class="eliminated-tag">ELIMINATED</span>':''}</section>`;
 }).join('');
 paintRows(document.querySelector('#rows'),rows,'overlay');
}
const liveID=new URLSearchParams(location.search).get('live');
const api=/^[a-f0-9]{32}$/.test(liveID??'')?'/api/live/'+liveID:'/api';
async function tick(){if(busy)return;busy=true;try{const r=await fetch(api+'/scoreboard',{cache:'no-store'});if(!r.ok)return;const state=validateOverlayState(await r.json());const json=JSON.stringify(state);if(json===previous)return;
 const used=new Set([...state.teams.map(t=>t.logo),state.kv?.atlas,state.kv?.header].filter(Boolean));
 for(const id of used)if(!cache.has(id)){try{const image=await fetch(api+'/logo/'+id,{cache:'no-store'});if(image.ok)cache.set(id,URL.createObjectURL(await image.blob()));}catch{}}
 paint(state);for(const [id,url]of cache)if(!used.has(id)){URL.revokeObjectURL(url);cache.delete(id);}previous=[...used].every(id=>cache.has(id))?json:'';
 }catch{}finally{busy=false;}}
const tabID=new URLSearchParams(location.search).get('tab');
if(tabID){
 const channel=new BroadcastChannel('ff-overlay-'+tabID);
 channel.onmessage=e=>{try{if(e.data?.type!=='state')return;const state=validateOverlayState(e.data.state);if(!Array.isArray(e.data.logos)||e.data.logos.length!==state.teams.length)return;
 const ownBlob=src=>{try{const u=new URL(src);return u.protocol==='blob:'&&u.origin===location.origin?u.href:null;}catch{return null;}};
 const images=e.data.logos.map(ownBlob);
 const kvImages=state.kv?{atlas:ownBlob(e.data.kvImages?.atlas),header:ownBlob(e.data.kvImages?.header)}:null;
 const json=JSON.stringify([state,images,kvImages]);if(json!==previous){paint(state,images,kvImages);previous=json;}}catch{}};
 channel.postMessage({type:'request'});setInterval(()=>channel.postMessage({type:'request'}),1000);
}else{setInterval(tick,liveID?500:100);tick();}

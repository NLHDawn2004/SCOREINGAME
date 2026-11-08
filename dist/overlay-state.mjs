export const isCprReached=(pts,threshold)=>Number.isSafeInteger(pts)&&Number.isSafeInteger(threshold)&&threshold>0&&pts>=threshold;
export const DEFAULT_OVERLAY_SIZE=Object.freeze({width:350,height:730});
export function validateOverlaySize(size){
 const {width,height}=size??{};
 if(!Number.isInteger(width)||width<160||width>1920||!Number.isInteger(height)||height<160||height>1080)throw Error('Invalid overlay size');
 return {width,height};
}
export const overlayHeaderHeight=height=>Math.max(16,Math.round(34*height/730));
export const overlayRowHeight=(count,height=730)=>Math.min(58*height/730,(height-overlayHeaderHeight(height))/Math.max(1,count));
export function validateOverlayState(value){
 if(!value||!Array.isArray(value.teams)||value.teams.length>64)throw Error('Invalid scoreboard');
 const teams=value.teams.map(t=>{
  if(!t||typeof t.name!=='string'||!t.name.trim()||t.name.length>80)throw Error('Invalid team name');
  for(const key of ['pts','elims'])if(t[key]!==null&&(!Number.isSafeInteger(t[key])||t[key]<0))throw Error('Invalid score');
  if(t.states!==undefined&&(!Array.isArray(t.states)||![0,4].includes(t.states.length)||t.states.some(s=>!['alive','knocked','dead'].includes(s))))throw Error('Invalid legacy state');
  if(t.id!==undefined&&(typeof t.id!=='string'||!t.id||t.id.length>128))throw Error('Invalid row key');
  if(t.cpr!==undefined&&typeof t.cpr!=='boolean')throw Error('Invalid CPR flag');
  if(t.eliminated!==undefined&&typeof t.eliminated!=='boolean')throw Error('Invalid elimination flag');
  if(t.logo!==null&&!/^[a-f0-9]{64}$/.test(t.logo))throw Error('Invalid logo');
  return {name:t.name,pts:t.pts,elims:t.elims,...(t.states!==undefined?{states:[...t.states]}:{}),...(t.id!==undefined?{id:t.id}:{}),...(t.eliminated!==undefined?{eliminated:t.eliminated}:{}),...(t.cpr!==undefined?{cpr:t.cpr}:{}),logo:t.logo};
 });
 const size=value.size===undefined?{}:{size:validateOverlaySize(value.size)};
 if (value.kv == null) return {teams,...size};
 const {atlas,header,height,bands}=value.kv;
 if (![atlas,header].every(id=>id===null||(typeof id==='string'&&/^[a-f0-9]{64}$/.test(id))) ||
     !Number.isInteger(height)||height<1||height>4096 ||
     !Array.isArray(bands)||!bands.length||bands.length>64) throw Error('Invalid KV');
 let previousEnd=0;
 const validated=bands.map(band=>{
  if (!Array.isArray(band)||band.length!==2) throw Error('Invalid KV band');
  const [start,end]=band;
  if (!Number.isInteger(start)||!Number.isInteger(end)||start<previousEnd||end<=start||end>height) throw Error('Invalid KV band');
  previousEnd=end;
  return [start,end];
 });
 return {teams,...size,kv:{atlas,header,height,bands:validated}};
}

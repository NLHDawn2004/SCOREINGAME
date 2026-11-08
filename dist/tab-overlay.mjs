import {validateOverlayState} from './overlay-state.mjs';
function ownBlob(src,origin){
 try{const url=new URL(src);return url.protocol==='blob:'&&url.origin===origin?url.href:null;}
 catch{return null;}
}
export function tabFrame(input,origin){
 const kv=input.kv?{...input.kv,atlas:null,header:null}:null;
 const state=validateOverlayState({teams:input.teams.map(t=>({...t,logo:null})),kv,size:input.size});
 const frame={type:'state',state,logos:input.teams.map(t=>ownBlob(t.logoSrc,origin))};
 if(kv)frame.kvImages={atlas:ownBlob(input.kv.atlas,origin),header:ownBlob(input.kv.header,origin)};
 return frame;
}
export class TabOverlayPublisher{
 constructor(id,origin,makeChannel=name=>new BroadcastChannel(name)){this.id=id;this.origin=origin;this.active=false;this.latest={teams:[]};this.channel=makeChannel('ff-overlay-'+id);this.channel.onmessage=e=>{if(e.data?.type==='request'&&this.active)this.send();};}
 enable(){this.active=true;this.send();}
 update(state){this.latest=state;if(this.active)this.send();}
 send(){this.channel.postMessage(tabFrame(this.latest,this.origin));}
 close(){this.channel.close();}
}

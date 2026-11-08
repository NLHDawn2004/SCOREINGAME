import {teamLogoKey} from './logo-names.mjs';
const refs=t=>(t||[]).map(r=>JSON.stringify([r.start,String(r.scoreId)]));
export function teamEditIdentity(t,s){return {sourceName:t.name,duplicate:!!t.duplicate||s.teams.filter(x=>teamLogoKey(x.name)===teamLogoKey(t.name)).length>1,uids:[...new Set([...(t.identityUids||[]),...(t.players||[]).map(p=>p.userId),...(t.livePlayers||[]).map(p=>p.userId)].filter(Boolean).map(String))],refs:t.sourceRefs||[{start:s.start,scoreId:t.scoreId??t.id}]};}
export function overrideMatchScore(record,t,s){
 if(teamLogoKey(record.sourceName)!==teamLogoKey(t.name))return 0;
 const identity=teamEditIdentity(t,s);
 if(record.uids.some(id=>identity.uids.includes(id)))return 3;
 if((record.duplicate||identity.duplicate)&&record.uids.length&&identity.uids.length)return 0;
 const keys=refs(identity.refs);if(refs(record.refs).some(k=>keys.includes(k)))return 2;
 return !record.duplicate&&!identity.duplicate?1:0;
}
export function cleanDisplayName(value){const name=String(value).trim();if(!name||name.length>80)throw Error('Tên đội cần từ 1 đến 80 ký tự.');return name;}

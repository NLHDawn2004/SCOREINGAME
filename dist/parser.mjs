import {scoreTournamentMatch} from './tournament-score.mjs';

// Two independent namespaces exist in this log: gsTeam and scoreboard TeamID.
// Never join them by numeric equality. Explicit bindings take priority over evidence.
export class LogParser {
 constructor({tournament=false}={}){this.tournament=tournament;this.reset();}
 reset(){this.matches=[];this.partial='';this.lines=0;this.lastTime='';this.revision=0;this.batchDepth=0;this.dirty=new Set();}
 current(){return this.matches.at(-1);}
 newMatch(time,fromStart){
  const m={start:time,last:time,fromStart,ended:false,players:new Map(),scores:new Map(),names:new Map(),votes:new Map(),manual:new Map(),pending:[],seen:new Set(),killRecords:[],unknownEvents:0,unknownKills:0,deaths:0,revives:0,events:[],rescueEnd:null};
  this.matches.push(m);this.revision++;return m;
 }
 feed(text){
  const lines=(this.partial+text).split('\n');this.partial=lines.pop();
  this.batchDepth++;try{for(const line of lines)this.process(line.replace(/\r$/,''));}finally{this.batchDepth--;if(!this.batchDepth){for(const m of this.dirty)this.rebuild(m);this.dirty.clear();}}
 }
 process(line){
  this.lines++;
  const header=line.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)\]\[\d+\]\[(\d+)\]\s*(.*)$/);
  if(!header)return;const time=header[1],frame=header[2],text=header[3];this.lastTime=time;
  if(!text.includes('Player')&&!text.includes('OnTeamScore')&&!text.includes('Teammate')&&!text.includes('Join Match Result')&&!text.includes('Server Side Match Result!')&&!text.includes('SyncAssistedDuringBeRescured')&&!text.startsWith('[MatchResult] receive S2C_RUDP_MatchEnd_Res from GS'))return;
  if(/Join Match Result, ERR_NONE\b/.test(line)){
   const c=this.current();
   if(!c||c.players.size||c.deaths||c.ended)this.newMatch(time,true);
   return;
  }
  const join=line.match(/\bPlayer Join,\s*(\d+),\s*(\d+),\s*(.*),(?:False|True)(\d+)\s*$/);
  const add=line.match(/\[UIModelSpectator\] AddPlayer id(\d+),name(.*),gsTeam(\d+)/)||(join?['',join[2],join[3],join[4]]:null);
  const init=line.match(/OnTeamScoreInited -> TeamName:\s*(.*?)\s+TeamID:\s*(\d+)/);
  const score=line.match(/OnTeamScoreChanged -> TeamID:\s*(\d+)\s+TeamScore:\s*(\d+)/);
  const dead=line.match(/\bPlayer (\d+) Dead, killed by (\d+)/);
  const revive=line.match(/\bRevive Player (\d+),/);
  const knock=!this.tournament&&(line.match(/\bPlayer '(\d+)' Knock Down\b/)||line.match(/\bTeammate (\d+) Knock Down\b/));
  const getUp=!this.tournament&&(line.match(/\bPlayer '(\d+)' (?:Get Up|Stand Up|Recovered)\b/)||line.match(/\bTeammate (\d+) (?:Get Up|Stand Up|Recovered)\b/));
  const rescueTarget=!this.tournament&&text.match(/^SyncAssistedDuringBeRescured pID (\d+) start (True|False)\s*$/);
  const rescueResult=!this.tournament&&text.match(/^OnSyncAssistRescure: assistPlayer (\d+) isSuccess (True|False)\s*$/);
  const service=line.match(/@ZX Match\.AddPlayer userID\s*:\s*(\d+),\s*service_group_id\s*:\s*(\d+),\s*playerID\s*:\s*(\d+)/);
  const stamp=score||dead?Date.parse(time.replace(' ','T')):NaN;
  if(!add&&!init&&!score&&!dead&&!revive&&!knock&&!getUp&&!service&&!rescueTarget&&!rescueResult){
   if((text.includes('Server Side Match Result!')||text==='[MatchResult] receive S2C_RUDP_MatchEnd_Res from GS')&&this.current()&&!this.current().ended){this.current().ended=true;this.revision++;}
   return;
  }
  let m=this.current();
  if(!m)m=this.newMatch(time,false);
  // A fresh roster after a completed match is a new partial match if Join is absent.
  if((init&&m.ended)||(add&&m.ended&&!m.players.has(add[1])))m=this.newMatch(time,false);
  m.last=time||m.last;
  if(add){
   const [,id,name,team]=add;
   const old=m.players.get(id);
   const rosterChanged=!old||old.name!==name||old.team!==+team||old.alive===null||(join&&old.userId!==join[1]);
   if(old){old.name=name;old.team=+team;if(old.alive===null){old.alive=true;old.status='alive';}}else m.players.set(id,{id,name,team:+team,alive:true,status:'alive',kills:0});
   if(join)m.players.get(id).userId=join[1];
   if(rosterChanged)this.revision++;
   this.reconcile(m);
  }
  if(service){const player=this.ensurePlayer(m,service[3]);if(player.userId!==service[1]||player.serviceGroupId!==service[2]){player.userId=service[1];player.serviceGroupId=service[2];this.revision++;this.reconcile(m);}}
  if(init){if(m.names.get(+init[2])!==init[1])this.revision++;m.names.set(+init[2],init[1]);if(m.fromStart&&!m.scores.has(+init[2])&&!m.killRecords.length)m.scores.set(+init[2],0);}
  if(score){
   const id=+score[1],val=+score[2],prev=m.scores.get(id)??0;
   if(!m.scores.has(id)||m.scores.get(id)!==val)this.revision++;
   m.scores.set(id,val);
   if(val>prev)m.pending.push({id,delta:val-prev,stamp,frame});
   m.pending=m.pending.filter(e=>stamp-e.stamp<=250&&stamp>=e.stamp);
  }
  if(knock){
   const p=this.ensurePlayer(m,knock[1]);
   if(p.alive!==false&&p.status!=='knocked'){
    this.revision++;p.alive=true;p.status='knocked';this.event(m,time,`${p.name} bị knock`,'');this.reconcile(m);
   }
  }
  // The target is explicit in SyncAssistedDuringBeRescured; assistPlayer is the helper.
  // Ending assistance alone also occurs on cancellation. Require a successful
  // result in the exact same timestamp/frame before clearing the target's knock.
  if(rescueTarget){
   m.rescueEnd=rescueTarget[2]==='False'?{id:rescueTarget[1],time,frame}:null;
  }
  if(rescueResult){
   const target=m.rescueEnd;m.rescueEnd=null;
   if(rescueResult[2]==='True'&&target?.time===time&&target.frame===frame){
    const p=m.players.get(target.id);
    if(p?.status==='knocked'&&p.alive!==false){this.revision++;p.status='alive';p.alive=true;this.event(m,time,`${p.name} được cứu dậy`,'');}
   }
  }
  if(getUp){
   const p=m.players.get(getUp[1]);
   if(p?.status==='knocked'){this.revision++;p.status='alive';p.alive=true;this.event(m,time,`${p.name} được cứu dậy`,'');}
  }
  if(dead||revive){
   // The same lifecycle record is sometimes printed more than once.
   const key=time+'|'+(dead?'death:'+dead[1]+':'+dead[2]:'revive:'+revive[1]);
   if(m.seen.has(key))return;
   m.seen.add(key);
   if(dead){
    const victim=this.ensurePlayer(m,dead[1]),killer=dead[2]==='0'?null:this.ensurePlayer(m,dead[2]);
    if(victim.alive===false)return;
    victim.alive=false;victim.status='dead';victim.deathOrder=m.deaths+1;
    m.deaths++;this.revision++;
    const candidates=m.pending.filter(e=>frame!==undefined&&e.frame===frame&&stamp-e.stamp<=250&&stamp>=e.stamp);
    const evidence=candidates.length===1&&candidates[0].delta===1?candidates[0].id:null;
    m.killRecords.push({victim:dead[1],killer:dead[2],frame,evidence,applied:false});
    this.reconcile(m);
    const award=killer&&victim.team!==null&&killer.team!==null&&dead[1]!==dead[2]&&victim.team!==killer.team;
    m.pending=[];
    this.event(m,time,`${victim?.name||'ID '+dead[1]} bị hạ`,award?`${killer.name} +1 mạng`:'');
   }else{
    const p=this.ensurePlayer(m,revive[1]);
    if(p.alive!==true||p.status!=='alive')this.revision++;
    if(p.alive!==true){p.alive=true;m.revives++;this.event(m,time,`${p.name} hồi sinh`,'');}
    p.status='alive';
    this.reconcile(m);
   }
  }
 }
 ensurePlayer(m,id){
  if(!m.players.has(id))m.players.set(id,{id,name:'ID '+id,team:null,alive:null,status:'unknown',kills:0});
  return m.players.get(id);
 }
 reconcile(m){if(this.batchDepth){this.dirty.add(m);return;}this.rebuild(m);}
 rebuild(m){
  for(const p of m.players.values())p.kills=0;
  m.unknownEvents=[...m.players.values()].filter(p=>p.team===null).length;m.unknownKills=0;
  for(const record of m.killRecords){
   if(record.killer==='0'||record.killer===record.victim)continue;
   const killer=m.players.get(record.killer),victim=m.players.get(record.victim);
   if(killer?.team==null||victim?.team==null){m.unknownKills++;continue;}
   if(killer.team===victim.team)continue;
   killer.kills++;
   if(!record.applied&&record.evidence!==null){
    const votes=m.votes.get(killer.team)||new Map();votes.set(record.evidence,(votes.get(record.evidence)||0)+1);m.votes.set(killer.team,votes);record.applied=true;
   }
  }
 }
 event(m,time,text,detail){m.events.unshift({time,text,detail});m.events.length=Math.min(20,m.events.length);}
 setMapping(index,gsTeam,scoreId){
  const m=this.matches[index];if(!m)return;
  if(scoreId==null){m.manual.delete(+gsTeam);return;}
  for(const [g,s]of m.manual)if(g!==+gsTeam&&s===+scoreId)throw new Error('Tên đội này đã được gán cho một nhóm khác.');
  m.manual.set(+gsTeam,+scoreId);
 }
 snapshot(index=this.matches.length-1){
  const m=this.matches[index];if(!m)return null;
  const inferred=new Map();
  for(const [gs,v]of m.votes){
   const entries=[...v];if(entries.length===1&&entries[0][1]>=1)inferred.set(gs,entries[0][0]);
  }
  const binding=new Map(m.manual),used=new Set(m.manual.values()),deduced=new Set();
  for(const [gs,sid]of inferred){
   if(binding.has(gs)||used.has(sid))continue;
   if([...inferred].some(([g,s])=>g!==gs&&s===sid))continue;
   binding.set(gs,sid);used.add(sid);
  }
  const teams=new Map();
  for(const p of m.players.values()){
   if(p.team===null)continue;
   if(!teams.has(p.team))teams.set(p.team,{id:p.team,players:[]});
   teams.get(p.team).players.push({...p});
  }
  const completeRoster=m.fromStart&&m.ended&&m.names.size>1&&binding.size===m.names.size-1&&teams.size===m.names.size&&[...teams.values()].every(t=>t.players.length===4)&&[...m.players.values()].every(p=>p.team!==null);
  if(completeRoster&&[...m.votes.values()].every(v=>v.size<=1)&&[...binding.values()].every(id=>m.names.has(id))){
   const groups=[...teams.keys()].filter(id=>!binding.has(id)),names=[...m.names.keys()].filter(id=>!used.has(id));
   if(groups.length===1&&names.length===1){binding.set(groups[0],names[0]);deduced.add(groups[0]);}
  }
  const rows=[...teams.values()].map(t=>{
   const sid=binding.get(t.id),mapping=m.manual.has(t.id)?'manual':deduced.has(t.id)?'deduced':sid!=null?'inferred':'unknown';
   const elimsObserved=t.players.reduce((n,p)=>n+p.kills,0);
   return {...t,scoreId:sid,name:sid!=null?(m.names.get(sid)||`Đội ${sid}`):`Đội GS${t.id}`,mapping,
    evidence:sid!=null?(m.votes.get(t.id)?.get(sid)||0):0,
    elims:m.fromStart&&m.unknownKills===0?elimsObserved:null,elimsObserved,
    alive:m.fromStart&&m.unknownEvents===0?t.players.filter(p=>p.alive).length:null,
    aliveObserved:t.players.filter(p=>p.alive).length,knocked:t.players.filter(p=>p.status==='knocked').length,
    pts:sid!=null?(m.scores.get(sid)??null):null,rawScore:sid!=null?(m.scores.get(sid)??null):null};
  }).sort((a,b)=>(b.pts??-1)-(a.pts??-1)||(b.elims??b.elimsObserved)-(a.elims??a.elimsObserved)||a.id-b.id);
  return {index,start:m.start,last:m.last,fromStart:m.fromStart,ended:m.ended,teams:rows,
   scoreTeams:[...m.names].map(([id,name])=>({id,name})),unknownEvents:m.unknownEvents,unknownKills:m.unknownKills,
   deaths:m.deaths,revives:m.revives,events:m.events.map(e=>({...e})),lines:this.lines};
 }
 scoreboard(index=this.matches.length-1){
  const board=this.rawScoreboard(index);
  if(!this.tournament||!board)return board;
  const scored=scoreTournamentMatch(board);
  const match=this.matches[index];
  if(scored.ended&&!scored.placementPending&&match.killRecords.length>=4&&
     scored.groups.every(group=>group.players.every(player=>player.userId))){
   // Replays can have a new wall-clock start. Compare the complete roster and
   // ordered combat records, including game frames, across completed copies.
   scored.replayKey=match.replayKey??=JSON.stringify([
    [...match.names].sort(([a],[b])=>a-b),
    [...match.players.values()].map(player=>[player.id,player.userId,player.team]).sort(),
    match.killRecords.map(record=>[record.frame,record.victim,record.killer]),
   ]);
  }
  return scored;
 }
 rawScoreboard(index){
  const s=this.snapshot(index);if(!s)return null;
  const m=this.matches[index];
  // Scoreboard TeamID is the source of actual team names. Unresolved roster
  // bindings must not turn internal GS group IDs into invented team names.
  if(!s.scoreTeams.length)return {...s,groups:s.teams,teams:s.teams.map(t=>({...t,id:'group:'+t.id,gsTeam:t.id,name:'Chờ tên đội',nameSource:'missing'}))};
  const unresolved=s.teams.filter(t=>t.scoreId==null),unboundNames=s.scoreTeams.filter(t=>!s.teams.some(g=>g.scoreId===t.id));
  const complete=s.fromStart&&s.ended&&s.unknownEvents===0&&s.unknownKills===0&&s.teams.length===s.scoreTeams.length&&s.teams.every(g=>g.players.length===4);
  const commonElims=complete&&unresolved.length===unboundNames.length&&unresolved.length&&unresolved.every(g=>g.elims!==null&&g.elims===unresolved[0].elims)?unresolved[0].elims:null;
  const teams=s.scoreTeams.map(({id,name})=>{
   const group=s.teams.find(t=>t.scoreId===id);
   return group?{...group,id:'score:'+id,gsTeam:group.id,name,nameSource:'log'}:
    {id:'score:'+id,gsTeam:null,scoreId:id,name,nameSource:'log',mapping:'unbound',evidence:0,players:[],
     elims:commonElims??(m.fromStart&&!m.killRecords.length?0:null),elimsObserved:commonElims,alive:null,aliveObserved:null,knocked:null,pts:m.scores.get(id)??null,rawScore:m.scores.get(id)??null};
  }).sort((a,b)=>(b.pts??-1)-(a.pts??-1)||(b.elims??-1)-(a.elims??-1)||a.scoreId-b.scoreId);
  return {...s,teams,groups:s.teams};
 }
}

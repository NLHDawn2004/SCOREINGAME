const uids=t=>new Set((t.players||[]).map(p=>p.userId).filter(Boolean));
const overlaps=(a,b)=>[...a].some(x=>b.has(x));
// Rebuild from per-match snapshots: a growing score replaces, never adds an event twice.
export function cumulativeStandings(parser,savedBoards=[]){
 const current=parser.matches.map((_,i)=>parser.scoreboard(i)).filter(Boolean);
 const byStart=new Map(savedBoards.map(b=>[b.start,b]));
 for(const b of current){const key=b.start??b;const previous=byStart.get(key);if(previous?.ended&&!b.ended)continue;byStart.set(key,b);}
 const boards=[...byStart.values()].sort((a,b)=>String(a.start??'').localeCompare(String(b.start??'')));
 const identities=[];const assignment=new Map();let serial=0;
 const stableTeams = board => [...board.teams].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 const duplicate=new Set();for(const b of boards){const names=b.teams.map(t=>t.name);for(const n of names)if(names.filter(x=>x===n).length>1)duplicate.add(n);}
 for(const b of boards)for(const t of stableTeams(b)){
  if(duplicate.has(t.name)&&!uids(t).size)continue;
  const u=uids(t);const hits=identities.filter(x=>x.name===t.name&&(!duplicate.has(t.name)||overlaps(x.uids,u)));
  let x=hits.length===1?hits[0]:null;
  if(!x){const uncertain=duplicate.has(t.name)&&identities.some(y=>y.name===t.name&&y.createdBoard!==b);x={id:'total:'+serial++,name:t.name,uids:new Set(),rows:[],createdBoard:b,uncertain};identities.push(x);}
  for(const id of u)x.uids.add(id);assignment.set(t,x);
 }
 for(const b of boards){
  const used=new Set(b.teams.map(t=>assignment.get(t)).filter(Boolean));
  for(const t of stableTeams(b).filter(t=>!assignment.has(t))){
   const candidates=identities.filter(x=>x.name===t.name&&!used.has(x));
   // Only infer by exclusion when both the score row and UID-linked roster are unique.
   const unbound=b.groups.filter(g=>!b.teams.some(r=>r.gsTeam===g.id));
   const hits=candidates.filter(x=>unbound.some(g=>overlaps(x.uids,uids(g))));
   let x=hits.length===1&&b.teams.filter(r=>!assignment.has(r)&&r.name===t.name).length===1?hits[0]:null;
   if(!x){x={id:'total:'+serial++,name:t.name,uids:new Set(),rows:[],uncertain:true};identities.push(x);}
   assignment.set(t,x);used.add(x);
  }
 }
 function linkedGroup(board,team,identity){
  const direct=board.groups.find(group=>group.id===team.gsTeam);
  if(direct)return direct;
  const hits=board.groups.filter(group=>!board.teams.some(row=>row.gsTeam===group.id)&&overlaps(identity.uids,uids(group)));
  if(hits.length!==1)return null;
  const members=uids(hits[0]);
  const contested=board.teams.some(row=>row!==team&&row.gsTeam==null&&assignment.has(row)&&overlaps(assignment.get(row).uids,members));
  return contested?null:hits[0];
 }
 for(const board of boards)for(const team of board.teams){
  const identity=assignment.get(team);
  const group=linkedGroup(board,team,identity);
  const elims=group?.elims??team.elims??null;
  const useGroup=board.scoring==='placement-v1'&&team.gsTeam==null&&group;
  const pts=useGroup&&elims!=null?elims+(group.placementPoints??0):team.pts;
  identity.rows.push({...team,sourceStart:board.start,pts,elims,players:group?.players||team.players});
 }
 const liveBoard=current.at(-1);
 function projectLive(x){
  const candidates=(liveBoard?.teams||[]).filter(t=>assignment.get(t)===x||(!assignment.has(t)&&t.name===x.name&&(!duplicate.has(x.name)||overlaps(x.uids,uids(t)))));
  if(candidates.length!==1)return {inCurrentMatch:false,livePlayers:[]};
  const t=candidates[0];const group=linkedGroup(liveBoard,t,x);
  return {inCurrentMatch:true,livePlayers:group?.players||t.players||[],eliminated:(group?.eliminated??t.eliminated)===true};
 }
 const teams=identities.map(x=>({id:x.id,name:x.name,nameSource:'log',mapping:'cumulative',uncertain:x.uncertain,
  pts:x.rows.every(r=>r.pts!=null)?x.rows.reduce((n,r)=>n+r.pts,0):null,
  elims:x.rows.every(r=>r.elims!=null)?x.rows.reduce((n,r)=>n+r.elims,0):null,
  matches:x.rows.length,players:x.rows.at(-1).players,scoreId:null,gsTeam:null,
  ...projectLive(x),
  identityUids:[...x.uids],sourceRefs:x.rows.map(r=>({start:r.sourceStart,scoreId:r.scoreId??r.id})),
  duplicate:duplicate.has(x.name),uidLabel:[...x.uids].slice(0,1).join('')
 })).sort((a,b)=>(b.pts??-1)-(a.pts??-1)||(b.elims??-1)-(a.elims??-1)||a.id.localeCompare(b.id));
 const latest=boards.at(-1);return latest?{...latest,index:'total',start:'total',teams,matchCount:boards.length,cumulative:true,placementPending:boards.some(board=>board.placementPending),legacyScoring:boards.some(board=>!board.scoring)}:null;
}

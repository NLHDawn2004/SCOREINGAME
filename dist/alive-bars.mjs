// Four living players is the operator-selected default, not a verified roster.
// Preserve every known death/knock while the remaining members are still loading.
export function aliveBars(team){
 const states=(team.players||[]).slice(0,4).map(p=>p.alive===false?'dead':p.status==='knocked'?'knocked':'alive');
 while(states.length<4)states.push('alive');
 return states;
}

export function teamEliminated(players=[]){return players.length===4&&players.every(p=>p.alive===false);}

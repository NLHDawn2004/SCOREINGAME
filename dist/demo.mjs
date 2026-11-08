// Synthetic fixture only. Never imported user logs or account identifiers.
export function demoSeed(){
 const names=['BRU','FL','AGAL','PE','ONIC','WAG','GOW','MBR','BTR','RRQ','EVOS','FLCN'];
 let text='';let tick=0;
 const line=s=>{text+=`[2026-10-25 20:00:${String(Math.floor(tick/1000)).padStart(2,'0')}.${String(tick%1000).padStart(3,'0')}][1][1] ${s}\n`;tick+=10;};
 line('Join Match Result, ERR_NONE');
 names.forEach((name,i)=>{line(`OnTeamScoreInited -> TeamName: ${name} TeamID: ${i+1}`);for(let j=1;j<=4;j++)line(`[UIModelSpectator] AddPlayer id${(i+1)*100+j},name${name} · ${j},gsTeam${i+1}`);});
 [1,11,4,8,10,1,5,5,6,3,0,2].forEach((kills,i)=>{
  for(let k=0;k<kills;k++){const victim=((i+1)%12+1)*100+1;line(`Player ${victim} Dead, killed by ${(i+1)*100+1}`);line(`Revive Player ${victim}, revivePosition=(0,0,0)`);}
 });
 [32,31,29,25,23,20,13,13,11,9,8,7].forEach((pts,i)=>line(`OnTeamScoreChanged -> TeamID: ${i+1} TeamScore: ${pts}`));
 for(const team of [1,11])for(let j=1;j<=4;j++)line(`Player ${team*100+j} Dead, killed by 0`);
 for(const [team,n]of [[4,1],[7,1]])for(let j=1;j<=n;j++)line(`Player ${team*100+j} Dead, killed by 0`);
 line("Player '202' Knock Down, by '501'");
 line("Player '402' Knock Down, by '601'");
 return {text,names};
}

const KEY='ff-live-score-completed-v1';
const shape=b=>b&&typeof b.start==='string'&&b.start.length&&Array.isArray(b.teams)&&Array.isArray(b.groups)&&[...b.teams,...b.groups].every(t=>t&&Array.isArray(t.players));
const valid=b=>shape(b)&&(b.ended===true||(b.ended===false&&b.manualSnapshot===true));
function copyBoard(b,savedAt){const {start,last,fromStart,teams,groups,scoring,placementPending,replayKey}=b;return JSON.parse(JSON.stringify({start,last,ended:!!b.ended,manualSnapshot:!b.ended,savedAt:savedAt||new Date().toISOString(),fromStart,teams,groups,scoring,placementPending,replayKey,events:[]}));}
export class MatchArchive{
 constructor(storage){this.storage=storage;this.saved=new Map();this.ignored=new Set();this.error='';this.persisted='';try{const raw=storage.getItem(KEY);if(raw){const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.boards)||!data.boards.every(valid)||!Array.isArray(data.ignored))throw Error('Dữ liệu điểm đã lưu không hợp lệ');this.saved=new Map(data.boards.map(b=>[b.start,b]));this.ignored=new Set(data.ignored);this.persisted=raw;}}catch(e){this.error=e.message;}}
 boards(){return [...this.saved.values()];}
 board(parser,index){
  const board=parser.scoreboard(index);
  if(!board?.replayKey)return board;
  const previous=this.boards().find(saved=>saved.replayKey===board.replayKey);
  return previous&&previous.start!==board.start?{...board,start:previous.start}:board;
 }
 excluded(board){return this.ignored.has(board.start)||Boolean(board.replayKey&&this.ignored.has('replay:'+board.replayKey));}
 visible(parser,onAlias){
  const parsed=parser.matches.map((_,index)=>parser.scoreboard(index)).filter(Boolean);
  const canonical=new Map(this.boards().filter(board=>board.replayKey).map(board=>[board.replayKey,board.start]));
  for(const board of parsed){
   if(board.replayKey&&this.saved.has(board.start)&&!canonical.has(board.replayKey))canonical.set(board.replayKey,board.start);
  }
  const boards=new Map();
  for(const board of parsed){
   if(this.excluded(board))continue;
   const key=board.replayKey||board.start;
   const start=canonical.get(key)??board.start;
   if(this.ignored.has(start))continue;
   if(board.replayKey)canonical.set(key,start);
   if(start!==board.start)onAlias?.(board.start);
   boards.delete(key);
   boards.set(key,start===board.start?board:{...board,start});
  }
  return [...boards.values()];
 }
 capture(parser){
  const aliases=new Set();
  for(const board of this.visible(parser,start=>aliases.add(start))){
   if(!shape(board)||!board.ended)continue;
   this.saved.set(board.start,copyBoard(board,this.saved.get(board.start)?.savedAt));
  }
  for(const start of aliases)this.saved.delete(start);
  this.persist();
 }
 saveMatch(board){if(!shape(board)||!board.teams.length)throw Error('Chưa có dữ liệu đội để lưu trận.');if(this.saved.get(board.start)?.ended&&!board.ended)throw Error('Trận này đã có kết quả kết thúc; không ghi đè bằng dữ liệu trận chưa kết thúc.');this.saved.set(board.start,copyBoard(board));this.ignored.delete(board.start);if(board.replayKey)this.ignored.delete('replay:'+board.replayKey);this.persist();}
 deleteMatch(start,board=this.saved.get(start)){if(board?.replayKey)this.ignored.add('replay:'+board.replayKey);this.saved.delete(start);this.ignored.add(start);this.persist();}
 persist(){const raw=JSON.stringify({version:1,boards:this.boards(),ignored:[...this.ignored]});if(raw===this.persisted)return;try{this.storage.setItem(KEY,raw);this.persisted=raw;this.error='';}catch(e){this.error=e.message;}}
 clear(parser){for(const b of [...this.visible(parser),...this.boards()]){this.ignored.add(b.start);if(b.replayKey)this.ignored.add('replay:'+b.replayKey);}this.saved.clear();this.persist();}
}

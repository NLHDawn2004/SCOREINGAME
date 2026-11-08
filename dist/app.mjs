import {TabOverlayPublisher} from './tab-overlay.mjs';
import {OverlayPublisher} from './overlay-publisher.mjs';
import {teamEditIdentity,overrideMatchScore,cleanDisplayName} from './team-presentation.mjs';
import {logoFileTeamKey,teamLogoKey} from './logo-names.mjs';
import {loadKv,applyKv,kvRowStyle} from './kv-skin.mjs';
import {DEFAULT_OVERLAY_SIZE,validateOverlaySize,isCprReached} from './overlay-state.mjs';
import {paintRows} from './score-motion.mjs';
import {MatchArchive} from './match-archive.mjs';
import {cumulativeStandings} from './standings.mjs';
import {LogParser} from './parser.mjs';
import {FileTailer} from './tailer.mjs';
import {demoSeed} from './demo.mjs';
import {LiveReader} from './live-reader.mjs';
import {DirectoryLogSource,isDebugLogName} from './debug-log-directory.mjs';
const $=id=>document.getElementById(id);
const cprKey='ff-live-score-cpr-threshold-v1';
let cprThreshold=null;
try{
 const saved=Number(localStorage.getItem(cprKey));
 if(Number.isSafeInteger(saved)&&saved>0)cprThreshold=saved;
}catch{}
function showCprThreshold(){
 $('cprThreshold').value=cprThreshold??'';
 $('disableCprBtn').disabled=cprThreshold==null;
 $('cprStatus').textContent=cprThreshold==null?'Để trống để tắt CPR.':'Mốc CPR đang dùng '+cprThreshold+' PTS';
}
function setCprThreshold(value){
 cprThreshold=Number.isSafeInteger(value)&&value>0?value:null;
 showCprThreshold();
 try{if(cprThreshold==null)localStorage.removeItem(cprKey);else localStorage.setItem(cprKey,String(cprThreshold));}
 catch{$('cprStatus').textContent+=' · chỉ áp dụng trong phiên này';}
 render();
}
const overlaySizeKey='ff-live-score-overlay-size-v1';
let overlaySize=DEFAULT_OVERLAY_SIZE;
try{overlaySize=validateOverlaySize(JSON.parse(localStorage.getItem(overlaySizeKey)));}catch{}
function setOverlaySize(size){
 overlaySize=validateOverlaySize(size);
 $('overlayWidth').value=overlaySize.width;
 $('overlayHeight').value=overlaySize.height;
 const label=overlaySize.width+' × '+overlaySize.height+' px';
 try{localStorage.setItem(overlaySizeKey,JSON.stringify(overlaySize));$('overlaySizeStatus').textContent='Đã áp dụng '+label;}
 catch{$('overlaySizeStatus').textContent='Đã áp dụng '+label+' cho phiên này.';}
 render();
}
const archive=new MatchArchive({getItem:k=>window.localStorage.getItem(k),setItem:(k,v)=>window.localStorage.setItem(k,v)});
const tabSession=crypto.randomUUID?crypto.randomUUID():[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');
const tabPublisher=new TabOverlayPublisher(tabSession,location.origin);
const tabURL=location.origin+'/overlay.html?tab='+encodeURIComponent(tabPublisher.id);
const localExport=['127.0.0.1','localhost'].includes(location.hostname);
const overlayPublisher=new OverlayPublisher(text=>{text=(demo?'DEMO · ':'')+text;$('overlayStatus').textContent=text;$('exportStatus').textContent=text;},!localExport);
let pendingMatchDelete=null;
let demoArchive=new MatchArchive({getItem:()=>null,setItem:()=>{}});
function activeArchive(){return demo?demoArchive:archive;}
const parser=new LogParser({tournament:true});let tailer=new FileTailer(parser),handle=null,liveReader=null,demo=false,busy=false;
let selectedMatch=-2,selectedTeam=null,lastRead=null,lastChange=null,generation=0,sourceMode='idle',selectingSource=false;
let visibleBoard=null,renderPending=false;
let teamOverrides=[];
try{const saved=JSON.parse(window.localStorage.getItem('ff-team-presentation-v1')||'[]');if(Array.isArray(saved))teamOverrides=saved.filter(r=>r&&typeof r.sourceName==='string'&&typeof r.displayName==='string'&&Array.isArray(r.uids)&&Array.isArray(r.refs));}catch{}
let editTarget=null,pendingEditLogo=null,lastRowClick=null,editLogoRequest=0;
const namedLogos=new Map();
let kv=null;
function releaseKv(){if(kv){URL.revokeObjectURL(kv.atlas);if(kv.header)URL.revokeObjectURL(kv.header);kv=null;}}
const logos=new Map();const colors=['#73514b','#415a75','#685781','#346d64','#7c6341','#574b74','#4c686e'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shortTime=t=>t?.slice(11,19)||'—';
function notify(text){$('notice').textContent=text;$('notice').hidden=!text;}
function state(text,type=''){ $('stateText').textContent=text;$('stateDot').className='dot '+type; }
function releaseLogos(){for(const url of logos.values())URL.revokeObjectURL(url);logos.clear();}
function resetSource(){generation++;handle=null;liveReader=null;sourceMode='idle';visibleBoard=null;renderPending=false;demo=false;parser.reset();tailer=new FileTailer(parser);selectedMatch=-2;selectedTeam=null;lastRead=null;lastChange=null;releaseLogos();$('demoBanner').hidden=true;$('sourceHint').textContent='';notify('');}
function getIndex(){return selectedMatch===-1?parser.matches.length-1:selectedMatch;}
function viewSnapshot(){
 const a=activeArchive();
 if(typeof selectedMatch==='string'&&selectedMatch.startsWith('saved:')){const b=a.saved.get(selectedMatch.slice(6));return b?{...b,index:selectedMatch,archived:true,events:[]}:null;}
 if(selectedMatch!==-2)return a.board(parser,getIndex());
 const boards=a.visible(parser);
 const total=cumulativeStandings({matches:boards,scoreboard:i=>boards[i]},a.boards());
 if(total?.teams.length)return total;
 const latest=a.board(parser,parser.matches.length-1);
 // The exclusion still applies to the total. Preview the source so a saved
 // exclusion cannot make a healthy log look as if it contains no teams.
 if(latest?.teams.length&&a.excluded(latest))return {...latest,excludedPreview:true};
 return total;
}
function matchRows(){const a=activeArchive(),map=new Map(a.boards().map(b=>[b.start,{board:b,value:'saved:'+b.start,saved:true}]));parser.matches.forEach((_,i)=>{const b=a.board(parser,i);if(!b)return;const old=map.get(b.start);if(old?.board.ended&&!b.ended)return;map.set(b.start,{board:b,value:i,saved:a.saved.has(b.start)});});return [...map.values()].sort((a,b)=>a.board.start.localeCompare(b.board.start));}
function boardForSave(){if(typeof selectedMatch==='string')return activeArchive().saved.get(selectedMatch.slice(6));return activeArchive().board(parser,selectedMatch>=0?selectedMatch:parser.matches.length-1);}
function renderMatchHistory(){const a=activeArchive(),rows=matchRows();$('saveMatchBtn').disabled=!boardForSave()?.teams.length;
 const html=rows.length?rows.map(({board:b,value,saved},i)=>{const deleted=a.excluded(b);const pts=b.teams.every(t=>t.pts!=null)?b.teams.reduce((n,t)=>n+t.pts,0):'—';const killRows=b.groups.length?b.groups:b.teams;const elims=killRows.every(t=>t.elims!=null)?killRows.reduce((n,t)=>n+t.elims,0):'—';return `<div class="match-history-row ${deleted?'excluded':''}"><div><strong>Trận ${String(i+1).padStart(2,'0')}</strong><time>${esc(b.start.slice(0,19))}</time><small>${b.teams.length} đội · PTS ${pts} · ELIMS ${elims}</small><span>${deleted?'Đã xóa khỏi tổng':saved?(b.ended?'Đã lưu · kết thúc':'Đã lưu tạm · đang đấu'):'Chưa lưu · đang đấu'}</span></div><div class="match-history-actions"><button class="text-btn" data-match-view="${esc(value)}">Xem</button>${!saved||deleted?`<button class="text-btn" data-match-save="${esc(b.start)}">${deleted?'Lưu lại':'Lưu'}</button>`:''}<button class="text-btn danger-text" data-match-delete="${esc(b.start)}" ${deleted?'disabled':''}>Xóa</button></div></div>`;}).join(''):'<p class="history-empty">Chưa có điểm trận nào. Kết nối log để bắt đầu.</p>';
 if($('matchHistoryList').innerHTML!==html)$('matchHistoryList').innerHTML=html;
}
function getOverride(t,s){const hits=teamOverrides.filter(r=>!!r.demo===demo).map(r=>({r,score:overrideMatchScore(r,t,s)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);return hits.length&&!(hits[1]?.score===hits[0].score)?hits[0].r:null;}
function displayName(t,s){return getOverride(t,s)?.displayName||t.name;}
function displayLogo(t,s){return getOverride(t,s)?.logoUrl||logos.get(logoKey(s,t))||namedLogos.get(teamLogoKey(displayName(t,s)))||namedLogos.get(teamLogoKey(t.name));}
function persistTeamNames(){try{window.localStorage.setItem('ff-team-presentation-v1',JSON.stringify(teamOverrides.filter(r=>!r.demo).map(({logoUrl,...r})=>r)));return '';}catch(e){return ' Tên sửa chỉ giữ trong phiên này vì chưa lưu được trên trình duyệt: '+e.message;}}
function openTeamEdit(t,s){
 if($('teamEditDialog').open)return;
 editTarget={team:t,snapshot:s,demo};pendingEditLogo=null;
 $('teamDisplayName').value=displayName(t,s);$('teamOriginalName').textContent='Tên trong log: '+t.name;
 $('teamEditError').textContent='';$('saveTeamEdit').disabled=false;$('resetTeamEdit').disabled=!getOverride(t,s);
 const logo=displayLogo(t,s);$('teamEditPreview').hidden=!logo;if(logo)$('teamEditPreview').src=logo;else $('teamEditPreview').removeAttribute('src');
 $('teamEditDialog').showModal();$('teamDisplayName').focus();$('teamDisplayName').select();
}
function logoKey(s,t){return `${s.start}:${t.id}`;}
function render(){
 if(!demo)archive.capture(parser);
 const s=viewSnapshot();
 visibleBoard=s;
 renderMatchHistory();
 applyKv($('scoreRows').closest('.board-wrap'),kv);
 const exportState={kv,size:overlaySize,teams:(s?.teams||[]).map(t=>({name:displayName(t,s),pts:t.pts,elims:t.elims,logoSrc:displayLogo(t,s)||null,id:`${s.start}:${t.id}`,eliminated:t.eliminated===true,cpr:isCprReached(t.pts,cprThreshold)}))};
 overlayPublisher.update(exportState);
 try{tabPublisher.update(exportState);}catch{$('overlayStatus').textContent='Chưa đồng bộ được tab xuất bảng điểm.';}
 $('logoSummary').textContent=namedLogos.size?namedLogos.size+' logo đã nạp · '+(s?.teams.filter(t=>namedLogos.has(teamLogoKey(displayName(t,s)))||namedLogos.has(teamLogoKey(t.name))).length||0)+' đội khớp bảng':'Đặt tên file giống tên đội, ví dụ STNN.png';
 $('archiveStatus').textContent=demo?'DEMO · lưu thử trong phiên, không ghi vào điểm thật':archive.error?'Chưa lưu được trên trình duyệt: '+archive.error+' · Điểm vẫn giữ trong phiên này.':archive.boards().length+' trận đã lưu trên trình duyệt này';
 $('newTournamentBtn').disabled=demo||(!archive.boards().length&&!archive.visible(parser).length);
 const options=matchRows().map(({board:b,value},i)=>`<option value="${esc(value)}">Trận ${String(i+1).padStart(2,'0')} · ${shortTime(b.start)}${activeArchive().excluded(b)?' · đã xóa':''}</option>`).join('');
 $('matchSelect').innerHTML='<option value="-2">Tổng các trận · cập nhật trực tiếp</option><option value="-1">Theo dõi trận mới nhất</option>'+options;
 $('matchSelect').value=String(selectedMatch);$('matchSelect').disabled=!options&&!s;
 $('restorePreviewBtn').hidden=!s?.excludedPreview;
 $('boardTitle').textContent=selectedMatch===-2&&!s?.excludedPreview?'Xếp hạng tổng':'Điểm trận đấu';
 $('matchState').textContent=s?(s.excludedPreview?'Đang xem riêng · đã loại khỏi tổng':s.cumulative?`${s.matchCount} trận · cộng dồn`:s.archived?(s.ended?'Đã lưu · kết thúc':'Bản lưu tạm'):(s.ended?'Đã kết thúc':'Đang ghi nhận')):'—';
 $('connectBtn').firstChild.textContent=handle?'Chọn file riêng ':'Chọn một file ';
 $('demoBanner').hidden=!demo;
 $('emptyState').hidden=!!s?.teams.length;
 if(!handle){$('emptyTitle').textContent='Sân đấu đang chờ bạn';$('emptyDescription').textContent='Chọn file debug hoặc thư mục Debugger đang chạy. Hoặc thử demo để xem cách hoạt động.';}
 if(!s){$('scoreRows').innerHTML='';$('teamCount').textContent='—';$('matchCount').textContent='—';$('killCount').textContent='—';$('dataNote').textContent='PTS và ELIMS cộng dồn qua các trận đã đọc, cập nhật trực tiếp.';$('teamEditor').innerHTML='<div class="roster-placeholder">Chưa chọn đội</div>';$('eventList').innerHTML='<div class="activity-empty"><span>◷</span><p>Mọi sự kiện đều có dấu vết.</p><small>Hạ gục và hồi sinh sẽ xuất hiện ở đây khi nhận được dữ liệu.</small></div>';updateClock();return;}
 $('teamCount').textContent=s.teams.length;
 $('matchCount').textContent=s.cumulative?s.matchCount:parser.matches.length;
 $('killCount').textContent=s.teams.every(t=>t.elims!=null)?s.teams.reduce((n,t)=>n+t.elims,0):'—';
 const rows=s.teams.map((t,i)=>{
  const logo=displayLogo(t,s);const shownName=displayName(t,s);const eliminated=t.eliminated===true;
  const label=s.cumulative?(t.uncertain?'Chưa xác định đội xuyên trận':t.duplicate?'UID '+(t.uidLabel||'chưa liên kết'):t.matches+' trận'):(t.mapping==='unbound'?'Chờ ghép thành viên':'Trận đang chọn');
  return `<tr data-team="${esc(t.id)}" data-row-key="${esc(t.id)}" ${kvRowStyle(kv,i)} tabindex="0" title="Kích đúp để sửa tên và logo đội" class="${i===0?'leader ':''}${eliminated?'out ':''}${selectedTeam===t.id?'selected':''}"><td>${String(i+1).padStart(2,'0')}</td><td><div class="team-cell">${logo?`<img class="team-logo" src="${esc(logo)}" alt="">`:`<span class="team-logo" style="--team-color:${colors[i%colors.length]}">${esc(shownName.slice(0,2).toUpperCase())}</span>`}<div class="team-details"><div class="team-name-line"><div class="team-name">${esc(shownName)}</div>${exportState.teams[i].cpr?'<img class="cpr-icon" src="./cpr-white.png" alt="Đạt CPR">':''}</div><div class="mapping-mark">${esc(label)}</div></div></div>${eliminated?'<span class="eliminated-tag">ELIMINATED</span>':''}</td><td class="elims-cell">${t.elims??'—'}</td><td class="points-cell">${t.pts??'—'}</td></tr>`;
 }).join('');
 paintRows($('scoreRows'), rows, `${generation}:${s.start}:${s.index}`);
 $('eventList').innerHTML=s.events.length?s.events.slice(0,8).map(e=>`<div class="event"><span class="event-dot"></span><div><p>${esc(e.text)}</p>${e.detail?`<small>${esc(e.detail)}</small>`:''}<time>${shortTime(e.time)}</time></div></div>`).join(''):'<div class="activity-empty"><span>◷</span><p>Đã nhận danh sách đội</p><small>Đang chờ sự kiện hạ gục hoặc hồi sinh.</small></div>';
 $('dataNote').textContent=(s.cumulative?'PTS và ELIMS cộng dồn qua '+s.matchCount+' trận. ':'Điểm riêng của trận đang chọn. ')+'1 PTS mỗi mạng, điểm top cộng khi trận kết thúc. Dấu — là số liệu chưa xác định.'+(s.excludedPreview?' Trận này đã bị loại khỏi bảng tổng. Bấm Lưu lại vào bảng tổng nếu muốn cộng điểm.':'')+(s.placementPending?' Có trận đang chờ đủ dữ liệu xếp hạng.':'')+((s.legacyScoring||s.archived&&!s.scoring)?' Trận đã lưu từ bản cũ giữ điểm đã lưu cho đến khi đọc lại log.':'');
 const identity=`${generation}:${s.index}:${s.start}:${selectedTeam}`;
 if($('teamEditor').dataset.identity!==identity||!$('teamEditor').contains(document.activeElement))renderEditor(s);
 updateClock();
}
function renderEditor(s=viewSnapshot()){
 const identity=s?`${generation}:${s.index}:${s.start}:${selectedTeam}`:'';
 $('teamEditor').dataset.identity=identity;
 const t=s?.teams.find(t=>t.id===selectedTeam);
 if(!t){$('teamEditor').innerHTML='<div class="roster-placeholder">Chưa chọn đội</div>';return;}
 if(s.cumulative||s.archived){$('teamEditor').innerHTML=`<div class="roster-name">${esc(displayName(t,s))}</div><p class="roster-note">${s.cumulative?t.matches+' trận':'Trận đã lưu'} · PTS ${t.pts??'—'} · ELIMS ${t.elims??'—'}</p><ul class="roster-players">${t.players.map(p=>`<li>${esc(p.name)}<span>ID ${esc(p.id)} · UID ${esc(p.userId||'chưa có')}</span></li>`).join('')}</ul><p class="roster-note">Thành viên gần nhất đã liên kết. Chọn từng trận để đối chiếu nhóm và thêm logo.</p>`;return;}
 const options=s.groups.map(a=>`<option value="${a.id}" ${a.id===t.gsTeam?'selected':''}>Nhóm ${a.id}: ${esc(a.players.map(p=>p.name).join(', '))}</option>`).join('');
 $('teamEditor').innerHTML=`<div class="roster-name">${esc(t.name)} <small class="muted">${t.scoreId!=null?'ID '+t.scoreId:''}</small></div><p class="roster-note">ELIMS <strong>${t.elims??'—'}</strong> · PTS <strong>${t.pts??'—'}</strong></p><ul class="roster-players">${t.players.length?t.players.map(p=>`<li>${esc(p.name)}<span>${p.kills} K</span></li>`).join(''):'<li>Đang chờ ghép danh sách thành viên từ log.</li>'}</ul><label class="edit-label" for="mappingSelect">Đối chiếu nhóm người chơi của đội</label><select id="mappingSelect" ${t.scoreId==null?'disabled':''}><option value="">Tự ghép theo sự kiện / chưa xác định</option>${options}</select><p class="roster-note">Tên đội đọc trực tiếp từ log. ${t.mapping==='inferred'?`Danh sách thành viên được suy ra từ ${t.evidence} sự kiện khớp. `:''}Chỉ ghép thủ công khi đã đối chiếu thành viên. Không lấy mã nhóm làm tên đội.</p><label class="logo-label">＋ Thêm logo đội<input id="logoInput" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><p class="roster-note">PNG, JPG hoặc WebP, tối đa 2 MB. Logo giữ trong phiên này.</p>`;
 $('mappingSelect').addEventListener('change',e=>{
  if($('teamEditor').dataset.identity!==identity)return;
  try{const gs=e.target.value===''?null:+e.target.value;if(t.gsTeam!=null&&gs!==t.gsTeam)parser.setMapping(s.index,t.gsTeam,null);if(gs!=null)parser.setMapping(s.index,gs,t.scoreId);notify('');document.activeElement?.blur();render();}catch(err){notify(err.message);renderEditor();}
 });
 $('logoInput').addEventListener('change',e=>{
  if($('teamEditor').dataset.identity!==identity)return;
  const file=e.target.files[0];if(!file)return;
  if(file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){notify('Chọn logo PNG, JPG hoặc WebP không quá 2 MB.');return;}
  const key=logoKey(s,t);if(logos.has(key))URL.revokeObjectURL(logos.get(key));logos.set(key,URL.createObjectURL(file));render();
 });
}
function updateClock(){
 if(lastRead){const age=Math.floor((Date.now()-lastRead)/1000);$('updateText').textContent=`Kiểm tra ${age}s trước · Dòng log cuối ${parser.lastTime||'chưa có'}${lastChange&&Date.now()-lastChange>15000?' · Chờ dòng mới':''}`;}
 else $('updateText').textContent=demo?'DEMO · Dữ liệu giả lập':'Chưa nhận dữ liệu';
}
async function poll(){
 if(busy||selectingSource||!liveReader)return;
 busy=true;const own=generation,active=liveReader;
 try{
  const response=await active.poll();if(own!==generation||response.status==='busy')return;
  if(response.status==='retrying'){
   state(`Đang kết nối lại · lần ${response.errors}`,'yellow');
   notify(response.error?.name==='NotAllowedError'?'Quyền đọc không còn hiệu lực. Chọn lại thư mục hoặc file để cấp quyền; web vẫn tiếp tục thử kết nối.':`Chưa đọc được nguồn: ${response.error?.message||'file tạm bận'}. Đang tự thử lại (${response.errors} lần), giữ bảng hợp lệ gần nhất.`);
   return;
  }
  const {result}=response;
  $('sourceName').textContent=(sourceMode==='directory'?'Thư mục / ':'')+(response.meta.name||'file đang chọn');
  const stale=sourceMode==='file'&&response.meta.lastModified&&Date.now()-response.meta.lastModified>60000;
  $('sourceHint').textContent=stale?'File này đã hơn 1 phút không được game ghi thêm. Chọn đúng file debugger-…log đang được game ghi, hoặc theo dõi thư mục Debugger.':sourceMode==='directory'?'Tự chọn log phiên mới nhất · kiểm tra mỗi 100 ms':`Kiểm tra mỗi 100 ms · ${Math.round(response.meta.readMs)} ms cho lần đọc vừa rồi`;
  if(response.sourceChanged)notify('Game đã tạo file log phiên mới. Đã chuyển sang '+response.meta.name+'.');
  if(result.reset)notify('File đã được ghi lại hoặc thu ngắn. Đang tiếp tục đọc lại từ đầu.');else if($('notice').textContent.includes('thử')||$('notice').textContent.includes('Quyền đọc'))notify('');
  lastRead=Date.now();if(result.changed)lastChange=Date.now();
  if(result.reset){selectedMatch=-2;selectedTeam=null;releaseLogos();notify('File đã được ghi lại hoặc thu ngắn. Bảng điểm được đọc lại từ đầu.');}
  if(renderPending||result.reset||result.changed&&result.boardChanged!==false){
   renderPending=true;
   render();
   renderPending=false;
  }else updateClock();
  if(visibleBoard?.excludedPreview){
   state('Đã đọc trận · đang xem ngoài bảng tổng','yellow');
  }else if(!visibleBoard?.teams.length){
   const waitingForRoster=!!parser.current();
   state(waitingForRoster?'Đã đọc log · chờ danh sách đội':'Đã đọc log · chưa có dữ liệu trận','yellow');
   $('emptyTitle').textContent=waitingForRoster?'Đang chờ danh sách đội':'Log chưa có dữ liệu trận';
   $('emptyDescription').textContent=waitingForRoster?'Bảng sẽ hiện khi game ghi danh sách đội vào file.':'Vào trận ở chế độ quan sát hoặc kiểm tra đã chọn log của đúng bản game đang chạy.';
  }else{
   state(result.boardChanged?'Đang cập nhật bảng điểm':result.changed?'Log đang ghi · chưa có điểm mới':'Đang theo dõi · chờ log mới','live');
  }
 }catch(err){if(own===generation){state('Đang thử lại · không tạm dừng','yellow');notify('Chưa cập nhật được bảng: '+err.message+'. Web tiếp tục thử ở lần đọc kế tiếp.');}}
 finally{busy=false;}
}
async function connect(){
 if(busy){notify('Đang đọc file. Vui lòng đợi lần đọc hiện tại hoàn tất.');return;}
 if(!window.showOpenFilePicker){
  notify('Trình duyệt này không hỗ trợ đọc file trực tiếp. Mở web trong tab Chrome hoặc Edge trên máy tính rồi bấm Chọn file log.');return;
 }
 try{
  selectingSource=true;
  const [chosen]=await window.showOpenFilePicker({types:[{description:'Free Fire debugger log',accept:{'text/plain':['.log']}}],multiple:false,excludeAcceptAllOption:true});
  if(!isDebugLogName(chosen.name)){notify('Chỉ nhận file debug có tên debugger-YYYY-MM-DDTHH-MM-SS.log. Nguồn đang theo dõi được giữ nguyên.');return;}
  resetSource();handle=chosen;sourceMode='file';liveReader=new LiveReader(chosen,tailer);$('sourceName').textContent=chosen.name;state('Đang đọc dữ liệu…','yellow');render();
 }catch(err){if(err.name!=='AbortError')notify('Không mở được hộp chọn file. Hãy mở đường dẫn web trong tab Chrome hoặc Edge riêng. Chi tiết: '+err.message);}
 finally{selectingSource=false;}
 await poll();
}
async function connectDirectory(){
 if(busy){notify('Đang đọc nguồn hiện tại. Vui lòng đợi lần đọc này hoàn tất.');return;}
 if(!window.showDirectoryPicker){notify('Mở trang trong tab Chrome hoặc Edge riêng để cấp quyền đọc thư mục Debugger.');return;}
 try{
  selectingSource=true;
  const directory=await window.showDirectoryPicker({mode:'read',id:'ff-debugger'});
  resetSource();sourceMode='directory';handle=new DirectoryLogSource(directory);liveReader=new LiveReader(handle,tailer);
  $('sourceName').textContent=directory.name+' / đang tìm log mới nhất';state('Theo dõi thư mục chứa log','live');render();
 }catch(err){if(err.name!=='AbortError')notify('Chưa mở được thư mục log: '+err.message+'. Hãy dùng tab Chrome hoặc Edge riêng.');}
 finally{selectingSource=false;}
 await poll();
}
function beginDemo(){
 if(busy){notify('Đang đọc file, vui lòng đợi trước khi chuyển sang demo.');return;}
 resetSource();demo=true;demoArchive=new MatchArchive({getItem:()=>null,setItem:()=>{}});const seed=demoSeed();parser.feed(seed.text);
 seed.names.forEach((n,i)=>parser.setMapping(0,i+1,i+1));
 $('sourceName').textContent='demo · Dữ liệu giả lập';state('Demo đang chạy','yellow');render();
}
let demoTick=0;
function stepDemo(){
 if(!demo)return;
 const s=parser.snapshot();const active=s.teams.filter(t=>t.aliveObserved>0);if(active.length<2)return;
 const killer=active[demoTick%active.length].players.find(p=>p.alive),vteam=active[(demoTick+1)%active.length];
 const victim=vteam.players.find(p=>p.alive);const date=`2026-10-25 20:${String(5+Math.floor(demoTick/60)).padStart(2,'0')}:${String(demoTick%60).padStart(2,'0')}.000`;
 if(killer&&victim){const team=active[demoTick%active.length];parser.feed(`[${date}][1][1] OnTeamScoreChanged -> TeamID: ${team.scoreId} TeamScore: ${(team.pts??0)+1}\n`);parser.feed(`[${date}][1][1] Player ${victim.id} Dead, killed by ${killer.id}\n`);parser.feed(`[${date}][1][1] Revive Player ${victim.id}, revivePosition=(0,0,0)\n`);}
 demoTick++;render();
}
const helpText=`<ol><li>Mở Chrome hoặc Edge và chọn file debugger-…log hoặc theo dõi thư mục Debugger. Web kiểm tra mỗi 100 ms.</li><li>PTS cộng 1 điểm cho mỗi mạng hạ gục đã xác nhận. Khi trận kết thúc, web cộng điểm top theo thứ hạng xác định từ log.</li><li>ELIMS là tổng mạng hạ gục. Bảng tổng xếp theo PTS, rồi theo ELIMS. Đội mất đủ bốn người được đánh dấu ELIMINATED trong trận.</li><li>Điểm các trận kết thúc tự lưu trên trình duyệt. Chọn từng trận để đối chiếu thành viên hoặc xem điểm riêng.</li></ol>`;
const obsText=`<ol><li>Mở <strong>START.cmd</strong> tại <code>E:/Tool/ĐIỂM</code>, giữ cửa sổ chạy này mở.</li><li>Trên trang <code>http://127.0.0.1:4173</code>, chọn thư mục Debugger và bấm <strong>Xuất bảng điểm</strong>.</li><li>Sao chép link vào <strong>OBS Browser Source</strong> hoặc <strong>vMix Web Browser</strong> trên cùng máy.</li><li>Đặt khung nguồn trình duyệt <strong>1920 × 1080</strong> để dùng toàn bộ khoảng chỉnh. Chỉnh bảng ở mục Kích thước overlay. Nền ngoài bảng trong suốt; chỉ xuất tên đội, logo, ELIMS, PTS và trạng thái ELIMINATED.</li><li>Giữ trang điều khiển đọc log mở. Chuyển trận, sửa tên/logo và điểm mới sẽ truyền sang link.</li></ol><p>Link nội bộ không đưa log lên mạng. Sau khi khởi động lại START.cmd, bấm Xuất OBS/vMix trên trang điều khiển để nối lại. Trên bản Render có hỗ trợ xuất qua mạng, chọn log và bấm Xuất OBS/vMix để lấy link dùng được trên máy khác.</p>`;
function openHelp(obs=false){$('helpContent').innerHTML=obs?obsText:helpText;$('helpDialog').querySelector('h2').textContent=obs?'Đưa bảng điểm lên OBS':'Từ file log đến bảng điểm';$('helpDialog').showModal();}
$('cancelTeamEdit').addEventListener('click',()=>$('teamEditDialog').close());
$('teamEditDialog').addEventListener('close',()=>{if(pendingEditLogo)URL.revokeObjectURL(pendingEditLogo);pendingEditLogo=null;editTarget=null;});
$('changeTeamLogo').addEventListener('click',()=>$('teamEditLogoFile').click());
$('teamEditLogoFile').addEventListener('change',async e=>{
 const file=e.target.files[0];e.target.value='';const target=editTarget;if(!file||!target)return;const request=++editLogoRequest;
 if(!logoFileTeamKey(file.name)||file.size>2*1024*1024){$('teamEditError').textContent='Chọn ảnh PNG, JPG hoặc WebP không quá 2 MB.';$('saveTeamEdit').disabled=false;return;}
 const url=URL.createObjectURL(file);$('saveTeamEdit').disabled=true;
 try{const img=new Image();img.src=url;await img.decode();if(editTarget!==target||request!==editLogoRequest||!$('teamEditDialog').open){URL.revokeObjectURL(url);return;}if(pendingEditLogo)URL.revokeObjectURL(pendingEditLogo);pendingEditLogo=url;$('teamEditPreview').src=url;$('teamEditPreview').hidden=false;$('teamEditError').textContent='';}
 catch{URL.revokeObjectURL(url);if(editTarget===target&&request===editLogoRequest)$('teamEditError').textContent='Ảnh không đọc được. Hãy chọn ảnh khác.';}
 finally{if(editTarget===target&&request===editLogoRequest)$('saveTeamEdit').disabled=false;}
});
$('teamEditForm').addEventListener('submit',e=>{
 e.preventDefault();if(!editTarget||$('saveTeamEdit').disabled)return;
 let name;try{name=cleanDisplayName($('teamDisplayName').value);}catch(err){$('teamEditError').textContent=err.message;return;}
 const {team:t,snapshot:s}=editTarget;let record=getOverride(t,s);
 if(!record){record={...teamEditIdentity(t,s),demo:editTarget.demo};teamOverrides.push(record);}
 const identity=teamEditIdentity(t,s);record.uids=[...new Set([...record.uids,...identity.uids])];record.refs=[...record.refs,...identity.refs];record.displayName=name;
 if(pendingEditLogo){if(record.logoUrl)URL.revokeObjectURL(record.logoUrl);record.logoUrl=pendingEditLogo;pendingEditLogo=null;}
 const error=persistTeamNames();$('teamEditDialog').close();render();notify('Đã cập nhật tên và logo hiển thị của đội.'+error);
});
$('resetTeamEdit').addEventListener('click',()=>{if(!editTarget)return;const r=getOverride(editTarget.team,editTarget.snapshot);if(r){if(r.logoUrl)URL.revokeObjectURL(r.logoUrl);teamOverrides=teamOverrides.filter(x=>x!==r);}const error=persistTeamNames();$('teamEditDialog').close();render();notify('Đã khôi phục tên và logo theo dữ liệu gốc.'+error);});
showCprThreshold();
$('cprForm').addEventListener('submit',event=>{
 event.preventDefault();
 setCprThreshold($('cprThreshold').valueAsNumber);
});
$('disableCprBtn').addEventListener('click',()=>setCprThreshold(null));
$('overlayWidth').value=overlaySize.width;
$('overlayHeight').value=overlaySize.height;
$('overlaySizeForm').addEventListener('submit',event=>{
 event.preventDefault();
 setOverlaySize({width:$('overlayWidth').valueAsNumber,height:$('overlayHeight').valueAsNumber});
});
$('resetOverlaySize').addEventListener('click',()=>setOverlaySize(DEFAULT_OVERLAY_SIZE));
$('exportBtn').addEventListener('click',()=>{
 if(!visibleBoard?.teams.length){notify('Chưa có đội để xuất. Bảng điểm sẽ sẵn sàng khi log có danh sách đội.');return;}
 tabPublisher.enable();render();$('tabOverlayLink').href=tabURL;$('tabOverlayLink').hidden=false;
 const opened=window.open(tabURL,'_blank');if(opened)opened.opener=null;
 $('overlayStatus').textContent=opened?'Đã mở tab xem trước. Dùng Xuất OBS/vMix để lấy link Browser Source.':'Bấm Mở lại tab xem trước nếu trình duyệt chặn tab mới.';
 if(['127.0.0.1','localhost'].includes(location.hostname))void overlayPublisher.enable().then(()=>render()).catch(()=>{});
});
$('exportOptionsBtn').addEventListener('click',async()=>{
 $('exportDialog').showModal();
 $('exportLocal').hidden=true;$('exportHosted').hidden=true;
 $('exportRemoteNote').hidden=localExport;
 $('exportStatus').textContent='Đang kết nối bộ xuất…';
 $('exportOptionsBtn').disabled=true;
 try{
  const id=await overlayPublisher.enable();
  $('exportURL').value=location.origin+'/overlay.html'+(id?'?live='+id:'');
  $('exportPreview').href=$('exportURL').value;
  $('exportLocal').hidden=false;
  render();
 }catch{
  $('exportHosted').hidden=localExport;
  $('exportStatus').textContent=localExport?'Chạy START.cmd rồi mở lại bảng điều khiển.':'Chưa kết nối được bộ xuất qua mạng.';
 }finally{$('exportOptionsBtn').disabled=false;}
});
$('closeExport').addEventListener('click',()=>$('exportDialog').close());
$('copyExport').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('exportURL').value);$('copyExport').textContent='Đã sao chép';}catch{$('exportURL').focus();$('exportURL').select();$('exportStatus').textContent='Nhấn Ctrl+C để sao chép đường link.';}});
const kvHint='Chọn thư mục HUD_PIC để tool tự tìm ảnh KV.';
$('kvBtn').addEventListener('click',()=>$('kvFiles').click());
async function importKv(event){
 const files=[...event.target.files];
 event.target.value='';
 if(!files.length)return;
 $('kvBtn').disabled=true;
 $('clearKvBtn').disabled=true;
 $('kvStatus').textContent='Đang tìm ảnh KV trong thư mục…';
 try{
  const next=await loadKv(files);
  releaseKv();
  kv=next;
  $('kvStatus').textContent=[kv.atlasName,kv.headerName].filter(Boolean).join(' + ')+' · '+kv.bands.length+' dải hàng';
  $('clearKvBtn').hidden=false;
  render();
 }catch(error){
  $('kvStatus').textContent=kv?'Đang dùng KV đã nạp.':kvHint;
  notify('Chưa nạp được KV. '+error.message);
 }finally{
  $('kvBtn').disabled=false;
  $('clearKvBtn').disabled=false;
 }
}
$('kvFiles').addEventListener('change',importKv);
$('clearKvBtn').addEventListener('click', () => {
 releaseKv();
 $('kvStatus').textContent = kvHint;
 $('clearKvBtn').hidden = true;
 render();
});
$('logosBtn').addEventListener('click',()=>$('logoFiles').click());
$('logoFiles').addEventListener('change',async e=>{
 const files=[...e.target.files];e.target.value='';if(!files.length)return;
 $('logosBtn').disabled=true;let loaded=0;const rejected=[];
 try{for(const file of files){
  const key=logoFileTeamKey(file.name);
  if(!key||file.size>2*1024*1024){rejected.push(file.name);continue;}
  const url=URL.createObjectURL(file);
  try{const img=new Image();img.src=url;await img.decode();if(namedLogos.has(key))URL.revokeObjectURL(namedLogos.get(key));namedLogos.set(key,url);loaded++;}
  catch{URL.revokeObjectURL(url);rejected.push(file.name);}
 }
 render();notify('Đã nạp '+loaded+' logo theo tên đội.'+(rejected.length?' Bỏ qua '+rejected.length+' file không hợp lệ hoặc lớn hơn 2 MB: '+rejected.join(', '):''));
 }finally{$('logosBtn').disabled=false;}
});
function saveOneMatch(board){try{activeArchive().saveMatch(board);render();notify(activeArchive().error?'Điểm giữ trong phiên này; chưa lưu được: '+activeArchive().error:demo?'DEMO · đã lưu thử điểm trận, không ảnh hưởng điểm thật.':'Đã lưu điểm riêng của trận. Tổng điểm được tính lại, không cộng trùng.');}catch(e){notify(e.message);}}
$('cancelMatchDelete').addEventListener('click',()=>$('deleteMatchDialog').close());
$('deleteMatchDialog').addEventListener('close',()=>{pendingMatchDelete=null;});
$('confirmMatchDelete').addEventListener('click',()=>{if(!pendingMatchDelete)return;const {start:key,archive:a}=pendingMatchDelete;const row=matchRows().find(r=>r.board.start===key);const canRestore=parser.matches.some((_,i)=>a.board(parser,i)?.start===key);a.deleteMatch(key,row?.board);$('deleteMatchDialog').close();selectedMatch=-2;selectedTeam=null;render();notify(a.error?'Đã loại trận trong phiên này, chưa lưu được thay đổi: '+a.error:'Đã xóa điểm trận khỏi tổng. '+(canRestore?'Bấm Lưu lại nếu muốn khôi phục.':'Muốn khôi phục, chọn lại log chứa trận này rồi bấm Lưu lại.'));});
$('saveMatchBtn').addEventListener('click',()=>saveOneMatch(boardForSave()));
$('restorePreviewBtn').addEventListener('click',()=>saveOneMatch(boardForSave()));
$('matchHistoryList').addEventListener('click',e=>{
 const view=e.target.closest('[data-match-view]');if(view){const value=view.dataset.matchView;selectedMatch=value.startsWith('saved:')?value:+value;selectedTeam=null;render();return;}
 const save=e.target.closest('[data-match-save]');if(save){const row=matchRows().find(r=>r.board.start===save.dataset.matchSave);if(row)saveOneMatch(row.board);return;}
 const remove=e.target.closest('[data-match-delete]');if(remove){pendingMatchDelete={start:remove.dataset.matchDelete,archive:activeArchive()};$('deleteMatchLabel').textContent='Trận bắt đầu '+pendingMatchDelete.start;$('deleteMatchDialog').showModal();}
});
$('newTournamentBtn').addEventListener('click',()=>{if(demo)return;if(!window.confirm('Bắt đầu bảng giải mới? Điểm đã lưu và các trận hiện có sẽ không được tính. File debug không bị thay đổi.'))return;archive.clear(parser);selectedMatch=-2;selectedTeam=null;render();});
$('connectBtn').addEventListener('click',connect);
$('directoryBtn').addEventListener('click',connectDirectory);
$('demoBtn').addEventListener('click',beginDemo);$('emptyDemoBtn').addEventListener('click',beginDemo);
$('exitDemo').addEventListener('click',()=>{resetSource();$('sourceName').textContent='Chưa có file được kết nối';state('Sẵn sàng kết nối');render();});
$('matchSelect').addEventListener('change',e=>{selectedMatch=e.target.value.startsWith('saved:')?e.target.value:+e.target.value;selectedTeam=null;render();});
function selectRow(e){const tr=e.target.closest('tr[data-team]');if(!tr)return;const s=viewSnapshot(),t=s?.teams.find(t=>t.id===tr.dataset.team);if(!t)return;
 const key=selectedMatch+':'+JSON.stringify(teamEditIdentity(t,s)),now=Date.now();
 if(e.type==='click'&&lastRowClick?.key===key&&now-lastRowClick.time<450){lastRowClick=null;openTeamEdit(t,s);return;}
 lastRowClick=e.type==='click'?{key,time:now}:null;selectedTeam=t.id;
 for(const row of $('scoreRows').querySelectorAll('tr'))row.classList.toggle('selected',row.dataset.team===t.id);
 renderEditor(s);
}
$('scoreRows').addEventListener('click',selectRow);
$('scoreRows').addEventListener('dblclick',e=>{const tr=e.target.closest('tr[data-team]'),s=viewSnapshot(),t=s?.teams.find(t=>t.id===tr?.dataset.team);if(t)openTeamEdit(t,s);});
$('scoreRows').addEventListener('keydown',e=>{if(e.key==='F2'){const tr=e.target.closest('tr[data-team]'),s=viewSnapshot(),t=s?.teams.find(t=>t.id===tr?.dataset.team);if(t){e.preventDefault();openTeamEdit(t,s);}}});
$('scoreRows').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRow(e);}});
function focus(on){document.body.classList.toggle('focus',on);$('leaveFocus').hidden=!on;if(on)notify('OBS: dùng nguồn Chụp cửa sổ. Giữ cửa sổ trình duyệt hoạt động.');else notify('');}
$('focusBtn').addEventListener('click',()=>focus(true));$('leaveFocus').addEventListener('click',()=>focus(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('helpDialog').open&&!$('teamEditDialog').open&&!$('exportDialog').open&&!$('deleteMatchDialog').open)focus(false);});
$('helpBtn').addEventListener('click',()=>openHelp());$('obsBtn').addEventListener('click',()=>openHelp(true));$('closeHelp').addEventListener('click',()=>$('helpDialog').close());
setInterval(poll,100);setInterval(updateClock,1000);setInterval(stepDemo,4500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
window.addEventListener('beforeunload',()=>{tabPublisher.close();releaseLogos();releaseKv();for(const url of namedLogos.values())URL.revokeObjectURL(url);for(const r of teamOverrides)if(r.logoUrl)URL.revokeObjectURL(r.logoUrl);});
render();

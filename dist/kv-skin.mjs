const FILE_LIMIT = 2 * 1024 * 1024;

function describeFile(file) {
 const name=file.name.replace(/\.png$/i,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9]/g,'');
 const scoreboard=/scoreboard|standings?|ranking|leaderboard|bangdiem|bangxephang/.test(name);
 const header=/header|tab$|heading|title|tieude/.test(name);
 const unrelated=/^(?:hp(?:\d|background)|epbackground)|killfeed|revive|lastteam|mapteam|teamplayer|teamregion|nation|winrate|logo|avatar/.test(name);
 return {
  file, unrelated,
  rowPriority:header?0:name==='scoreboardbackground'?3:scoreboard?2:/^(?:kv)?(?:rows?|rowbackground|rowstrip|atlas)\d*$/.test(name)?1:0,
  headerPriority:name==='scoreboardtab'?3:header&&scoreboard?2:/^(?:kv)?(?:header|tab|heading|title|tieude)$/.test(name)?1:0,
 };
}
const orderBy=key=>(a,b)=>b[key]-a[key]||
 (a.file.webkitRelativePath||a.file.name).split('/').length-(b.file.webkitRelativePath||b.file.name).split('/').length||
 (a.file.webkitRelativePath||a.file.name).localeCompare(b.file.webkitRelativePath||b.file.name);
const objectUrl=file=>URL.createObjectURL(file.slice(0,file.size,'image/png'));

async function decodePng(file) {
 const bytes = new Uint8Array(await file.slice(0, 24).arrayBuffer());
 const signature = bytes.slice(0, 8).join(',');
 const chunk = String.fromCharCode(...bytes.slice(12, 16));
 if (bytes.length !== 24 || signature !== '137,80,78,71,13,10,26,10' || chunk !== 'IHDR') {
  throw Error(`${file.name} không phải ảnh PNG hợp lệ.`);
 }
 const dimensions = new DataView(bytes.buffer);
 const width = dimensions.getUint32(16);
 const height = dimensions.getUint32(20);
 if (!width || !height || width > 2048 || height > 4096) {
  throw Error(`${file.name} phải có kích thước tối đa 2048 × 4096 px.`);
 }
 return createImageBitmap(file);
}

function findBands(image) {
 const { width, height } = image;
 const canvas = document.createElement('canvas');
 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext('2d', { willReadFrequently: true });
 ctx.drawImage(image, 0, 0);
 const pixels = ctx.getImageData(0, 0, width, height).data;
 const bands = [];
 let start = -1;
 for (let y = 0; y < height; y++) {
  let hasArtwork = false;
  const offset = y * width * 4;
  for (let alpha = offset + 3; alpha < offset + width * 4; alpha += 4) {
   if (pixels[alpha] !== 0) { hasArtwork = true; break; }
  }
  if (hasArtwork && start < 0) start = y;
  if (!hasArtwork && start >= 0) { bands.push([start, y]); start = -1; }
 }
 if (start >= 0) bands.push([start, height]);
 if (bands.length > 64) return [];
 return bands;
}

async function readRows(candidate) {
 let image;
 try {
  image=await decodePng(candidate.file);
  if(image.width<64)return null;
  const bands=findBands(image);
  if(!bands.length)return null;
  const heights=bands.map(([start,end])=>end-start);
  const shortest=Math.min(...heights),tallest=Math.max(...heights);
  if(shortest<8||image.width/tallest<2.5||tallest/shortest>1.65)return null;
  if(!candidate.rowPriority&&bands.length<3)return null;
  return {file:candidate.file,height:image.height,bands};
 } catch { return null; }
 finally { image?.close(); }
}

async function readHeader(file){
 let image;
 try{
  image=await decodePng(file);
  return image.width>=64&&image.height>=8&&image.width/image.height>=2.5?file:null;
 }catch{return null;}
 finally{image?.close();}
}

export async function loadKv(files) {
 const candidates=Array.from(files)
  .filter(file=>/\.png$/i.test(file.name)&&file.size>0&&file.size<=FILE_LIMIT)
  .map(describeFile).filter(candidate=>!candidate.unrelated);
 let rows=null;
 for(const candidate of candidates.filter(item=>item.rowPriority).sort(orderBy('rowPriority'))){
  rows=await readRows(candidate);
  if(rows)break;
 }
 if(!rows){
  for(const candidate of candidates.filter(item=>!item.rowPriority&&!item.headerPriority)){
   const result=await readRows(candidate);
   if(result&&(!rows||result.bands.length>rows.bands.length))rows=result;
  }
 }
 if(!rows)throw Error('Không tìm thấy ảnh nền hàng phù hợp trong HUD_PIC. Có thể dùng ảnh ScoreboardBackground.png hoặc ảnh PNG có các dải hàng tách nhau bằng vùng trong suốt.');
 let header=null;
 for(const candidate of candidates.filter(item=>item.headerPriority).sort(orderBy('headerPriority'))){
  header=await readHeader(candidate.file);
  if(header)break;
 }
 return {
  height:rows.height,bands:rows.bands,atlas:objectUrl(rows.file),header:header?objectUrl(header):null,
  atlasName:rows.file.name,headerName:header?.name??null,
 };
}

export function applyKv(board, kv) {
 board.classList.toggle('kv-board', Boolean(kv));
 board.classList.toggle('kv-header', Boolean(kv?.header));
 for (const key of ['atlas', 'header']) {
  if (kv?.[key]) board.style.setProperty(`--kv-${key}`, `url(${JSON.stringify(kv[key])})`);
  else board.style.removeProperty(`--kv-${key}`);
 }
}

export function kvRowStyle(kv, index) {
 if (!kv) return '';
 const [start, end] = kv.bands[index % kv.bands.length];
 const bandHeight = end - start;
 const size = 100 * kv.height / bandHeight;
 const position = bandHeight === kv.height ? 0 : 100 * start / (kv.height - bandHeight);
 return `style="--kv-size:${size}%;--kv-y:${position}%"`;
}

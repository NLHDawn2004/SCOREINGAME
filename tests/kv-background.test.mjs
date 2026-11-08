import test from 'node:test';
import assert from 'node:assert/strict';
import {loadKv} from '../dist/kv-skin.mjs';

function fixture(name,width,height){
 const data=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,0,0,0,0,0]);
 const view=new DataView(data.buffer);view.setUint32(16,width);view.setUint32(20,height);
 return new File([data],name,{type:'image/png'});
}
test('folder KV chooses compatible rows and title, with a geometry fallback for renamed rows',async()=>{
 const rows=fixture('ScoreboardBackground.png',100,40);
 const renamed=fixture('theme-art.png',100,40);
 const tab=fixture('ScoreboardTab.png',100,20);
 const unrelated=fixture('KillFeedsBackground.png',100,20);
 let image;
 globalThis.createImageBitmap=async file=>{
  assert.notEqual(file,unrelated);
  return {file,width:100,height:file===tab?20:40,close(){}};
 };
 globalThis.document={createElement:()=>({getContext:()=>({
  drawImage(bitmap){image=bitmap;},
  getImageData(){
   const data=new Uint8Array(image.width*image.height*4);
   for(const start of [0,13,26])for(let y=start;y<start+10;y++)data[y*image.width*4+3]=255;
   return {data};
  },
 })})};
 for(const expected of [rows,renamed]){
  const kv=await loadKv([unrelated,tab,expected]);
  try{
   assert.equal(kv.atlasName,expected.name);
   assert.equal(kv.headerName,tab.name);
   assert.deepEqual(kv.bands,[[0,10],[13,23],[26,36]]);
  }finally{URL.revokeObjectURL(kv.atlas);URL.revokeObjectURL(kv.header);}
 }
 await assert.rejects(loadKv([unrelated,tab]),/ảnh nền hàng phù hợp/);
});

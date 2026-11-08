export class FileTailer {
 constructor(parser){this.parser=parser;this.offset=0;this.decoder=new TextDecoder();this.prefix=null;this.anchor=null;this.anchorAt=0;this.invalid=false;}
 async bytes(file,start,end){return new Uint8Array(await file.slice(start,end).arrayBuffer());}
 equal(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i]);}
 async poll(file){return this.read(file);}
 async read(file){
  const revision=this.parser.revision;let reset=this.invalid||file.size<this.offset,checkedPrefix=null;
  if(!reset&&this.offset){checkedPrefix=await this.bytes(file,0,this.prefix.length);reset=!this.equal(this.prefix,checkedPrefix)||!this.equal(this.anchor,await this.bytes(file,this.anchorAt,this.offset));}
  if(!reset&&file.size===this.offset&&this.prefix!==null)return {reset:false,bytes:0,changed:false,boardChanged:false,parseMs:0};
  const before=reset?0:this.offset;let nextOffset=before;const chunks=[];
  // All I/O completes before mutation; interrupted Windows reads preserve the last valid board.
  while(nextOffset<file.size){const end=Math.min(file.size,nextOffset+1024*1024);chunks.push(await this.bytes(file,nextOffset,end));nextOffset=end;}
  const prefixLength=Math.min(4096,nextOffset);const prefix=!reset&&checkedPrefix?.length===prefixLength?checkedPrefix:await this.bytes(file,0,prefixLength);
  const anchorAt=Math.max(0,nextOffset-256),anchor=await this.bytes(file,anchorAt,nextOffset);
  if(reset){this.decoder=new TextDecoder();this.parser.reset();this.invalid=false;}
  const begin=performance.now();try{for(const bytes of chunks)this.parser.feed(this.decoder.decode(bytes,{stream:true}));}catch(err){this.invalid=true;throw err;}
  const parseMs=performance.now()-begin;this.offset=nextOffset;this.prefix=prefix;this.anchorAt=anchorAt;this.anchor=anchor;
  const changed=reset||this.offset>before;return {reset,bytes:this.offset-before,changed,boardChanged:reset||(typeof revision==='number'?this.parser.revision!==revision:changed),parseMs};
 }
}

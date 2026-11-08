// A failed or idle read is a state of the source, never a reason to stop polling.
export class LiveReader {
 constructor(handle,tailer){this.handle=handle;this.tailer=tailer;this.busy=false;this.errors=0;this.fileName=null;this.meta=null;}
 async poll(){
  if(this.busy)return {status:'busy'};
  this.busy=true;
  try{
   const begin=performance.now();const file=await this.handle.getFile();const sourceChanged=!!this.fileName&&!!file.name&&this.fileName!==file.name;
   if(sourceChanged)this.tailer.invalid=true;
   const result=await this.tailer.poll(file);
   this.fileName=file.name||this.fileName;this.meta={name:file.name||'',size:file.size,lastModified:file.lastModified??null,readMs:performance.now()-begin};
   this.errors=0;return {status:'ok',result,sourceChanged,meta:this.meta};
  }catch(error){this.errors++;return {status:'retrying',error,errors:this.errors};}
  finally{this.busy=false;}
 }
}

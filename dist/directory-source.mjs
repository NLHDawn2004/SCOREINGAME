// Only game Debugger session logs are valid live sources.
export const isDebugLogName=name=>/^debugger-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.log$/i.test(name);
export class DirectoryLogSource {
 constructor(directory){this.directory=directory;this.name='';}
 async getFile(){
  const candidates=[];for await(const entry of this.directory.values())if(entry.kind==='file'&&isDebugLogName(entry.name))candidates.push(entry);
  candidates.sort((a,b)=>b.name.localeCompare(a.name));const chosen=candidates[0];
  if(!chosen)throw new Error('Chưa có file debugger-…log trong thư mục. Đang chờ game ghi debug.');
  const file=await chosen.getFile();this.name=file.name;return file;
 }
}

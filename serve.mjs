import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createScoreServer} from './relay-server.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const server=createScoreServer(root);
server.listen(4173,'127.0.0.1',()=>console.log('FF Live Score: http://127.0.0.1:4173\nOBS/vMix: http://127.0.0.1:4173/overlay.html (350 x 730)'));
server.on('error',err=>{console.error('Khong mo duoc web: '+err.message);process.exitCode=1;});

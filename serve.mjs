import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createScoreServer} from './relay-server.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const publicHost=process.env.RENDER_EXTERNAL_HOSTNAME;
const server=createScoreServer(root,{hosted:Boolean(publicHost),publicHost});
const port=publicHost?Number(process.env.PORT||10000):4173;
server.listen(port,publicHost?'0.0.0.0':'127.0.0.1',()=>console.log('FF Live Score: '+(publicHost?'https://'+publicHost:'http://127.0.0.1:4173')));
server.on('error',err=>{console.error('Khong mo duoc web: '+err.message);process.exitCode=1;});

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDirectory=path.dirname(fileURLToPath(import.meta.url));
dotenv.config({path:path.resolve(sourceDirectory,'../.env')});

const [{default:app},{checkDatabase}]=await Promise.all([
  import('./app.js'),
  import('./config/database.js'),
]);

const port=Number(process.env.PORT||4000);
const server=app.listen(port,async()=>{
  console.log(`MCU Knowledge Base API listening on http://localhost:${port}`);
  try{await checkDatabase();console.log('MySQL connected')}
  catch(error){console.warn(`MySQL unavailable: ${error.message}`)}
});

server.on('error',error=>{
  if(error.code==='EADDRINUSE'){
    console.error(`Cannot start MCU Knowledge Base API: port ${port} is already in use.`);
    console.error('Stop the existing API process or configure a different PORT before starting another instance.');
  }else console.error(`API server failed to start: ${error.message}`);
  process.exitCode=1;
});

const shutdown=signal=>{
  console.log(`${signal} received. Closing the API server...`);
  server.close(error=>{
    if(error){console.error(`API shutdown failed: ${error.message}`);process.exitCode=1}
    else console.log('API server closed cleanly.');
  });
};
process.once('SIGINT',()=>shutdown('SIGINT'));
process.once('SIGTERM',()=>shutdown('SIGTERM'));

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
app.listen(port,async()=>{
  console.log(`MCU Knowledge Base API listening on http://localhost:${port}`);
  try{await checkDatabase();console.log('MySQL connected')}
  catch(error){console.warn(`MySQL unavailable: ${error.message}`)}
});

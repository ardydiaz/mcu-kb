import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';
const directory=path.dirname(fileURLToPath(import.meta.url));
dotenv.config({path:path.resolve(directory,'../.env')});
const {default:pool}=await import('../src/config/database.js');
try{const sql=await fs.readFile(path.join(directory,'migrations/20260901_create_landing_page_content.sql'),'utf8');for(const statement of sql.split(/;\s*(?:\r?\n|$)/).map(value=>value.trim()).filter(Boolean))await pool.query(statement);console.log('Landing page content migration completed.')}finally{await pool.end()}

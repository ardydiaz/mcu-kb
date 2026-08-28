import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pool from '../src/config/database.js';

const directory=path.dirname(fileURLToPath(import.meta.url));
const sql=await fs.readFile(path.join(directory,'migrations/20260825_create_document_content_index.sql'),'utf8');
const statements=sql.split(';').map(statement=>statement.trim()).filter(Boolean);
try{
  for(const statement of statements)await pool.query(statement);
  console.log('Document content index migration completed.');
}finally{await pool.end()}

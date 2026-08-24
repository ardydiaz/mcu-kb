import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import pool from '../src/config/database.js';

const migrationPath=path.resolve('database/migrations/20260817_create_documents_and_permissions.sql');
const source=await fs.readFile(migrationPath,'utf8');
const statements=source.split(';').map(value=>value.replace(/^\s*--.*$/gm,'').trim()).filter(Boolean);
const connection=await pool.getConnection();
try{
  for(const statement of statements)await connection.query(statement);
  console.log(`Applied ${statements.length} document migration statements.`);
}finally{
  connection.release();
  await pool.end();
}

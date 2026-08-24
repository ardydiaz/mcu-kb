import 'dotenv/config';
import fs from 'node:fs/promises';
import pool from '../src/config/database.js';
const sql=await fs.readFile(new URL('./migrations/20260824_create_departments.sql',import.meta.url),'utf8');
try{await pool.query(sql);console.log('Department migration applied successfully.')}finally{await pool.end()}

import 'dotenv/config';
import fs from 'node:fs/promises';
import pool from '../src/config/database.js';

const sql=await fs.readFile(new URL('./migrations/20260817_create_categories.sql',import.meta.url),'utf8');
const connection=await pool.getConnection();
try {
  const [columns]=await connection.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='categories'");
  if(columns.length) {
    const names=new Set(columns.map(column=>column.COLUMN_NAME));
    for(const [name,definition] of [
      ['created_by','BIGINT UNSIGNED NULL AFTER description'],
      ['updated_by','BIGINT UNSIGNED NULL AFTER created_by'],
      ['created_at','TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER updated_by'],
      ['updated_at','TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'],
      ['deleted_at','DATETIME NULL AFTER updated_at']
    ]) if(!names.has(name)) await connection.query(`ALTER TABLE categories ADD COLUMN ${name} ${definition}`);
  } else {
    await connection.query(sql);
  }
  console.log('Category migration applied successfully.');
} finally {
  connection.release();
  await pool.end();
}

import 'dotenv/config';
import pool from '../src/config/database.js';
const connection=await pool.getConnection();
try{
  const [column]=await connection.query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='departments' AND COLUMN_NAME='parent_id'");
  if(!column.length)await connection.query('ALTER TABLE departments ADD COLUMN parent_id BIGINT UNSIGNED NULL AFTER description');
  const [key]=await connection.query("SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='departments' AND CONSTRAINT_NAME='fk_departments_parent'");
  if(!key.length)await connection.query('ALTER TABLE departments ADD CONSTRAINT fk_departments_parent FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL');
  console.log('Department hierarchy migration applied successfully.');
}finally{connection.release();await pool.end()}

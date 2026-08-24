import 'dotenv/config';
import pool from '../src/config/database.js';
const connection=await pool.getConnection();
try{
 const [categoryColumns]=await connection.query("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='categories' AND COLUMN_NAME='id'");
 if(!categoryColumns.length)throw new Error('Run the category migration first');
 const [documentColumns]=await connection.query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='documents' AND COLUMN_NAME='category_id'");
 if(!documentColumns.length)await connection.query(`ALTER TABLE documents ADD COLUMN category_id ${categoryColumns[0].COLUMN_TYPE} NULL AFTER department`);
 const [indexes]=await connection.query("SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='documents' AND INDEX_NAME='idx_documents_category'");
 if(!indexes.length)await connection.query('ALTER TABLE documents ADD KEY idx_documents_category (category_id)');
 const [keys]=await connection.query("SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='documents' AND CONSTRAINT_NAME='fk_documents_category'");
 if(!keys.length)await connection.query('ALTER TABLE documents ADD CONSTRAINT fk_documents_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL');
 console.log('Document category migration applied successfully.');
}finally{connection.release();await pool.end()}

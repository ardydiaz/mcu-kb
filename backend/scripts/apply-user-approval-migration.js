import 'dotenv/config';
import { query } from '../src/config/database.js';

await query("ALTER TABLE users MODIFY COLUMN status ENUM('pending','active','inactive') NOT NULL DEFAULT 'pending'");
await query("INSERT INTO roles (id,name,description) VALUES (3,'student','Default authenticated knowledge-base access without admin privileges') ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description)");
const users=await query('SELECT id,email,role_id,status FROM users ORDER BY id');
console.log(JSON.stringify(users,null,2));
process.exit(0);

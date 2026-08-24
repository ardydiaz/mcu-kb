import 'dotenv/config';
import CategoryService from '../src/services/CategoryService.js';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';

const [user]=await query('SELECT id FROM users ORDER BY id LIMIT 1');
if(!user) throw new Error('A user account is required for the category audit fields');
const name=`CRUD verification ${Date.now()}`;
let created;
try {
  created=await CategoryService.create({name,description:'Temporary verification category'},user.id);
  const listed=await CategoryService.list({search:name});
  if(!listed.some(item=>item.id===created.id)) throw new Error('Created category was not listed');
  const updated=await CategoryService.update(created.id,{name:`${name} updated`,description:'Updated'},user.id);
  if(updated.description!=='Updated') throw new Error('Category was not updated');
  await CategoryService.remove(created.id,user.id);
  const active=await CategoryService.list({search:name});
  const deleted=await CategoryService.list({search:name,includeDeleted:true});
  if(active.some(item=>item.id===created.id)||!deleted.some(item=>item.id===created.id&&item.deleted_at)) throw new Error('Soft delete verification failed');
  console.log('Category create, list, update, and soft delete verified.');
} finally {
  if(created) await query('DELETE FROM categories WHERE id=:id',{id:created.id});
  await pool.end();
}

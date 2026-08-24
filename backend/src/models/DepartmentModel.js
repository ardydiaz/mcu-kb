import { query } from '../config/database.js';
const select=`SELECT d.id,d.name,d.code,d.description,d.created_by,d.updated_by,d.created_at,d.updated_at,d.deleted_at,creator.fullname created_by_name,editor.fullname updated_by_name FROM departments d LEFT JOIN users creator ON creator.id=d.created_by LEFT JOIN users editor ON editor.id=d.updated_by`;
export default class DepartmentModel{
 static list({search='',includeDeleted=false}={}){const filters=[];const params={search:`%${search}%`};if(!includeDeleted)filters.push('d.deleted_at IS NULL');if(search)filters.push('(d.name LIKE :search OR d.code LIKE :search OR d.description LIKE :search)');return query(`${select}${filters.length?` WHERE ${filters.join(' AND ')}`:''} ORDER BY d.name`,params)}
 static byId(id){return query(`${select} WHERE d.id=:id AND d.deleted_at IS NULL LIMIT 1`,{id}).then(rows=>rows[0])}
 static duplicate(name,code,excludeId=null){return query(`SELECT id,name,code,deleted_at FROM departments WHERE (LOWER(name)=LOWER(:name) OR (:code IS NOT NULL AND LOWER(code)=LOWER(:code)))${excludeId?' AND id<>:excludeId':''} LIMIT 1`,{name,code,excludeId}).then(rows=>rows[0])}
 static create(values){return query('INSERT INTO departments (name,code,description,created_by,updated_by) VALUES (:name,:code,:description,:userId,:userId)',values)}
 static update(id,values){return query('UPDATE departments SET name=:name,code=:code,description=:description,updated_by=:userId,updated_at=NOW() WHERE id=:id AND deleted_at IS NULL',{id,...values})}
 static softDelete(id,userId){return query('UPDATE departments SET deleted_at=NOW(),updated_by=:userId,updated_at=NOW() WHERE id=:id AND deleted_at IS NULL',{id,userId})}
}

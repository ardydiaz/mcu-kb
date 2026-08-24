import { query } from '../config/database.js';

const select = `SELECT c.id,c.name,c.slug,c.description,c.parent_id,c.display_order,c.status,c.requires_department,p.name parent_name,c.created_by,c.updated_by,
  c.created_at,c.updated_at,c.deleted_at,
  creator.fullname created_by_name,editor.fullname updated_by_name
  FROM categories c
  LEFT JOIN categories p ON p.id=c.parent_id
  LEFT JOIN users creator ON creator.id=c.created_by
  LEFT JOIN users editor ON editor.id=c.updated_by`;

export default class CategoryModel {
  static list({ search='', includeDeleted=false }={}) {
    const filters=[];
    const params={ search:`%${search}%` };
    if(!includeDeleted) filters.push('c.deleted_at IS NULL');
    if(search) filters.push('(c.name LIKE :search OR c.description LIKE :search)');
    return query(`${select}${filters.length?` WHERE ${filters.join(' AND ')}`:''} ORDER BY COALESCE(p.display_order,c.display_order),c.parent_id IS NOT NULL,c.display_order,c.name`,params);
  }
  static byId(id,{ includeDeleted=false }={}) {
    return query(`${select} WHERE c.id=:id${includeDeleted?'':' AND c.deleted_at IS NULL'} LIMIT 1`,{id}).then(rows=>rows[0]);
  }
  static bySlug(slug,{ excludeId=null }={}) {
    return query(`SELECT id FROM categories WHERE slug=:slug${excludeId?' AND id<>:excludeId':''} LIMIT 1`,{slug,excludeId}).then(rows=>rows[0]);
  }
  static duplicate(name,parentId,excludeId=null){return query(`SELECT id FROM categories WHERE deleted_at IS NULL AND LOWER(name)=LOWER(:name) AND parent_id <=> :parentId${excludeId?' AND id<>:excludeId':''} LIMIT 1`,{name,parentId,excludeId}).then(rows=>rows[0])}
  static create({ name,slug,description,parentId,displayOrder,status,requiresDepartment,createdBy }) {
    return query('INSERT INTO categories (name,slug,description,parent_id,display_order,status,requires_department,created_by,updated_by) VALUES (:name,:slug,:description,:parentId,:displayOrder,:status,:requiresDepartment,:createdBy,:createdBy)',{name,slug,description,parentId,displayOrder,status,requiresDepartment,createdBy});
  }
  static update(id,{ name,slug,description,parentId,displayOrder,status,requiresDepartment,updatedBy }) {
    return query('UPDATE categories SET name=:name,slug=:slug,description=:description,parent_id=:parentId,display_order=:displayOrder,status=:status,requires_department=:requiresDepartment,updated_by=:updatedBy,updated_at=NOW() WHERE id=:id AND deleted_at IS NULL',{id,name,slug,description,parentId,displayOrder,status,requiresDepartment,updatedBy});
  }
  static softDelete(id,updatedBy) {
    return query('UPDATE categories SET deleted_at=NOW(),updated_by=:updatedBy,updated_at=NOW() WHERE id=:id AND deleted_at IS NULL',{id,updatedBy});
  }
  static childCount(id){return query('SELECT COUNT(*) count FROM categories WHERE parent_id=:id AND deleted_at IS NULL',{id}).then(rows=>Number(rows[0].count))}
}

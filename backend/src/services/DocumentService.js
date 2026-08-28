import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pool,{query} from '../config/database.js';
import { uploadDirectory } from '../config/multer.js';
import DocumentProcessingService from './DocumentProcessingService.js';
import {analyzeSearch,isRelevant,scoreSearchText} from '../utils/searchRelevance.js';
import QdrantService from './QdrantService.js';

const admin=user=>[1,2].includes(Number(user?.role_id));
const clean=value=>String(value||'').trim();
const parseList=value=>{if(Array.isArray(value))return value.map(String).map(x=>x.trim()).filter(Boolean);if(!value)return[];try{const parsed=JSON.parse(value);if(Array.isArray(parsed))return parsed.map(String).map(x=>x.trim()).filter(Boolean)}catch{}return String(value).split(',').map(x=>x.trim()).filter(Boolean)};
const parseTags=value=>parseList(value).slice(0,30);
const safeJson=value=>{try{return typeof value==='string'?JSON.parse(value):value||[]}catch{return[]}};
const latestVersionJoin=`JOIN document_versions v ON v.document_id=d.id AND v.version_number=(SELECT MAX(v2.version_number) FROM document_versions v2 WHERE v2.document_id=d.id)`;
const departmentExpr=`COALESCE(dep.name,d.department)`;
const documentFrom=`FROM documents d ${latestVersionJoin} LEFT JOIN categories c ON c.id=d.category_id LEFT JOIN categories cp ON cp.id=c.parent_id LEFT JOIN departments dep ON dep.id=d.department_id JOIN users u ON u.id=d.uploaded_by LEFT JOIN users a ON a.id=d.approved_by`;
const selectDocument=`SELECT d.*,${departmentExpr} department_name,dep.code department_code,c.name category_name,c.parent_id category_parent_id,cp.id collection_id,cp.name collection_name,v.id version_id,v.version_number,v.original_name,v.stored_name,v.mime_type,v.file_size,v.created_at version_created_at,u.fullname uploader_name,a.fullname approver_name ${documentFrom}`;
const mapDocument=row=>({...row,department:row.department_name||row.department,tags:safeJson(row.tags),size:Number(row.file_size),url:`/api/documents/${row.id}/download`});
const audit=async(executor,documentId,userId,action,metadata={})=>executor.execute('INSERT INTO document_audit_logs (document_id,user_id,action,metadata) VALUES (:documentId,:userId,:action,:metadata)',{documentId,userId,action,metadata:JSON.stringify(metadata)});
const syncVectorPayload=async documentId=>QdrantService.syncDocument(documentId).catch(error=>console.error('Unable to synchronize Qdrant document payload:',error.message));

export function accessSql(user,permission='view'){
  if(admin(user))return{clause:'1=1',params:{}};
  const capability=permission==='download'?'p.can_download=1':'p.can_view=1';
  return{clause:`(d.visibility='public' OR (d.visibility='internal' AND LOWER(COALESCE((SELECT da.name FROM departments da WHERE da.id=d.department_id),d.department))=LOWER(:userDepartment)) OR (d.visibility='restricted' AND EXISTS (SELECT 1 FROM document_permissions p WHERE p.document_id=d.id AND ${capability} AND ((p.principal_type='role' AND p.principal_value=:userRole) OR (p.principal_type='department' AND LOWER(p.principal_value)=LOWER(:userDepartment))))))`,params:{userDepartment:clean(user?.department),userRole:String(user?.role_id??'')}};
}

export default class DocumentService {
  static async create(file,metadata,user){
    let departmentId=null,department=null;let visibility=['public','internal','restricted'].includes(metadata.visibility)?metadata.visibility:'public';
    const categoryId=metadata.category_id?Number(metadata.category_id):null;
    const categories=categoryId?await query("SELECT id,requires_department FROM categories WHERE id=:categoryId AND parent_id IS NOT NULL AND status='active' AND deleted_at IS NULL LIMIT 1",{categoryId}):[];if(!categories.length)throw Object.assign(new Error('Select a valid knowledge section'),{status:422,errors:{category_id:'Select an active child section.'}});const requiresDepartment=Boolean(categories[0].requires_department);
    if(requiresDepartment){departmentId=Number(metadata.department_id);const departments=await query('SELECT id,name FROM departments WHERE id=:departmentId AND deleted_at IS NULL LIMIT 1',{departmentId});if(!departments.length)throw Object.assign(new Error('Select a valid department'),{status:422,errors:{department_id:'This section requires an owning department.'}});department=departments[0].name}else if(visibility==='internal')throw Object.assign(new Error('Select a valid visibility'),{status:422,errors:{visibility:'Department-only access is unavailable for this section.'}});
    const id=crypto.randomUUID();const versionId=crypto.randomUUID();const tags=parseTags(metadata.tags);
    const connection=await pool.getConnection();
    try{
      await connection.beginTransaction();
      await connection.execute('INSERT INTO documents (id,title,department,department_id,category_id,description,tags,visibility,status,uploaded_by) VALUES (:id,:title,:department,:departmentId,:categoryId,:description,:tags,:visibility,\'pending\',:uploadedBy)',{id,title:clean(metadata.title)||path.parse(file.originalname).name,department,departmentId,categoryId,description:clean(metadata.description)||null,tags:JSON.stringify(tags),visibility,uploadedBy:user.id});
      await connection.execute('INSERT INTO document_versions (id,document_id,version_number,original_name,stored_name,mime_type,file_size,uploaded_by) VALUES (:versionId,:id,1,:originalName,:storedName,:mimeType,:fileSize,:uploadedBy)',{versionId,id,originalName:file.originalname,storedName:file.filename,mimeType:file.mimetype,fileSize:file.size,uploadedBy:user.id});
      await this.replacePermissions(id,{roles:metadata.allowed_role_ids,departments:metadata.allowed_departments},connection);
      await audit(connection,id,user.id,'uploaded',{visibility,department,original_name:file.originalname});
      await connection.commit();
      await DocumentProcessingService.queue(id,versionId).catch(error=>console.error('Unable to queue document indexing:',error));
      return this.find(id,user);
    }catch(error){await connection.rollback();await fs.unlink(file.path).catch(()=>{});throw error}finally{connection.release()}
  }

  static async replacePermissions(documentId,access,executor=pool){
    const roles=parseList(access.roles).filter(value=>[1,2,3].includes(Number(value)));
    const departments=parseList(access.departments).slice(0,50);
    await executor.execute('DELETE FROM document_permissions WHERE document_id=:documentId',{documentId});
    for(const role of roles)await executor.execute("INSERT INTO document_permissions (document_id,principal_type,principal_value) VALUES (:documentId,'role',:value)",{documentId,value:String(role)});
    for(const department of departments)await executor.execute("INSERT INTO document_permissions (document_id,principal_type,principal_value) VALUES (:documentId,'department',:value)",{documentId,value:department});
    return{roles,departments};
  }

  static async permissions(documentId){const rows=await query('SELECT principal_type,principal_value FROM document_permissions WHERE document_id=:documentId ORDER BY principal_type,principal_value',{documentId});return{allowed_role_ids:rows.filter(row=>row.principal_type==='role').map(row=>Number(row.principal_value)),allowed_departments:rows.filter(row=>row.principal_type==='department').map(row=>row.principal_value)}}

  static async update(id,metadata,user){
    const title=clean(metadata.title);const categoryId=metadata.category_id?Number(metadata.category_id):null;let departmentId=null,department=null;const visibility=['public','internal','restricted'].includes(metadata.visibility)?metadata.visibility:'public';
    const categories=categoryId?await query("SELECT id,requires_department FROM categories WHERE id=:categoryId AND parent_id IS NOT NULL AND status='active' AND deleted_at IS NULL LIMIT 1",{categoryId}):[];if(!categories.length)throw Object.assign(new Error('Select a valid knowledge section'),{status:422,errors:{category_id:'Select an active child section.'}});const requiresDepartment=Boolean(categories[0].requires_department);
    if(requiresDepartment){departmentId=Number(metadata.department_id);const departments=await query('SELECT id,name FROM departments WHERE id=:departmentId AND deleted_at IS NULL LIMIT 1',{departmentId});if(!departments.length)throw Object.assign(new Error('Select a valid department'),{status:422,errors:{department_id:'This section requires an owning department.'}});department=departments[0].name}else if(visibility==='internal')throw Object.assign(new Error('Select a valid visibility'),{status:422,errors:{visibility:'Department-only access is unavailable for this section.'}});
    const connection=await pool.getConnection();try{await connection.beginTransaction();const [result]=await connection.execute('UPDATE documents SET title=:title,department=:department,department_id=:departmentId,category_id=:categoryId,tags=:tags,visibility=:visibility,updated_at=NOW() WHERE id=:id',{id,title,department,departmentId,categoryId,tags:JSON.stringify(parseTags(metadata.tags)),visibility});if(!result.affectedRows){await connection.rollback();return null}await this.replacePermissions(id,{roles:metadata.allowed_role_ids,departments:metadata.allowed_departments},connection);await audit(connection,id,user.id,'metadata_updated',{title,category_id:categoryId,department_id:departmentId,visibility});await connection.commit();await syncVectorPayload(id);const document=await this.find(id,user);return{...document,...await this.permissions(id)}}catch(error){await connection.rollback();throw error}finally{connection.release()}
  }

  static async search({q='',department='',type='',status='',limit=10,page=1,user,includePagination=false}={}){
    const access=accessSql(user);const size=Math.min(Math.max(Number(limit)||10,1),50);const currentPage=Math.max(Number(page)||1,1);const offset=(currentPage-1)*size;const search=clean(q);const analysis=analyzeSearch(search),concepts=analysis.concepts;const params={...access.params,exact:`%${search}%`,department:clean(department),type:clean(type),status:clean(status)};
    const fields=['d.title','v.original_name','d.tags','d.description',departmentExpr,'c.name'];
    const matches=concepts.map((variants,conceptIndex)=>`(${variants.map((term,variantIndex)=>{const key=`term${conceptIndex}_${variantIndex}`;params[key]=`%${term}%`;return fields.map(field=>`${field} LIKE :${key}`).join(' OR ')}).join(' OR ')})`);
    const rankParts=concepts.flatMap((variants,conceptIndex)=>variants.flatMap((_,variantIndex)=>{const key=`term${conceptIndex}_${variantIndex}`;return[`IF(d.title LIKE :${key},25,0)`,`IF(v.original_name LIKE :${key},18,0)`,`IF(d.tags LIKE :${key},8,0)`,`IF(c.name LIKE :${key},12,0)`,`IF(${departmentExpr} LIKE :${key},10,0)`,`IF(d.description LIKE :${key},4,0)`]}));
    // Require every meaningful query term to match somewhere in the document
    // metadata. This prevents a broad department term such as "ITD" from
    // returning policies when the user specifically searches for "ITD Forms".
    const searchWhere=search?(matches.length?`(${matches.join(' AND ')})`:`(d.title LIKE :exact OR v.original_name LIKE :exact)`):'1=1';
    const ranking=search?`(IF(d.title LIKE :exact,100,0)+IF(v.original_name LIKE :exact,80,0)+${rankParts.length?rankParts.join('+'):'0'}) DESC,`:'';
    const where=`WHERE ${admin(user)?"(:status='' OR d.status=:status)":"d.status='published'"} AND ${access.clause} AND ${searchWhere} AND (:department='' OR LOWER(${departmentExpr})=LOWER(:department)) AND (:type='' OR (:type='pdf' AND v.mime_type LIKE '%pdf%') OR (:type='word' AND v.mime_type LIKE '%word%') OR (:type='sheet' AND (v.mime_type LIKE '%excel%' OR v.mime_type LIKE '%spreadsheet%')))`;
    let rows=await query(`${selectDocument} ${where} ORDER BY ${ranking}d.updated_at DESC LIMIT ${size} OFFSET ${offset}`,params);
    // If strict concept matching misses because of a small spelling difference,
    // score the permitted metadata in memory using edit-distance tolerance.
    if(search&&!rows.length&&!includePagination){
      const fallbackWhere=`WHERE ${admin(user)?"(:status='' OR d.status=:status)":"d.status='published'"} AND ${access.clause} AND (:department='' OR LOWER(${departmentExpr})=LOWER(:department)) AND (:type='' OR (:type='pdf' AND v.mime_type LIKE '%pdf%') OR (:type='word' AND v.mime_type LIKE '%word%') OR (:type='sheet' AND (v.mime_type LIKE '%excel%' OR v.mime_type LIKE '%spreadsheet%')))`;
      const candidates=await query(`${selectDocument} ${fallbackWhere} ORDER BY d.updated_at DESC LIMIT 500`,params);
      const ranked=candidates.map(row=>{const searchable=[row.title,row.original_name,row.category_name,row.department_name,row.tags].filter(Boolean).join(' ');return{row,relevance:scoreSearchText(searchable,analysis,{phraseWeight:100,coverageWeight:70})}}).filter(item=>isRelevant(item.relevance)).sort((a,b)=>b.relevance.score-a.relevance.score);const best=ranked[0]?.relevance.score||0;rows=ranked.filter(item=>best<45||item.relevance.score>=best*.75).slice(offset,offset+size).map(item=>item.row);
    }
    const data=rows.map(mapDocument);
    if(!includePagination)return data;
    const totals=await query(`SELECT COUNT(*) total ${documentFrom} ${where}`,params);const total=Number(totals[0]?.total||0);const totalPages=Math.max(Math.ceil(total/size),1);
    return{data,pagination:{page:Math.min(currentPage,totalPages),per_page:size,total,total_pages:totalPages}};
  }

  static async addVersion(documentId,file,user){
    const document=await this.find(documentId,user);if(!document)throw Object.assign(new Error('Document not found'),{status:404});
    const connection=await pool.getConnection();
    try{await connection.beginTransaction();const [versions]=await connection.execute('SELECT COALESCE(MAX(version_number),0)+1 next_version FROM document_versions WHERE document_id=:documentId FOR UPDATE',{documentId});const versionNumber=Number(versions[0].next_version),versionId=crypto.randomUUID();await connection.execute('INSERT INTO document_versions (id,document_id,version_number,original_name,stored_name,mime_type,file_size,uploaded_by) VALUES (:id,:documentId,:versionNumber,:originalName,:storedName,:mimeType,:fileSize,:uploadedBy)',{id:versionId,documentId,versionNumber,originalName:file.originalname,storedName:file.filename,mimeType:file.mimetype,fileSize:file.size,uploadedBy:user.id});await connection.execute("UPDATE documents SET status='pending',approved_by=NULL,approved_at=NULL,updated_at=NOW() WHERE id=:documentId",{documentId});await audit(connection,documentId,user.id,'version_uploaded',{version_number:versionNumber,original_name:file.originalname});await connection.commit();await DocumentProcessingService.queue(documentId,versionId).catch(error=>console.error('Unable to queue document indexing:',error));return this.find(documentId,user)}catch(error){await connection.rollback();await fs.unlink(file.path).catch(()=>{});throw error}finally{connection.release()}
  }

  static async listAdmin(filters={},user){return this.search({...filters,status:filters.status||'',limit:filters.limit||10,page:filters.page||1,user,includePagination:true})}

  static async suggestions(value,user){
    const needle=clean(value).toLowerCase();if(needle.length<2)return[];const access=accessSql(user);const params={...access.params,pattern:`%${needle}%`};
    const rows=await query(`SELECT c.name category_name,d.tags FROM documents d LEFT JOIN categories c ON c.id=d.category_id WHERE d.status='published' AND ${access.clause} AND (LOWER(COALESCE(c.name,'')) LIKE :pattern OR LOWER(COALESCE(d.tags,'')) LIKE :pattern) ORDER BY d.updated_at DESC LIMIT 150`,params);
    const suggestions=new Map();const add=(label,type)=>{const text=clean(label);if(!text||!text.toLowerCase().includes(needle))return;const key=`${type}:${text.toLowerCase()}`;const current=suggestions.get(key);suggestions.set(key,current?{...current,count:current.count+1}:{value:text,type,count:1})};
    for(const row of rows){add(row.category_name,'section');for(const tag of safeJson(row.tags))add(tag,'tag')}
    return [...suggestions.values()].sort((a,b)=>Number(b.value.toLowerCase().startsWith(needle))-Number(a.value.toLowerCase().startsWith(needle))||b.count-a.count||a.value.localeCompare(b.value)).slice(0,8);
  }

  static async find(id,user,permission='view'){
    const rows=await query(`${selectDocument} WHERE d.id=:id LIMIT 1`,{id});const document=rows[0];if(!document)return null;
    if(!admin(user)&&document.status!=='published')return null;
    const access=accessSql(user,permission);const allowed=await query(`SELECT EXISTS(SELECT 1 FROM documents d WHERE d.id=:id AND ${access.clause}) allowed`,{id,...access.params});
    return allowed[0]?.allowed?mapDocument(document):null;
  }

  static async updateStatus(id,status,user){
    if(!['pending','published','rejected','archived'].includes(status))throw Object.assign(new Error('Invalid document status'),{status:422});
    const result=await query("UPDATE documents SET status=:status,approved_by=IF(:status='published',:userId,NULL),approved_at=IF(:status='published',NOW(),NULL) WHERE id=:id",{id,status,userId:user.id});
    if(!result.affectedRows)return null;await audit(pool,id,user.id,'status_changed',{status});await syncVectorPayload(id);return this.find(id,user);
  }

  static async updateAccess(id,{visibility,roles,departments},user){
    if(!['public','internal','restricted'].includes(visibility))throw Object.assign(new Error('Invalid visibility'),{status:422});
    const connection=await pool.getConnection();
    try{await connection.beginTransaction();const [result]=await connection.execute('UPDATE documents SET visibility=:visibility WHERE id=:id',{id,visibility});if(!result.affectedRows){await connection.rollback();return null}const permissions=await this.replacePermissions(id,{roles,departments},connection);await audit(connection,id,user.id,'access_changed',{visibility,...permissions});await connection.commit();await syncVectorPayload(id);return this.find(id,user)}catch(error){await connection.rollback();throw error}finally{connection.release()}
  }

  static async stats(){const rows=await query("SELECT COUNT(*) documents,COUNT(DISTINCT department) departments FROM documents WHERE status='published'");return{documents:Number(rows[0]?.documents||0),departments:Number(rows[0]?.departments||0)}}
  static async browse(user){
    const access=accessSql(user);const rows=await query(`${selectDocument} WHERE d.status='published' AND d.category_id IS NOT NULL AND c.deleted_at IS NULL AND c.status='active' AND (d.department_id IS NULL OR dep.deleted_at IS NULL) AND ${access.clause} ORDER BY COALESCE(cp.display_order,c.display_order),c.display_order,d.title LIMIT 500`,access.params);const collections=new Map();
    for(const row of rows){const document=mapDocument(row),collectionId=row.collection_id||row.category_id,collectionName=row.collection_name||row.category_name;if(!collections.has(collectionId))collections.set(collectionId,{id:collectionId,name:collectionName,document_count:0,sections:[]});const collection=collections.get(collectionId);let section=collection.sections.find(item=>Number(item.id)===Number(row.category_id));if(!section){section={id:row.category_id,name:row.category_parent_id?row.category_name:'General',document_count:0,documents:[]};collection.sections.push(section)}section.documents.push({...document,view_url:`/documents/${document.id}?returnTo=${encodeURIComponent('/systems')}`});section.document_count++;collection.document_count++}
    return [...collections.values()];
  }
  static async departments(user){const access=accessSql(user);const rows=await query(`SELECT d.department name,COUNT(*) document_count FROM documents d WHERE d.status='published' AND ${access.clause} GROUP BY d.department ORDER BY d.department`,access.params);return rows.map((row,index)=>({id:index+1,name:row.name,description:`${row.document_count} approved ${Number(row.document_count)===1?'document':'documents'}`,category_name:'Department collection',url:`/search?q=${encodeURIComponent(row.name)}`}))}
  static async recent(limit=8){const rows=await query(`${selectDocument} WHERE d.status='published' ORDER BY d.updated_at DESC LIMIT ${Math.min(Number(limit)||8,20)}`);return rows.map(mapDocument)}

  static async remove(id,user){
    const versions=await query('SELECT stored_name FROM document_versions WHERE document_id=:id',{id});const connection=await pool.getConnection();
    try{await connection.beginTransaction();await audit(connection,id,user.id,'deleted');const [result]=await connection.execute('DELETE FROM documents WHERE id=:id',{id});await connection.commit();if(!result.affectedRows)return null;await QdrantService.removeDocument(id).catch(error=>console.error('Unable to remove Qdrant document:',error.message));for(const version of versions)await fs.unlink(path.join(uploadDirectory,version.stored_name)).catch(error=>{if(error.code!=='ENOENT')console.error(error)});return{id}}catch(error){await connection.rollback();throw error}finally{connection.release()}
  }
}

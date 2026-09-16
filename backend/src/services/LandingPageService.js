import {query} from '../config/database.js';
const slugs=new Set(['accreditation','basic-education','senior-high-school']);
const fail=(status,message,errors)=>{throw Object.assign(new Error(message),{status,errors})};
const validSlug=slug=>{if(!slugs.has(slug))fail(404,'Landing page not found');return slug};
const cleanValue=value=>{if(typeof value==='string')return value.trim().slice(0,5000);if(Array.isArray(value))return value.slice(0,20).map(cleanValue);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).slice(0,100).map(([key,item])=>[key.slice(0,100),cleanValue(item)]));return value};
const parse=value=>{try{return typeof value==='string'?JSON.parse(value):value||{}}catch{return{}}};
export default class LandingPageService{
 static async show(slug){validSlug(slug);const row=(await query('SELECT page_slug,content_json,updated_at FROM landing_page_content WHERE page_slug=:slug LIMIT 1',{slug}))[0];return row?{slug:row.page_slug,content:parse(row.content_json),updated_at:row.updated_at}:{slug,content:{},updated_at:null}}
 static async list(){const rows=await query('SELECT page_slug,updated_at FROM landing_page_content ORDER BY page_slug');return [...slugs].map(slug=>rows.find(row=>row.page_slug===slug)||{page_slug:slug,updated_at:null})}
 static async save(slug,payload,userId){validSlug(slug);const raw=payload?.content;if(!raw||typeof raw!=='object'||Array.isArray(raw))fail(422,'Please correct the highlighted fields',{content:'Page content must be a valid object.'});const content=cleanValue(raw),serialized=JSON.stringify(content);if(Buffer.byteLength(serialized)>200000)fail(422,'Please correct the highlighted fields',{content:'Page content is too large.'});await query('INSERT INTO landing_page_content (page_slug,content_json,updated_by) VALUES (:slug,:content,:userId) ON DUPLICATE KEY UPDATE content_json=:content,updated_by=:userId,updated_at=NOW()',{slug,content:serialized,userId});return this.show(slug)}
}

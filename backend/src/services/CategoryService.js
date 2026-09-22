import slugify from '../helpers/slugify.js';
import CategoryModel from '../models/CategoryModel.js';

const httpError=(status,message,errors)=>Object.assign(new Error(message),{status,errors});
function clean(payload={}) {
  const name=String(payload.name||'').trim();
  const description=String(payload.description||'').trim()||null;
  if(!name) throw httpError(422,'Please correct the highlighted fields',{name:'Category name is required.'});
  if(name.length<2||name.length>120) throw httpError(422,'Please correct the highlighted fields',{name:'Category name must be between 2 and 120 characters.'});
  if(description?.length>500) throw httpError(422,'Please correct the highlighted fields',{description:'Description must not exceed 500 characters.'});
  const slug=slugify(name);
  if(!slug) throw httpError(422,'Please correct the highlighted fields',{name:'Category name must contain letters or numbers.'});
  const parentId=payload.parent_id?Number(payload.parent_id):null;const displayOrder=Math.max(0,Number(payload.display_order)||0);const status=['active','inactive'].includes(payload.status)?payload.status:'active';const requiresDepartment=Boolean(parentId)&&(payload.requires_department===true||payload.requires_department==='true'||payload.requires_department===1);
  return {name,description,slug,parentId,displayOrder,status,requiresDepartment};
}

export default class CategoryService {
  static list(options) { return CategoryModel.list(options); }
  static async create(payload,userId) {
    const values=clean(payload);let parent=null;if(values.parentId){parent=await CategoryModel.byId(values.parentId);if(!parent||parent.parent_id)throw httpError(422,'Please correct the highlighted fields',{parent_id:'Select a valid top-level collection.'})}values.slug=parent?`${parent.slug}-${values.slug}`:values.slug;
    if(await CategoryModel.duplicate(values.name,values.parentId)) throw httpError(409,'Please correct the highlighted fields',{name:'This name already exists in the selected collection.'});
    const result=await CategoryModel.create({...values,createdBy:userId});
    return CategoryModel.byId(result.insertId);
  }
  static async update(id,payload,userId) {
    if(!await CategoryModel.byId(id)) throw httpError(404,'Category not found');
    const values=clean(payload);if(Number(values.parentId)===Number(id))throw httpError(422,'Please correct the highlighted fields',{parent_id:'A category cannot be its own parent.'});let parent=null;if(values.parentId){parent=await CategoryModel.byId(values.parentId);if(!parent||parent.parent_id)throw httpError(422,'Please correct the highlighted fields',{parent_id:'Select a valid top-level collection.'})}values.slug=parent?`${parent.slug}-${values.slug}`:values.slug;
    if(await CategoryModel.duplicate(values.name,values.parentId,id)) throw httpError(409,'Please correct the highlighted fields',{name:'This name already exists in the selected collection.'});
    await CategoryModel.update(id,{...values,updatedBy:userId});
    return CategoryModel.byId(id);
  }
  static async publicMenu() {
    const items=(await CategoryModel.list({includeDeleted:false})).filter(item=>item.status==='active');
    const roots=items.filter(item=>!item.parent_id);
    return roots.map(root=>({id:root.id,name:root.name,slug:root.slug,sections:items.filter(child=>Number(child.parent_id)===Number(root.id)).map(child=>({id:child.id,name:child.name,slug:child.slug,requires_department:Boolean(child.requires_department)}))}));
  }
  static async remove(id,userId) {
    const existing=await CategoryModel.byId(id);
    if(!existing) throw httpError(404,'Category not found');
    if(await CategoryModel.childCount(id))throw httpError(409,'Remove or move the child sections before deleting this collection');
    await CategoryModel.softDelete(id,userId);
    return existing;
  }
}

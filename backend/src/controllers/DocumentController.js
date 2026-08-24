import path from 'node:path';
import fs from 'node:fs/promises';
import DocumentService from '../services/DocumentService.js';
import { uploadDirectory } from '../config/multer.js';

const hasSelection=value=>{if(Array.isArray(value))return value.length>0;const text=String(value||'').trim();if(!text)return false;try{const parsed=JSON.parse(text);return Array.isArray(parsed)?parsed.length>0:Boolean(parsed)}catch{return text.split(',').some(item=>item.trim())}};

export default class DocumentController {
  static async upload(req,res){
    const errors={};const title=String(req.body.title||'').trim(),description=String(req.body.description||'').trim(),visibility=String(req.body.visibility||'public');
    if(!req.file)errors.file='A PDF, Word, or Excel file is required.';
    if(!title)errors.title='Document title is required.';else if(title.length>255)errors.title='Document title must not exceed 255 characters.';
    if(!req.body.category_id||!Number.isInteger(Number(req.body.category_id)))errors.category_id='Select a valid category.';
    if(description.length>5000)errors.description='Description must not exceed 5,000 characters.';
    if(!['public','internal','restricted'].includes(visibility))errors.visibility='Select a valid visibility option.';
    if(String(req.body.tags||'').length>500)errors.tags='Search tags must not exceed 500 characters.';
    if(visibility==='restricted'&&!hasSelection(req.body.allowed_role_ids)&&!hasSelection(req.body.allowed_departments))errors.access='Select at least one allowed role or department.';
    if(Object.keys(errors).length){if(req.file)await fs.unlink(req.file.path).catch(()=>{});return res.status(422).json({message:'Please correct the highlighted fields',errors})}
    try{const document=await DocumentService.create(req.file,req.body,req.user);res.status(201).json({message:'Document uploaded and is waiting for approval',data:document})}
    catch(error){await fs.unlink(req.file.path).catch(()=>{});throw error}
  }

  static async uploadVersion(req,res){if(!req.file)return res.status(400).json({message:'Select a document to upload'});try{const document=await DocumentService.addVersion(req.params.id,req.file,req.user);res.status(201).json({message:'New document version uploaded and is waiting for approval',data:document})}catch(error){await fs.unlink(req.file.path).catch(()=>{});throw error}}

  static async search(req,res){if(String(req.query.q||'').length>200)return res.status(422).json({message:'Search query is too long'});res.json({data:await DocumentService.search({...req.query,user:req.user})})}
  static async adminList(req,res){res.json({data:await DocumentService.listAdmin(req.query,req.user)})}

  static async show(req,res){const document=await DocumentService.find(req.params.id,req.user);if(!document)return res.status(404).json({message:'Document not found or access denied'});res.json({data:document})}

  static async download(req,res){
    const document=await DocumentService.find(req.params.id,req.user,'download');
    if(!document)return res.status(404).json({message:'Document not found or access denied'});
    const filePath=path.join(uploadDirectory,document.stored_name);
    try{await fs.access(filePath)}catch{return res.status(404).json({message:'Stored file is unavailable'})}
    res.download(filePath,document.original_name);
  }

  static async updateStatus(req,res){const document=await DocumentService.updateStatus(req.params.id,String(req.body.status||''),req.user);if(!document)return res.status(404).json({message:'Document not found'});res.json({message:`Document status changed to ${document.status}`,data:document})}

  static async updateAccess(req,res){const document=await DocumentService.updateAccess(req.params.id,{visibility:req.body.visibility,roles:req.body.allowed_role_ids,departments:req.body.allowed_departments},req.user);if(!document)return res.status(404).json({message:'Document not found'});res.json({message:'Document access policy updated',data:document})}

  static async remove(req,res){const document=await DocumentService.remove(req.params.id,req.user);if(!document)return res.status(404).json({message:'Document not found'});res.json({message:'Document removed successfully'})}
}

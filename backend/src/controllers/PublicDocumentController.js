import fs from 'node:fs/promises';
import path from 'node:path';
import DocumentService from '../services/DocumentService.js';
import { uploadDirectory } from '../config/multer.js';

export default class PublicDocumentController {
 static async search(req,res){
 const query=String(req.query.q||'').trim();
  if(!query)return res.status(422).json({message:'Please correct the highlighted fields',errors:{q:'Enter a document title, department, category, or keyword.'}});
  if(query.length<2)return res.status(422).json({message:'Please correct the highlighted fields',errors:{q:'Search must contain at least 2 characters.'}});
  if(query.length>200)return res.status(422).json({message:'Please correct the highlighted fields',errors:{q:'Search must not exceed 200 characters.'}});
  const documents=await DocumentService.search({q:query,department:req.query.department,type:req.query.type,limit:30,user:req.user});
  const returnParams=new URLSearchParams();
  if(query)returnParams.set('q',query);
  if(req.query.type)returnParams.set('type',String(req.query.type));
  const returnTo=`/search${returnParams.size?`?${returnParams.toString()}`:''}`;
  res.json({data:documents.map(document=>({...document,url:`/documents/${document.id}?returnTo=${encodeURIComponent(returnTo)}`}))});
 }
 static async show(req,res){const document=await DocumentService.find(req.params.id,req.user);if(!document)return res.status(404).json({message:'Document not found or access denied'});res.json({data:{...document,preview_url:`/api/public/documents/${document.id}/preview`}})}
 static async preview(req,res){
  const document=await DocumentService.find(req.params.id,req.user,'view');
  if(!document)return res.status(404).json({message:'Document not found or access denied'});
  const filePath=path.join(uploadDirectory,document.stored_name);
  try{await fs.access(filePath)}catch{return res.status(404).json({message:'Stored file is unavailable'})}
  res.setHeader('Content-Type',document.mime_type);
  res.setHeader('Content-Disposition',`inline; filename*=UTF-8''${encodeURIComponent(document.original_name)}`);
  res.sendFile(filePath);
 }
}

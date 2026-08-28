import fs from 'node:fs/promises';
import path from 'node:path';
import DocumentService from '../services/DocumentService.js';
import { uploadDirectory } from '../config/multer.js';
import DocumentPreviewService from '../services/DocumentPreviewService.js';
import KnowledgeSearchService from '../services/KnowledgeSearchService.js';

const matchesType=(document,type)=>!type||(type==='pdf'&&document.mime_type?.includes('pdf'))||(type==='word'&&document.mime_type?.includes('word'))||(type==='sheet'&&(document.mime_type?.includes('excel')||document.mime_type?.includes('spreadsheet')));

export default class PublicDocumentController {
 static async search(req,res){
 const query=String(req.query.q||'').trim();
  if(!query)return res.status(422).json({message:'Please correct the highlighted fields',errors:{q:'Enter a document title, department, category, or keyword.'}});
  if(query.length<2)return res.status(422).json({message:'Please correct the highlighted fields',errors:{q:'Search must contain at least 2 characters.'}});
  if(query.length>200)return res.status(422).json({message:'Please correct the highlighted fields',errors:{q:'Search must not exceed 200 characters.'}});
  let documents=await DocumentService.search({q:query,department:req.query.department,type:req.query.type,limit:30,user:req.user});
  // Natural-language questions often contain words that do not appear in the
  // title or tags. Supplement metadata matches with documents whose indexed
  // contents contain the best permitted passages.
  if(!documents.length){
   const passages=await KnowledgeSearchService.retrieve(query,{user:req.user,limit:20});
   const known=new Set();
   for(const passage of passages){
    if(known.has(passage.document_id))continue;
    const document=await DocumentService.find(passage.document_id,req.user);
    if(document&&matchesType(document,String(req.query.type||''))){documents.push(document);known.add(document.id)}
    if(documents.length>=30)break;
   }
  }
  const returnParams=new URLSearchParams();
  if(query)returnParams.set('q',query);
  if(req.query.type)returnParams.set('type',String(req.query.type));
  const returnTo=`/search${returnParams.size?`?${returnParams.toString()}`:''}`;
  res.json({data:documents.map(document=>({...document,url:`/documents/${document.id}?returnTo=${encodeURIComponent(returnTo)}`}))});
 }
 static async show(req,res){const document=await DocumentService.find(req.params.id,req.user);if(!document)return res.status(404).json({message:'Document not found or access denied'});res.json({data:{...document,preview_url:`/api/public/documents/${document.id}/preview`}})}
 static async suggestions(req,res){const query=String(req.query.q||'').trim();if(query.length<2)return res.json({data:[]});if(query.length>100)return res.status(422).json({message:'Suggestion query is too long'});res.json({data:await DocumentService.suggestions(query,req.user)})}
 static async preview(req,res){
  const document=await DocumentService.find(req.params.id,req.user,'view');
  if(!document)return res.status(404).json({message:'Document not found or access denied'});
  const filePath=path.join(uploadDirectory,document.stored_name);
  try{await fs.access(filePath)}catch{return res.status(404).json({message:'Stored file is unavailable'})}
  res.setHeader('Content-Type',document.mime_type);
  res.setHeader('Content-Disposition',`inline; filename*=UTF-8''${encodeURIComponent(document.original_name)}`);
  res.sendFile(filePath);
 }
 static async previewData(req,res){const document=await DocumentService.find(req.params.id,req.user,'view');if(!document)return res.status(404).json({message:'Document not found or access denied'});const filePath=path.join(uploadDirectory,document.stored_name);try{await fs.access(filePath)}catch{return res.status(404).json({message:'Stored file is unavailable'})}res.json({data:await DocumentPreviewService.preview(document,filePath)})}
}

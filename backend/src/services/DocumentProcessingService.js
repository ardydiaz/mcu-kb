import crypto from 'node:crypto';
import path from 'node:path';
import {query} from '../config/database.js';
import {uploadDirectory} from '../config/multer.js';
import DocumentContentExtractor from './DocumentContentExtractor.js';
import AiProviderService from './AiProviderService.js';
import OllamaService from './OllamaService.js';
import QdrantService from './QdrantService.js';

const MAX_CHARS=2200,OVERLAP=250;
const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const tokenEstimate=value=>Math.ceil(String(value||'').length/4);
function chunkSections(sections){const chunks=[];for(const section of sections){const text=clean(section.content);if(!text)continue;if(text.length<=MAX_CHARS){chunks.push({...section,content:text});continue}let start=0;while(start<text.length){let end=Math.min(start+MAX_CHARS,text.length);if(end<text.length){const boundary=text.lastIndexOf(' ',end);if(boundary>start+MAX_CHARS/2)end=boundary}chunks.push({...section,content:text.slice(start,end).trim()});if(end>=text.length)break;start=Math.max(end-OVERLAP,start+1)}}return chunks}

export default class DocumentProcessingService{
  static async queue(documentId,versionId){
    await query("INSERT INTO document_processing_jobs (id,document_id,document_version_id,status,stage) VALUES (:id,:documentId,:versionId,'queued','queued') ON DUPLICATE KEY UPDATE status='queued',stage='queued',error_message=NULL",{id:crypto.randomUUID(),documentId,versionId});
    setImmediate(()=>this.process(documentId,versionId).catch(error=>console.error('Document indexing failed',error)));
  }

  static async process(documentId,versionId){
    await query("UPDATE document_processing_jobs SET status='processing',stage='extracting',attempts=attempts+1,started_at=NOW(),completed_at=NULL WHERE document_version_id=:versionId",{versionId});
    try{
      const versions=await query('SELECT original_name,stored_name FROM document_versions WHERE id=:versionId AND document_id=:documentId LIMIT 1',{versionId,documentId});if(!versions.length)throw new Error('Document version not found');
      const version=versions[0],sections=await DocumentContentExtractor.extract(path.join(uploadDirectory,version.stored_name),version.original_name),chunks=chunkSections(sections);if(!chunks.length)throw new Error('No searchable content was extracted from this document.');
      await query("UPDATE document_processing_jobs SET stage='indexing' WHERE document_version_id=:versionId",{versionId});await query('DELETE FROM document_chunks WHERE document_version_id=:versionId',{versionId});
      const records=chunks.map((chunk,index)=>({id:crypto.randomUUID(),chunk_index:index,content:chunk.content,page_number:chunk.page_number||null,sheet_name:chunk.sheet_name||null,cell_range:chunk.cell_range||null}));let vectors=[];
      if(OllamaService.embeddingConfigured()){for(let offset=0;offset<records.length;offset+=32){const batch=records.slice(offset,offset+32);vectors.push(...await OllamaService.embed(batch.map(item=>item.content)))}}
      else if(AiProviderService.embeddingConfigured()){for(const record of records)vectors.push(await AiProviderService.embed(record.content))}
      for(let index=0;index<records.length;index++){const chunk=records[index],embedding=vectors[index]||null;await query('INSERT INTO document_chunks (id,document_id,document_version_id,chunk_index,content,page_number,sheet_name,cell_range,token_count,checksum,embedding) VALUES (:id,:documentId,:versionId,:chunkIndex,:content,:pageNumber,:sheetName,:cellRange,:tokenCount,:checksum,:embedding)',{id:chunk.id,documentId,versionId,chunkIndex:chunk.chunk_index,content:chunk.content,pageNumber:chunk.page_number,sheetName:chunk.sheet_name,cellRange:chunk.cell_range,tokenCount:tokenEstimate(chunk.content),checksum:crypto.createHash('sha256').update(chunk.content).digest('hex'),embedding:embedding?JSON.stringify(embedding):null})}
      if(QdrantService.configured()){if(vectors.length!==records.length)throw new Error('Qdrant is enabled, but embeddings are unavailable. Enable Ollama and configure OLLAMA_EMBEDDING_MODEL.');const documents=await query('SELECT d.title,d.status,d.visibility,d.category_id,d.department_id,COALESCE(dep.name,d.department) department FROM documents d LEFT JOIN departments dep ON dep.id=d.department_id WHERE d.id=:documentId LIMIT 1',{documentId});const permissions=await query('SELECT principal_type,principal_value FROM document_permissions WHERE document_id=:documentId',{documentId});const payload={document_id:documentId,...documents[0],allowed_roles:permissions.filter(item=>item.principal_type==='role').map(item=>Number(item.principal_value)),allowed_departments:permissions.filter(item=>item.principal_type==='department').map(item=>item.principal_value)};await QdrantService.replaceVersion(versionId,records,vectors,payload)}
      await query("UPDATE document_processing_jobs SET status='completed',stage='completed',completed_at=NOW() WHERE document_version_id=:versionId",{versionId});return{chunks:records.length};
    }catch(error){await query("UPDATE document_processing_jobs SET status='failed',stage='failed',error_message=:message,completed_at=NOW() WHERE document_version_id=:versionId",{versionId,message:String(error.message||error).slice(0,2000)}).catch(()=>{});throw error}
  }

  static async reindexLatest(documentId){const rows=await query('SELECT id FROM document_versions WHERE document_id=:documentId ORDER BY version_number DESC LIMIT 1',{documentId});if(!rows.length)throw Object.assign(new Error('Document version not found'),{status:404});await this.queue(documentId,rows[0].id);return{document_id:documentId,version_id:rows[0].id,status:'queued'}}
}

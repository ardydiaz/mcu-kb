import 'dotenv/config';
import pool,{query} from '../src/config/database.js';
import DocumentProcessingService from '../src/services/DocumentProcessingService.js';

try{
  const versions=await query('SELECT d.id document_id,v.id version_id FROM documents d JOIN document_versions v ON v.document_id=d.id AND v.version_number=(SELECT MAX(v2.version_number) FROM document_versions v2 WHERE v2.document_id=d.id) ORDER BY d.created_at');
  let completed=0;
  for(const version of versions){
    await query("INSERT INTO document_processing_jobs (id,document_id,document_version_id,status,stage) VALUES (UUID(),:documentId,:versionId,'queued','queued') ON DUPLICATE KEY UPDATE status='queued',stage='queued',error_message=NULL",{documentId:version.document_id,versionId:version.version_id});
    try{const result=await DocumentProcessingService.process(version.document_id,version.version_id);completed++;console.log(`[${completed}/${versions.length}] Indexed ${version.document_id}: ${result.chunks} chunks`)}catch(error){console.error(`Failed ${version.document_id}: ${error.message}`)}
  }
  console.log(`Indexed ${completed} of ${versions.length} current document versions.`);
}finally{await pool.end()}

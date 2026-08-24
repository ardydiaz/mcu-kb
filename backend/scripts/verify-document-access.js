import 'dotenv/config';
import crypto from 'node:crypto';
import { query } from '../src/config/database.js';
import DocumentService from '../src/services/DocumentService.js';

const internalId=crypto.randomUUID();const restrictedId=crypto.randomUUID();
const insert=async(id,title,visibility)=>{
  await query("INSERT INTO documents (id,title,department,visibility,status,uploaded_by) VALUES (:id,:title,'ITD',:visibility,'published',1)",{id,title,visibility});
  await query("INSERT INTO document_versions (id,document_id,version_number,original_name,stored_name,mime_type,file_size,uploaded_by) VALUES (:versionId,:id,1,:name,:stored,'application/pdf',1,1)",{versionId:crypto.randomUUID(),id,name:`${title}.pdf`,stored:`verification-${id}.pdf`});
};

try{
  await insert(internalId,'Internal verification','internal');
  await insert(restrictedId,'Restricted verification','restricted');
  await query("INSERT INTO document_permissions (document_id,principal_type,principal_value) VALUES (:id,'department','HR')",{id:restrictedId});
  const [admin,itd,hr]=await Promise.all([
    DocumentService.search({q:'verification',user:{id:1,role_id:2,department:'ITD'}}),
    DocumentService.search({q:'verification',user:{id:2,role_id:3,department:'ITD'}}),
    DocumentService.search({q:'verification',user:{id:3,role_id:3,department:'HR'}}),
  ]);
  const result={admin:admin.map(x=>x.title),itd:itd.map(x=>x.title),hr:hr.map(x=>x.title)};
  if(result.admin.length!==2||result.itd.length!==1||result.itd[0]!=='Internal verification'||result.hr.length!==1||result.hr[0]!=='Restricted verification')throw new Error(`Access verification failed: ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result,null,2));
}finally{
  await query('DELETE FROM documents WHERE id IN (:internalId,:restrictedId)',{internalId,restrictedId});
  process.exit(0);
}

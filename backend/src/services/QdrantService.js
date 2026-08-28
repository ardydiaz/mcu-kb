import {QdrantClient} from '@qdrant/js-client-rest';
import {query} from '../config/database.js';

const collection=()=>process.env.QDRANT_COLLECTION||'mcu_knowledge_chunks';
const client=()=>new QdrantClient({url:process.env.QDRANT_URL,apiKey:process.env.QDRANT_API_KEY||undefined,checkCompatibility:false});
const isAdmin=user=>[1,2].includes(Number(user?.role_id));
const keyword=value=>String(value??'').trim();

export function buildQdrantAccessFilter(user){
  if(isAdmin(user))return{must:[{key:'status',match:{value:'published'}}]};
  const department=keyword(user?.department),role=Number(user?.role_id);
  const should=[{key:'visibility',match:{value:'public'}}];
  if(department)should.push({must:[{key:'visibility',match:{value:'internal'}},{key:'department',match:{value:department}}]},{must:[{key:'visibility',match:{value:'restricted'}},{key:'allowed_departments',match:{value:department}}]});
  if(Number.isFinite(role))should.push({must:[{key:'visibility',match:{value:'restricted'}},{key:'allowed_roles',match:{value:role}}]});
  return{must:[{key:'status',match:{value:'published'}}],should};
}

export default class QdrantService{
  static configured(){return process.env.QDRANT_ENABLED==='true'&&Boolean(process.env.QDRANT_URL)}

  static async ensureCollection(vectorSize){
    if(!this.configured())return false;const qdrant=client();
    try{const existing=await qdrant.getCollection(collection());const configuredSize=existing.config?.params?.vectors?.size;if(configuredSize&&Number(configuredSize)!==Number(vectorSize))throw new Error(`Qdrant collection vector size is ${configuredSize}, but the embedding model returned ${vectorSize}. Use a new collection name and reindex.`)}catch(error){if(error.status!==404&&error.statusCode!==404&&!String(error.message).includes('Not found'))throw error;await qdrant.createCollection(collection(),{vectors:{size:vectorSize,distance:'Cosine'}})}
    for(const field of ['document_id','version_id','status','visibility','department','allowed_roles','allowed_departments'])await qdrant.createPayloadIndex(collection(),{field_name:field,field_schema:['allowed_roles'].includes(field)?'integer':'keyword',wait:true}).catch(error=>{if(!String(error.message).toLowerCase().includes('already'))console.warn(`Qdrant payload index ${field}:`,error.message)});
    return true;
  }

  static async replaceVersion(versionId,chunks,vectors,payload){
    if(!this.configured()||!vectors?.length)return false;await this.ensureCollection(vectors[0].length);const qdrant=client();
    await qdrant.delete(collection(),{filter:{must:[{key:'document_id',match:{value:payload.document_id}}]},wait:true}).catch(()=>{});
    const points=chunks.map((chunk,index)=>({id:chunk.id,vector:vectors[index],payload:{...payload,version_id:versionId,chunk_index:chunk.chunk_index,content:chunk.content,page_number:chunk.page_number||null,sheet_name:chunk.sheet_name||null,cell_range:chunk.cell_range||null}}));
    for(let offset=0;offset<points.length;offset+=64)await qdrant.upsert(collection(),{wait:true,points:points.slice(offset,offset+64)});return true;
  }

  static async search(vector,user,{limit=20,documentIds=[]}={}){
    if(!this.configured()||!vector?.length)return[];const filter=buildQdrantAccessFilter(user);if(documentIds.length)filter.must.push({key:'document_id',match:{any:documentIds.slice(0,50)}});
    const result=await client().search(collection(),{vector,filter,limit,with_payload:true,score_threshold:Number(process.env.QDRANT_SCORE_THRESHOLD||0.42)});
    return result.map(point=>({chunk_id:String(point.id),score:Number(point.score),...point.payload}));
  }

  static async updateDocumentPayload(documentId,payload){if(!this.configured())return false;await client().setPayload(collection(),{payload,filter:{must:[{key:'document_id',match:{value:documentId}}]},wait:true});return true}
  static async syncDocument(documentId){
    if(!this.configured())return false;const documents=await query('SELECT d.id document_id,d.title,d.status,d.visibility,d.category_id,d.department_id,COALESCE(dep.name,d.department) department FROM documents d LEFT JOIN departments dep ON dep.id=d.department_id WHERE d.id=:documentId LIMIT 1',{documentId});if(!documents.length)return this.removeDocument(documentId);
    const permissions=await query('SELECT principal_type,principal_value FROM document_permissions WHERE document_id=:documentId',{documentId});
    return this.updateDocumentPayload(documentId,{...documents[0],allowed_roles:permissions.filter(item=>item.principal_type==='role').map(item=>Number(item.principal_value)),allowed_departments:permissions.filter(item=>item.principal_type==='department').map(item=>item.principal_value)});
  }
  static async removeDocument(documentId){if(!this.configured())return false;await client().delete(collection(),{filter:{must:[{key:'document_id',match:{value:documentId}}]},wait:true});return true}
  static async health(){if(!this.configured())return{configured:false};const info=await client().getCollection(collection());return{configured:true,status:info.status,points:info.points_count}}
}

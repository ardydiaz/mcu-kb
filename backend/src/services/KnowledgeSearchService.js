import {query} from '../config/database.js';
import DocumentService,{accessSql} from './DocumentService.js';
import AiProviderService from './AiProviderService.js';
import {analyzeSearch,isRelevant,scoreSearchText} from '../utils/searchRelevance.js';
import OllamaService from './OllamaService.js';
import QdrantService from './QdrantService.js';

const clean=value=>String(value||'').trim().replace(/\s+/g,' ');
const cosine=(a,b)=>{if(!a?.length||a.length!==b?.length)return 0;let dot=0,left=0,right=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];left+=a[i]*a[i];right+=b[i]*b[i]}return left&&right?dot/(Math.sqrt(left)*Math.sqrt(right)):0};
const parseVector=value=>{try{return value?JSON.parse(value):null}catch{return null}};
const location=row=>row.page_number?`page ${row.page_number}`:row.sheet_name?`${row.sheet_name}${row.cell_range?` · ${row.cell_range}`:''}`:'';

export default class KnowledgeSearchService{
  static async retrieveQdrant(question,{user,limit=6,documentIds=[]}={}){
    if(!QdrantService.configured()||!OllamaService.embeddingConfigured())return null;
    const vector=await OllamaService.embed(question),hits=await QdrantService.search(vector,user,{limit:Math.max(limit*5,20),documentIds}),verified=new Map(),results=[];
    for(const hit of hits){
      if(!verified.has(hit.document_id))verified.set(hit.document_id,await DocumentService.find(hit.document_id,user));const document=verified.get(hit.document_id);if(!document||String(document.version_id)!==String(hit.version_id))continue;
      results.push({chunk_id:hit.chunk_id,document_id:hit.document_id,content:String(hit.content||''),page_number:hit.page_number||null,sheet_name:hit.sheet_name||null,cell_range:hit.cell_range||null,title:document.title,department:document.department,category_name:document.category_name,version_number:document.version_number,original_name:document.original_name,location:location(hit),score:Number(hit.score||0),relevance:{score:Number(hit.score||0),coverage:1}});if(results.length>=limit)break;
    }
    return results;
  }

  static async retrieve(question,{user,limit=6,documentIds=[]}={}){
    if(QdrantService.configured())try{const semantic=await this.retrieveQdrant(question,{user,limit,documentIds});if(semantic?.length||process.env.QDRANT_FALLBACK_TO_MYSQL==='false')return semantic||[]}catch(error){console.error('Qdrant retrieval unavailable:',error.message);if(process.env.QDRANT_FALLBACK_TO_MYSQL==='false')throw error}
    const access=accessSql(user),analysis=analyzeSearch(question),words=analysis.expanded.slice(0,40),params={...access.params,question:clean(question)};
    const like=words.map((word,index)=>{params[`word${index}`]=`%${word}%`;return `ch.content LIKE :word${index}`});
    const scopedIds=documentIds.filter(Boolean).slice(0,10);const documentScope=scopedIds.length?` AND d.id IN (${scopedIds.map((id,index)=>{params[`documentId${index}`]=id;return`:documentId${index}`}).join(',')})`:'';
    const latest="ch.document_version_id=(SELECT v2.id FROM document_versions v2 WHERE v2.document_id=d.id ORDER BY v2.version_number DESC LIMIT 1)";
    const contentPredicate=scopedIds.length?'1=1':`(MATCH(ch.content) AGAINST(:question IN NATURAL LANGUAGE MODE)${like.length?` OR ${like.join(' OR ')}`:''})`;
    const rows=await query(`SELECT ch.id chunk_id,ch.document_id,ch.content,ch.page_number,ch.sheet_name,ch.cell_range,ch.embedding,d.title,d.department,c.name category_name,v.version_number,v.original_name,MATCH(ch.content) AGAINST(:question IN NATURAL LANGUAGE MODE) keyword_score FROM document_chunks ch JOIN documents d ON d.id=ch.document_id JOIN document_versions v ON v.id=ch.document_version_id LEFT JOIN categories c ON c.id=d.category_id WHERE d.status='published' AND ${latest} AND ${access.clause}${documentScope} AND ${contentPredicate} ORDER BY keyword_score DESC LIMIT 1000`,params);
    let queryVector=null;if(AiProviderService.embeddingConfigured()){try{queryVector=await AiProviderService.embed(question)}catch(error){console.error('Semantic query unavailable:',error.message)}}
    return rows.map(row=>{const semantic=cosine(queryVector,parseVector(row.embedding)),contentRelevance=scoreSearchText(row.content,analysis),titleRelevance=scoreSearchText(`${row.title} ${row.original_name||''}`,analysis,{phraseWeight:100,coverageWeight:80});return{...row,location:location(row),relevance:{score:Math.max(contentRelevance.score,titleRelevance.score*1.35)+Number(row.keyword_score||0)+semantic*4,coverage:Math.max(contentRelevance.coverage,titleRelevance.coverage)}}}).filter(row=>documentIds.length||isRelevant(row.relevance)).sort((a,b)=>b.relevance.score-a.relevance.score).slice(0,limit);
  }

  static async ask(message,{user}={}){
    const question=clean(message),metadataMatches=await DocumentService.search({q:question,limit:5,user}),contexts=await this.retrieve(question,{user,limit:6,documentIds:metadataMatches.map(document=>document.id)});
    if(!contexts.length){return{answer:'I could not find enough information in the approved document contents to answer that question.',grounded:false,citations:[],documents:metadataMatches,suggestions:['Try a broader question','Browse department policies','Search available forms']}}
    const sourceNumbers=new Map();let nextSource=1;for(const item of contexts){if(!sourceNumbers.has(item.document_id))sourceNumbers.set(item.document_id,nextSource++);item.source_number=sourceNumbers.get(item.document_id)}
    let answer=null;try{answer=await OllamaService.answer(question,contexts);if(!answer)answer=await AiProviderService.answer(question,contexts)}catch(error){console.error('Grounded answer generation unavailable:',error.message)}
    const uniqueContexts=[...new Map(contexts.map(item=>[item.document_id,item])).values()];
    if(!answer){const extracts=uniqueContexts.slice(0,3).map(item=>`[${item.source_number}] ${item.content.slice(0,420)}${item.content.length>420?'…':''}`);answer=`These are the most relevant passages found in approved documents:\n\n${extracts.join('\n\n')}`}
    const citations=uniqueContexts.map(item=>{const locations=[...new Set(contexts.filter(context=>context.document_id===item.document_id).map(context=>context.location).filter(Boolean))];return{number:item.source_number,document_id:item.document_id,title:item.title,category:item.category_name,department:item.department,version:item.version_number,location:locations.join(', '),excerpt:item.content.slice(0,280),url:`/documents/${item.document_id}?returnTo=${encodeURIComponent(`/search?q=${question}`)}`}});
    const documents=[...new Map(contexts.map(item=>[item.document_id,{id:item.document_id,title:item.title,department:item.department,category_name:item.category_name,version_number:item.version_number,url:`/documents/${item.document_id}?returnTo=${encodeURIComponent(`/search?q=${question}`)}`}])).values()];
    return{answer,grounded:true,ai_generated:Boolean(OllamaService.chatConfigured()||AiProviderService.chatConfigured()),retrieval:QdrantService.configured()?'qdrant-hybrid':'mysql-hybrid',citations,documents,suggestions:['Show another relevant passage','Which document is most applicable?','Summarize the cited policy']};
  }
}

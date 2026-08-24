import DocumentService from './DocumentService.js';
const clean=value=>String(value||'').trim().replace(/\s+/g,' ');

export default class KnowledgeSearchService {
  static async ask(message,{user}={}){
    const question=clean(message);
    const documents=await DocumentService.search({q:question,limit:5,user});
    const answer=documents.length
      ? `I found ${documents.length} approved ${documents.length===1?'file':'files'} related to “${question}”. Open a result below to download the specific document.`
      : `I couldn’t find an approved file matching “${question}”. Try its filename, department, document title, tag, or terms such as policy, form, procedure, or manual.`;
    return{answer,documents,suggestions:documents.length?['Show related policies','Find another department','Search available forms']:['Browse department policies','Show available forms','Find procedure manuals']};
  }
}

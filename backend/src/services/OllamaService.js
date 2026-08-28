const endpoint=()=>String(process.env.OLLAMA_URL||'http://127.0.0.1:11434').replace(/\/$/,'');
const timeout=()=>Number(process.env.OLLAMA_TIMEOUT_MS||120000);

async function request(path,body){
  const response=await fetch(`${endpoint()}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(timeout())});
  if(!response.ok)throw new Error(`Ollama returned ${response.status}: ${(await response.text()).slice(0,300)}`);return response.json();
}

export default class OllamaService{
  static embeddingConfigured(){return process.env.OLLAMA_ENABLED==='true'&&Boolean(process.env.OLLAMA_EMBEDDING_MODEL)}
  static chatConfigured(){return process.env.OLLAMA_ENABLED==='true'&&Boolean(process.env.OLLAMA_CHAT_MODEL)}

  static async embed(input){
    if(!this.embeddingConfigured())return null;
    const data=await request('/api/embed',{model:process.env.OLLAMA_EMBEDDING_MODEL,input,truncate:true});
    return Array.isArray(input)?data.embeddings:data.embeddings?.[0];
  }

  static async answer(question,contexts){
    if(!this.chatConfigured())return null;
    const excerptLimit=Number(process.env.OLLAMA_MAX_EXCERPT_CHARS||1600);
    const references=contexts.slice(0,4).map(item=>`[${item.source_number}] ${item.title}${item.location?` (${item.location})`:''}\n${item.content.slice(0,excerptLimit)}`).join('\n\n');
    const data=await request('/api/chat',{model:process.env.OLLAMA_CHAT_MODEL,stream:false,think:false,keep_alive:process.env.OLLAMA_KEEP_ALIVE||'30m',options:{temperature:0,num_ctx:Number(process.env.OLLAMA_CONTEXT_SIZE||4096),num_predict:Number(process.env.OLLAMA_MAX_ANSWER_TOKENS||180)},messages:[{role:'system',content:'You are the MCU Knowledge Base assistant. Give only a short, direct answer to the question using the approved excerpts. Use at most three concise sentences. Mention the most relevant document title when useful and cite supporting statements using [number]. Do not write an introduction, document overview, numbered list, bullet list, headings, Markdown formatting, or unrelated details. If evidence is insufficient, reply exactly: No approved document contains enough information to answer this question. Never invent facts or citations.'},{role:'user',content:`Question: ${question}\n\nApproved excerpts:\n${references}`} ]});
    return String(data.message?.content||'').trim()||null;
  }

  static async health(){const response=await fetch(`${endpoint()}/api/tags`,{signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error(`Ollama health check returned ${response.status}`);return response.json()}
}

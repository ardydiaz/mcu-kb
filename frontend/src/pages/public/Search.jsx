import {ArrowRight,BookOpenCheck,FileSpreadsheet,FileText,Filter,FolderOpen,Search,Sparkles} from 'lucide-react';
import {useEffect,useMemo,useState} from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import {askKnowledgeBase,searchPublicDocuments} from '../../services/adminApi';
import SearchSuggestions from '../../components/SearchSuggestions';

const size=bytes=>bytes>=1048576?`${(bytes/1048576).toFixed(1)} MB`:`${Math.ceil(bytes/1024)} KB`;
const kind=doc=>doc.mime_type?.includes('sheet')||doc.mime_type?.includes('excel')?'excel':doc.mime_type?.includes('word')?'word':'pdf';

export default function SearchPage(){
 const location=useLocation();
 const [params,setParams]=useSearchParams();
 const [input,setInput]=useState(params.get('q')||'');
 const [documents,setDocuments]=useState([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [knowledge,setKnowledge]=useState(()=>location.state?.searchQuery===(params.get('q')||'')?location.state.searchKnowledge:null);
 const [answerLoading,setAnswerLoading]=useState(false);
 const [type,setType]=useState(params.get('type')||'');
 const query=params.get('q')||'';
 const restoredKnowledge=location.state?.searchQuery===query?location.state.searchKnowledge:null;
 const searchState={searchQuery:query,searchKnowledge:knowledge};
 const showDocumentResults=!answerLoading&&!knowledge?.grounded;

 useEffect(()=>{let active=true;if(!query.trim()){setDocuments([]);setError('');setLoading(false);return()=>{active=false}}setLoading(true);setError('');searchPublicDocuments({q:query,type}).then(({data})=>active&&setDocuments(data.data||[])).catch(error=>active&&setError(error.response?.data?.errors?.q||error.response?.data?.message||'Search is temporarily unavailable.')).finally(()=>active&&setLoading(false));return()=>{active=false}},[query,type]);
 useEffect(()=>{let active=true;if(!query.trim()){setKnowledge(null);setAnswerLoading(false);return()=>{active=false}}if(restoredKnowledge){setKnowledge(restoredKnowledge);setAnswerLoading(false);return()=>{active=false}}setAnswerLoading(true);setKnowledge(null);askKnowledgeBase(query).then(({data})=>active&&setKnowledge(data)).catch(error=>active&&setKnowledge({answer:error.response?.data?.message||'The knowledge answer is temporarily unavailable.',grounded:false,citations:[]})).finally(()=>active&&setAnswerLoading(false));return()=>{active=false}},[query,restoredKnowledge]);
 const departments=useMemo(()=>new Set(documents.map(doc=>doc.department)).size,[documents]);
 const submit=event=>{event.preventDefault();const field=event.currentTarget.querySelector('input');field.setCustomValidity('');if(input.trim().length<2){field.setCustomValidity(input.trim()?'Search must contain at least 2 characters.':'Enter a document title, department, category, or keyword.');field.addEventListener('input',()=>field.setCustomValidity(''),{once:true});field.reportValidity();return}setParams({q:input.trim()})};

 return <main className="document-search-page">
  <section className="search-hero"><div><span><Sparkles/> MCU DOCUMENT LIBRARY</span><h1>Find the file you need.</h1><p>Search approved policies, forms, manuals, and department resources.</p><form className="autocomplete-search" onSubmit={submit}><Search/><input value={input} onChange={event=>setInput(event.target.value)} placeholder="Search by title, department, category, or keyword" autoComplete="off"/><button>Search</button><SearchSuggestions value={input} onSelect={value=>{setInput(value);setParams({q:value})}}/></form><nav><small>Popular:</small>{['Policies','Forms','Manuals','Enrollment'].map(item=><button key={item} onClick={()=>{setInput(item);setParams({q:item})}}>{item}</button>)}</nav></div></section>
  <section className="search-results-shell">
   <section className="knowledge-answer" aria-live="polite"><header><span><Sparkles/></span><div><small>KNOWLEDGE ANSWER</small><h2>Answer from approved documents</h2></div></header>{answerLoading?<div className="knowledge-answer-loading"><i/><i/><i/><span>Reading permitted document contents…</span></div>:knowledge?<><p className="knowledge-answer-text">{knowledge.answer}</p>{knowledge.citations?.length>0&&<div className="knowledge-citations"><strong><BookOpenCheck/> Source documents <small>{knowledge.citations.length} approved {knowledge.citations.length===1?'file':'files'}</small></strong>{knowledge.citations.slice(0,4).map(source=><Link className="knowledge-source-card" key={`${source.document_id}-${source.number}`} to={source.url} state={searchState}><i className="knowledge-source-icon"><FileText/></i><div><small>APPROVED SOURCE</small><b>{source.title}</b><span>{[source.department,source.location].filter(Boolean).join(' · ')}</span><p>{source.excerpt}</p></div><em>View document <ArrowRight/></em></Link>)}</div>}<small className="knowledge-disclaimer">Answers use only documents available to your account. Verify important decisions against the cited source.</small></>:null}</section>
   {showDocumentResults&&<><header className="results-heading"><div><span>SEARCH RESULTS</span><h2>{query?`Results for “${query}”`:'Browse approved documents'}</h2><p>{loading?'Searching…':`${documents.length} documents from ${departments} departments`}</p></div><div className="type-filter"><Filter/>{[['','All'],['pdf','PDF'],['word','Word'],['sheet','Excel']].map(([value,label])=><button key={label} className={type===value?'active':''} onClick={()=>setType(value)}>{label}</button>)}</div></header>
   {error?<div className="search-state"><h3>Search unavailable</h3><p>{error}</p></div>:loading?<div className="search-loading">{[1,2,3,4].map(item=><i key={item}/>)}</div>:documents.length?<div className="public-document-grid">{documents.map(doc=>{const fileType=kind(doc);return <article key={doc.id}><div className={`public-file-icon ${fileType}`}>{fileType==='excel'?<FileSpreadsheet/>:<FileText/>}<small>{fileType.toUpperCase()}</small></div><div className="public-document-meta"><div><span>{doc.category_name||'GENERAL'}</span><i>{doc.department}</i></div><h3><Link to={doc.url} state={searchState}>{doc.title}</Link></h3><p>{doc.description||'Approved department document available from the MCU knowledge base.'}</p>{doc.tags?.length>0&&<div className="result-tags">{doc.tags.slice(0,4).map(tag=><span key={tag}>{tag}</span>)}</div>}<footer><small>Version {doc.version_number} · {size(doc.size)}</small><Link to={doc.url} state={searchState}>View file <ArrowRight/></Link></footer></div></article>})}</div>:<div className="search-state"><FolderOpen/><h3>No matching documents</h3><p>Try another filename, department, category, or broader keyword.</p><button onClick={()=>{setInput('');setParams({});setType('')}}>View all documents</button></div>}</>}
  </section>
 </main>;
}

import {ArrowRight,BookOpen,Building2,ChevronDown,FileText,LibraryBig,Search} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {getKnowledgeTree,getPublicCategoryMenu} from '../../services/adminApi';
import useScrollReveal from '../../hooks/useScrollReveal';

const splitTitle=title=>{const match=/^([A-Z]{2,}(?:-[A-Z0-9]+)+)\s+(.+)$/.exec(title||'');return match?{code:match[1],name:match[2]}:{code:'',name:title}};
// Remembers which dropdowns were open and the scroll position so "Back to results" returns to the same spot
const VIEW_KEY='kb:systems-view';
const saveView=view=>{try{sessionStorage.setItem(VIEW_KEY,JSON.stringify(view))}catch{}};
const readView=()=>{try{return JSON.parse(sessionStorage.getItem(VIEW_KEY)||'null')}catch{return null}};
const clearView=()=>{try{sessionStorage.removeItem(VIEW_KEY)}catch{}};
function DocumentRow({document,onOpen}){const {code,name}=splitTitle(document.title);return <Link className="knowledge-doc-row" to={document.view_url} onClick={onOpen}><span className="kdoc-icon"><FileText/></span><span className="kdoc-text"><strong>{name}</strong><small>{code&&<em className="kdoc-code">{code}</em>}Version {document.version_number}</small></span><ArrowRight className="knowledge-doc-arrow"/></Link>}

export default function Systems(){
 const [params]=useSearchParams();
 const navigate=useNavigate();
 const [collections,setCollections]=useState([]);
 const [activeCollection,setActiveCollection]=useState(null);
 const [query,setQuery]=useState('');
 const [openKeys,setOpenKeys]=useState(()=>new Set());
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');

 useEffect(()=>{Promise.all([getKnowledgeTree(),getPublicCategoryMenu()]).then(([tree,menu])=>{
   const withDocuments=tree.data.data||[],allCollections=menu.data.data||[];
   const merged=allCollections.map(item=>{
    const match=withDocuments.find(value=>Number(value.id)===Number(item.id));
    const requiresDeptById=new Map(item.sections.map(section=>[Number(section.id),Boolean(section.requires_department)]));
    if(match)return {...item,...match,sections:match.sections.map(section=>({...section,requires_department:requiresDeptById.get(Number(section.id))||false}))};
    return {...item,document_count:0,sections:item.sections.map(section=>({...section,document_count:0,departments:[]}))};
   });
   setCollections(merged);
  }).catch(error=>setError(error.response?.data?.message||'Unable to load the knowledge library.')).finally(()=>setLoading(false))},[]);

 const pendingScroll=useRef(null);
 useEffect(()=>{if(!collections.length)return;const requested=params.get('collection');const match=requested&&collections.find(item=>String(item.id)===requested);const id=match?match.id:collections[0].id;const saved=readView();const restore=saved&&String(saved.collection)===String(id);setActiveCollection(id);setQuery('');setOpenKeys(new Set(restore?saved.openKeys:[]));pendingScroll.current=restore?saved.scrollY:null;if(!restore)clearView()},[params,collections]);

 const collection=collections.find(item=>Number(item.id)===Number(activeCollection));
 useEffect(()=>{if(pendingScroll.current==null||!collection)return;const y=pendingScroll.current;pendingScroll.current=null;clearView();requestAnimationFrame(()=>window.scrollTo(0,y))},[collection,openKeys]);
 const rememberView=()=>saveView({collection:activeCollection,openKeys:[...openKeys],scrollY:window.scrollY});
 // Accordion: opening a department/office closes its open siblings (and their nested offices); closing also closes anything nested inside
 const toggle=key=>setOpenKeys(current=>{const next=new Set(current);const inside=item=>item===key||item.startsWith(`${key}:`);if(current.has(key)){next.forEach(item=>{if(inside(item))next.delete(item)});return next}const parent=key.slice(0,key.lastIndexOf(':')+1);next.forEach(item=>{if(item.startsWith(parent)&&!inside(item))next.delete(item)});next.add(key);return next});
 const sections=collection?.sections||[];
 useScrollReveal('.knowledge-section-card',{interval:100},[activeCollection]);

 const submitSearch=event=>{event.preventDefault();const field=event.currentTarget.querySelector('input');field.setCustomValidity('');if(query.trim().length<2){field.setCustomValidity(query.trim()?'Search must contain at least 2 characters.':'Enter a document title, department, category, or keyword.');field.addEventListener('input',()=>field.setCustomValidity(''),{once:true});field.reportValidity();return}navigate(`/search?q=${encodeURIComponent(query.trim())}`)};

 return <main className="knowledge-browser">
  <section className={`knowledge-hero${collection?.name==='Compliance'?' knowledge-hero-compliance':''}`}>
   {collection?.name!=='Compliance'&&<><div className="knowledge-hero-grid"/><div className="hero-aurora aurora-one"/><div className="hero-aurora aurora-two"/></>}
   <div className="knowledge-hero-inner">
    <span className="knowledge-hero-kicker"><LibraryBig/> MCU Knowledge Library</span>
    <h1>{collection?.name||'Browse knowledge collections'}</h1>
    <form className="knowledge-search-bar" onSubmit={submitSearch}>
     <Search/>
     <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search educational organization, student college handbook"/>
     <button type="submit"><Search/> Search</button>
    </form>
   </div>
  </section>
  <section className="knowledge-sections">
   {loading?<div className="knowledge-state">Loading knowledge collections…</div>:error?<div className="knowledge-state">{error}</div>:!collections.length?<div className="knowledge-state">No published knowledge collections are available yet.</div>:
    <div className="knowledge-section-grid">{sections.map(section=>{
     const flatDocuments=section.departments.flatMap(department=>[...department.documents,...(department.children||[]).flatMap(office=>office.documents)]);
     return <article className="knowledge-section-card" key={section.id}>
     <header><span className="knowledge-section-icon"><BookOpen/></span><div><h2>{section.name}</h2><small>{section.document_count} approved {section.document_count===1?'document':'documents'}</small></div></header>
     {section.requires_department?
      <div className="knowledge-department-list">{section.departments.length?section.departments.map(department=>{
       const key=`${section.id}:${department.id}`,open=openKeys.has(key);
       return <div className={`knowledge-dept-group${open?' open':''}`} key={department.id}>
        <button type="button" className="knowledge-dept-row" onClick={()=>toggle(key)}>
         <span className="kd-icon"><Building2/></span>
         <span><strong>{department.name}</strong><small>{department.document_count} {department.document_count===1?'document':'documents'}</small></span>
         <ChevronDown className={open?'open':''}/>
        </button>
        {open&&<div className="knowledge-dept-body">
         {department.documents.map(document=><DocumentRow document={document} onOpen={rememberView} key={document.id}/>)}
         {(department.children||[]).map(office=>{
          const officeKey=`${key}:${office.id}`,officeOpen=openKeys.has(officeKey);
          return <div className={`knowledge-office-group${officeOpen?' open':''}`} key={office.id}>
           <button type="button" className="knowledge-office-row" onClick={()=>toggle(officeKey)}>
            <span className="ko-icon"><BookOpen/></span>
            <span><strong>{office.name}</strong><small>{office.document_count} {office.document_count===1?'document':'documents'}</small></span>
            <ChevronDown className={officeOpen?'open':''}/>
           </button>
           {officeOpen&&<div className="knowledge-office-body">{office.documents.map(document=><DocumentRow document={document} onOpen={rememberView} key={document.id}/>)}</div>}
          </div>;
         })}
        </div>}
       </div>;
      }):<p className="knowledge-empty-note">No documents have been added to this section yet.</p>}</div>
      :
      <div className="knowledge-flat-documents">{flatDocuments.length?flatDocuments.map(document=><DocumentRow document={document} onOpen={rememberView} key={document.id}/>):<p className="knowledge-empty-note">No documents have been added to this section yet.</p>}</div>
     }
    </article>;})}</div>}
  </section>
 </main>;
}

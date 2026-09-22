import {BookOpen,Building2,ChevronDown,FileText,LibraryBig,Search} from 'lucide-react';
import {useEffect,useMemo,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {getKnowledgeTree,getPublicCategoryMenu} from '../../services/adminApi';

const filterDepartment=(department,q)=>{
 const children=(department.children||[]).map(child=>({...child,documents:q?child.documents.filter(document=>document.title.toLowerCase().includes(q)):child.documents})).filter(child=>!q||child.name.toLowerCase().includes(q)||child.documents.length>0);
 const selfMatches=!q||department.name.toLowerCase().includes(q);
 const documents=selfMatches?department.documents:department.documents.filter(document=>document.title.toLowerCase().includes(q));
 if(q&&!selfMatches&&!documents.length&&!children.length)return null;
 return {...department,documents,children};
};

export default function Systems(){
 const [params]=useSearchParams();
 const [collections,setCollections]=useState([]);
 const [activeCollection,setActiveCollection]=useState(null);
 const [query,setQuery]=useState('');
 const [sectionFilter,setSectionFilter]=useState(params.get('section')||'');
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

 useEffect(()=>{if(!collections.length)return;const requested=params.get('collection');const match=requested&&collections.find(item=>String(item.id)===requested);setActiveCollection(match?match.id:collections[0].id);setSectionFilter(params.get('section')||'');setQuery('');setOpenKeys(new Set())},[params,collections]);

 const collection=collections.find(item=>Number(item.id)===Number(activeCollection));
 const toggle=key=>setOpenKeys(current=>{const next=new Set(current);if(next.has(key))next.delete(key);else next.add(key);return next});
 const q=query.trim().toLowerCase();
 const sections=useMemo(()=>(collection?.sections||[]).filter(section=>!sectionFilter||String(section.id)===String(sectionFilter)).map(section=>({...section,departments:section.departments.map(department=>filterDepartment(department,q)).filter(Boolean)})),[collection,sectionFilter,q]);

 return <main className="knowledge-browser">
  <section className="knowledge-hero">
   <div className="knowledge-hero-inner">
    <span className="knowledge-hero-kicker"><LibraryBig/> MCU Knowledge Library</span>
    <h1>{collection?.name||'Browse knowledge collections'}</h1>
    <form className="knowledge-search-bar" onSubmit={event=>event.preventDefault()}>
     <Search/>
     <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search departments or documents"/>
     <select value={sectionFilter} onChange={event=>setSectionFilter(event.target.value)}>
      <option value="">All Categories</option>
      {(collection?.sections||[]).map(section=><option key={section.id} value={section.id}>{section.name}</option>)}
     </select>
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
       return <div className="knowledge-dept-group" key={department.id}>
        <button type="button" className="knowledge-dept-row" onClick={()=>toggle(key)}>
         <span className="kd-icon"><Building2/></span>
         <span><strong>{department.name}</strong><small>{department.document_count} {department.document_count===1?'document':'documents'}</small></span>
         <ChevronDown className={open?'open':''}/>
        </button>
        {open&&<div className="knowledge-dept-body">
         {department.documents.map(document=><Link className="knowledge-doc-row" to={document.view_url} key={document.id}><span className="kdoc-icon"><FileText/></span><span><strong>{document.title}</strong><small>Version {document.version_number}</small></span></Link>)}
         {(department.children||[]).map(office=>{
          const officeKey=`${key}:${office.id}`,officeOpen=openKeys.has(officeKey);
          return <div className="knowledge-office-group" key={office.id}>
           <button type="button" className="knowledge-office-row" onClick={()=>toggle(officeKey)}>
            <span className="ko-icon"><BookOpen/></span>
            <span><strong>{office.name}</strong><small>{office.document_count} {office.document_count===1?'document':'documents'}</small></span>
            <ChevronDown className={officeOpen?'open':''}/>
           </button>
           {officeOpen&&<div className="knowledge-office-body">{office.documents.map(document=><Link className="knowledge-doc-row" to={document.view_url} key={document.id}><span className="kdoc-icon"><FileText/></span><span><strong>{document.title}</strong><small>Version {document.version_number}</small></span></Link>)}</div>}
          </div>;
         })}
        </div>}
       </div>;
      }):<p className="knowledge-empty-note">{q?'No departments match your search in this section.':'No documents have been added to this section yet.'}</p>}</div>
      :
      <div className="knowledge-flat-documents">{flatDocuments.length?flatDocuments.map(document=><Link className="knowledge-doc-row" to={document.view_url} key={document.id}><span className="kdoc-icon"><FileText/></span><span><strong>{document.title}</strong><small>Version {document.version_number}</small></span></Link>):<p className="knowledge-empty-note">{q?'No documents match your search in this section.':'No documents have been added to this section yet.'}</p>}</div>
     }
    </article>;})}</div>}
  </section>
 </main>;
}

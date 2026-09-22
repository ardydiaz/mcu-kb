import {ArrowLeft,FileSpreadsheet,FileText,LoaderCircle,Maximize2,Minimize2,ZoomIn,ZoomOut} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import {Link as RouterLink,useLocation,useParams,useSearchParams} from 'react-router-dom';
import {getDocumentPreviewData,getPublicDocument} from '../../services/adminApi';

export default function DocumentView(){
 const location=useLocation();const {id}=useParams();const [params]=useSearchParams();const requestedReturn=params.get('returnTo')||'';const returnTo=/^\/(?:search(?:\?.*)?|systems(?:\?.*)?|admin(?:\/[a-z0-9-]+)?(?:\?.*)?)$/i.test(requestedReturn)?requestedReturn:'/search';const Link=props=><RouterLink {...props} to={props.to==='/search'?returnTo:props.to} state={props.to==='/search'?location.state:props.state}/>;
 const viewerRef=useRef(null);const [document,setDocument]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [fullscreen,setFullscreen]=useState(false);const [preview,setPreview]=useState(null);const [previewLoading,setPreviewLoading]=useState(false);const [previewError,setPreviewError]=useState('');const [activeSheet,setActiveSheet]=useState(0);const [zoom,setZoom]=useState(100);

 useEffect(()=>{setZoom(100)},[id]);
 useEffect(()=>{getPublicDocument(id).then(({data})=>setDocument(data.data)).catch(error=>setError(error.response?.data?.message||'Unable to open this document.')).finally(()=>setLoading(false))},[id]);
 useEffect(()=>{if(!document||document.mime_type==='application/pdf')return;let active=true;setPreviewLoading(true);getDocumentPreviewData(id).then(({data})=>{if(active)setPreview(data.data)}).catch(error=>{if(active)setPreviewError(error.response?.data?.message||'Unable to generate this preview.')} ).finally(()=>{if(active)setPreviewLoading(false)});return()=>{active=false}},[document,id]);
 useEffect(()=>{const changed=()=>setFullscreen(Boolean(globalThis.document.fullscreenElement));globalThis.document.addEventListener('fullscreenchange',changed);return()=>globalThis.document.removeEventListener('fullscreenchange',changed)},[]);
 const toggleFullscreen=async()=>{try{if(globalThis.document.fullscreenElement)await globalThis.document.exitFullscreen();else await viewerRef.current?.requestFullscreen()}catch{setError('Fullscreen mode is not supported by this browser.')}};

 if(loading)return <div className="document-view-state"><LoaderCircle className="spin"/> Opening document…</div>;
 if(error)return <div className="document-view-state"><FileText/><h2>Document unavailable</h2><p>{error}</p><Link to={returnTo}>Return to search</Link></div>;
 const pdf=document.mime_type==='application/pdf';const excel=preview?.kind==='excel';const sheet=excel?preview.sheets[activeSheet]:null;

 const zoomable=!previewLoading&&!previewError&&!pdf;
 return <main className="document-view-page"><header><Link to="/search"><ArrowLeft/> Back to results</Link><div><span>{document.category_name||'GENERAL'}{document.department?` · ${document.department}`:''}</span><h1>{document.title}</h1><p>{document.original_name} · Version {document.version_number}</p></div></header><section className={`viewer-shell ${pdf?'pdf-viewer':'office-viewer-shell'}`} ref={viewerRef}>
  <div className="viewer-toolbar">
   <div className="viewer-zoom-controls"><button type="button" aria-label="Zoom out" disabled={zoom<=60} onClick={()=>setZoom(value=>Math.max(60,value-10))}><ZoomOut/></button><span>{zoom}%</span><button type="button" aria-label="Zoom in" disabled={zoom>=200} onClick={()=>setZoom(value=>Math.min(200,value+10))}><ZoomIn/></button></div>
   <button type="button" className="viewer-fullscreen-toggle" onClick={toggleFullscreen} title={fullscreen?'Exit fullscreen':'View fullscreen'}>{fullscreen?<Minimize2/>:<Maximize2/>}<span>{fullscreen?'Exit fullscreen':'Fullscreen'}</span></button>
  </div>
  <div className="viewer-body">
  {pdf?<iframe key={zoom} title={document.title} src={`${document.preview_url}#toolbar=0&navpanes=0&scrollbar=1&zoom=${zoom}`}/>:previewLoading?<div className="office-preview-state"><LoaderCircle className="spin"/><h2>Preparing secure preview…</h2><p>Large Office documents may take a few moments.</p></div>:previewError?<div className="office-preview-state"><FileText/><h2>Preview unavailable</h2><p>{previewError}</p></div>:excel?<div className="excel-preview" style={zoomable?{zoom:zoom/100}:undefined}><nav>{preview.sheets.map((item,index)=><button key={item.name} className={activeSheet===index?'active':''} onClick={()=>setActiveSheet(index)}>{item.name}</button>)}</nav>{sheet?.rows.length?<div className="excel-table-wrap"><table><tbody>{sheet.rows.map((row,rowIndex)=><tr key={rowIndex}><th>{rowIndex+1}</th>{row.map((cell,columnIndex)=><td key={columnIndex}>{cell}</td>)}</tr>)}</tbody></table></div>:<div className="office-preview-state"><FileSpreadsheet/><h2>Empty worksheet</h2><p>This worksheet does not contain displayable cells.</p></div>}{(preview.truncated||sheet?.truncated)&&<p className="preview-limit-note">Preview limited for performance. The original workbook remains unchanged.</p>}</div>:preview?.kind==='word'?<article className="word-preview" style={zoomable?{zoom:zoom/100}:undefined} dangerouslySetInnerHTML={{__html:preview.html}}/>:preview?.kind==='word-text'?<article className="word-preview word-plain" style={zoomable?{zoom:zoom/100}:undefined}><pre>{preview.text}</pre></article>:<div className="office-preview-state"><FileText/><h2>Preview unavailable</h2></div>}
  </div>
 </section></main>;
}

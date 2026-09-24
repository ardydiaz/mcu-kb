import {Image as ImageIcon,Play,School} from 'lucide-react';
import {useEffect,useState} from 'react';
import {getPublicLandingPage} from '../../services/adminApi';
import useScrollReveal from '../../hooks/useScrollReveal';

const asset=name=>`/images/basic-education/${name}`;
const youtube=value=>{const match=String(value||'').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);return match?`https://www.youtube.com/embed/${match[1]}`:null};
function BedVisual({src,alt,className=''}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);return <div className={`bed-visual ${className} ${failed?'fallback':''}`}>{failed?<><img src="/images/logo_curve.png" alt=""/><span><ImageIcon/> Add {src.split('/').pop()}</span></>:<img src={src} alt={alt} onError={()=>setFailed(true)}/>}</div>}

export default function BasicEducation(){const [content,setContent]=useState({});useEffect(()=>{getPublicLandingPage('basic-education').then(({data})=>setContent(data.data.content||{})).catch(()=>{})},[]);const alumniYoutube=youtube(content.alumni_video_url);useScrollReveal('.bed-section');return <main className="bed-page">
 <section className="bed-hero"><div className="bed-hero-copy"><span><School/> MCU BASIC EDUCATION</span><h1>{content.hero_title||<>Strong foundations.<br/><em>Brighter futures.</em></>}</h1><p>{content.hero_body||'Building academic excellence, character, confidence, and lifelong curiosity in every learner.'}</p></div><div className="bed-hero-seal"><img src="/images/logo_curve.png" alt="MCU Basic Education"/><small>LEARN • LEAD • EXCEL</small></div></section>
 <section className="bed-content" id="bed-content">
  <article className="bed-section bed-overview bed-overview-image-only"><BedVisual src={content.overview_image||asset('basic-education-overview.jpg')} alt="MCU Basic Education overview"/></article>
  <article className="bed-section bed-principal bed-principal-image-only"><BedVisual src={content.principal_image||asset('assistant-principal.jpg')} alt="Assistant Principal for Basic Education"/></article>
  <article className="bed-section bed-organization"><header><small>ONE CONNECTED TEAM</small></header><BedVisual src={content.organization||asset('organization-chart.jpg')} alt="Basic Education Department organization chart"/></article>
  <article className="bed-section bed-testimonial"><header><small>OUR COMMUNITY STORIES</small><h2>Alumni Testimonials</h2><p>Hear how an MCU education shaped the journey of our graduates.</p></header><div className="bed-video">{alumniYoutube?<iframe src={alumniYoutube} title="Basic Education Alumni Testimonial" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>:content.alumni_video_url?<video src={content.alumni_video_url} controls preload="metadata"/>:<><img src="/images/MCU-banner.png" alt="Basic Education alumni testimonial"/><span><Play fill="currentColor"/></span></>}</div></article>
  <article className="bed-section bed-website bed-image-only"><BedVisual src={content.website_overview||asset('website-overview.jpg')} alt="Basic Education website overview"/></article>
 </section>
 </main>}

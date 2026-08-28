import {ArrowRight,ChevronLeft,ChevronRight,Image as ImageIcon,Play} from 'lucide-react';
import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';

const asset=name=>`/images/accreditation/${name}`;
function Visual({src,alt,className='',fallback='/images/mcu-logo-purple.png'}){const [failed,setFailed]=useState(false);return <div className={`accreditation-visual ${className} ${failed?'fallback':''}`}>{failed?<><img src={fallback} alt=""/><span><ImageIcon/> Add {src.split('/').pop()}</span></>:<img src={src} alt={alt} onError={()=>setFailed(true)}/>}</div>}
function OfficialsSlider(){const slides=['administrative-officials-1.jpg','administrative-officials-2.jpg','administrative-officials-3.jpg'],[active,setActive]=useState(0);useEffect(()=>{const timer=setInterval(()=>setActive(current=>(current+1)%slides.length),6500);return()=>clearInterval(timer)},[slides.length]);const move=direction=>setActive(current=>(current+direction+slides.length)%slides.length);return <div className="officials-slider"><div className="officials-slide"><Visual key={slides[active]} src={asset(slides[active])} alt={`MCU administrative officials group ${active+1}`}/><button className="previous" onClick={()=>move(-1)} aria-label="Previous officials"><ChevronLeft/></button><button className="next" onClick={()=>move(1)} aria-label="Next officials"><ChevronRight/></button></div><div className="officials-dots">{slides.map((slide,index)=><button className={index===active?'active':''} onClick={()=>setActive(index)} aria-label={`Show officials slide ${index+1}`} key={slide}/>)}</div></div>}

export default function Accreditation(){return <main className="accreditation-page">
 <section className="accreditation-hero"><div><small>MCU QUALITY EDUCATION</small><h1>Accreditation</h1><p>Discover our academic community, institutional leadership, development plans, and continuing commitment to quality education.</p><a href="#accreditation-content">Explore the page <ArrowRight/></a></div></section>
 <section className="accreditation-content" id="accreditation-content">
  <div className="accreditation-school-cards"><article><Visual src={asset('basic-education-logo.png')} alt="Basic Education K-10" fallback="/images/logo_curve.png"/><h2>Basic Education (K-10)</h2></article><article><Visual src={asset('senior-high-school-logo.png')} alt="Senior High School" fallback="/images/logo_curve.png"/><h2>Senior High School</h2></article></div>
  <article className="accreditation-feature"><header><small>LEADERSHIP MESSAGE</small><h2>Message from the Principal</h2></header><Visual src={asset('principal-message.jpg')} alt="Message from the Principal"/></article>
  <article className="accreditation-feature compact"><Visual src={asset('pascua-accreditation-visit.jpg')} alt="MCU PASCUA accreditation visit"/></article>
  <article className="accreditation-feature campus"><header><small>BUILDING THE FUTURE</small><h2>MCU Campus Development Plan</h2></header><div className="accreditation-video-card"><img src="/images/MCU-banner.png" alt="MCU campus development plan"/><span><Play fill="currentColor"/></span></div></article>
  <section className="accreditation-story-grid"><article><Visual src={asset('history.jpg')} alt="History of Manila Central University"/><h2>Our History</h2></article><article><Visual src={asset('purpose-vision-mission.jpg')} alt="MCU purpose, vision, mission, and values"/><h2>Purpose, Vision & Mission</h2></article></section>
  <article className="accreditation-feature"><header><small>HOW WE WORK</small><h2>MCU Organizational Structure</h2></header><Visual src={asset('organizational-structure.jpg')} alt="MCU organizational structure"/></article>
  <article className="accreditation-feature officials-feature"><header><small>MEET OUR LEADERS</small><h2>Administrative Officials</h2></header><OfficialsSlider/></article>
  <article className="accreditation-feature overview"><header><small>INSTITUTIONAL PROFILE</small><h2>Website Overview</h2></header><Visual src={asset('website-overview.jpg')} alt="MCU website and institutional overview"/><Link to="/">Visit the Knowledge Base <ArrowRight/></Link></article>
 </section>
 </main>}

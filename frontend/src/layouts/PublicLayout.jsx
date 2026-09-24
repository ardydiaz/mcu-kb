import {ChevronDown,Facebook,Instagram,Linkedin,LogIn,LogOut,Menu,ShieldCheck,Twitter,X,Youtube} from 'lucide-react';
import {useEffect,useState} from 'react';
import {Link,NavLink,Outlet,useLocation,useNavigate} from 'react-router-dom';
import {getCurrentUser,getPublicCategoryMenu,logout as logoutApi} from '../services/adminApi';

const STATIC_COLLECTIONS=new Set(['Educational Organization Management System','Accreditation','Basic Education','Senior High School']);
const FLAT_LINK_COLLECTIONS=new Set(['Student Handbook','Compliance']);

function CollectionDropdown({collection,onNavigate,guardedNav}){
 return <div className="nav-dropdown">
  <button type="button" className="nav-dropdown-trigger">{collection.name} <ChevronDown/></button>
  <div className="nav-dropdown-menu"><div className="nav-dropdown-menu-inner">{collection.sections.length?collection.sections.map(section=>{const to=`/systems?collection=${collection.id}&section=${section.id}`;return <Link key={section.id} to={to} onClick={guardedNav(to,onNavigate)}>{section.name}</Link>}):<Link to={`/systems?collection=${collection.id}`} onClick={guardedNav(`/systems?collection=${collection.id}`,onNavigate)}>Browse {collection.name}</Link>}</div></div>
 </div>;
}

export default function PublicLayout(){
 const [open,setOpen]=useState(false);
 const [profileOpen,setProfileOpen]=useState(false);
 const [user,setUser]=useState(null);
 const [photoFailed,setPhotoFailed]=useState(false);
 const [scrolled,setScrolled]=useState(false);
 const [menuCollections,setMenuCollections]=useState([]);
 const [loginPrompt,setLoginPrompt]=useState(false);
 const [pendingTo,setPendingTo]=useState('/systems');
 const [checking,setChecking]=useState(false);
 const [loginError,setLoginError]=useState('');
 const navigate=useNavigate();
 const location=useLocation();

 useEffect(()=>{let active=true;getCurrentUser().then(({data})=>{if(active)setUser(data.user)}).catch(()=>{if(active)setUser(null)});return()=>{active=false}},[]);
 useEffect(()=>{let active=true;getPublicCategoryMenu().then(({data})=>{if(active)setMenuCollections(data.data||[])}).catch(()=>{});return()=>{active=false}},[]);
 useEffect(()=>{const onScroll=()=>setScrolled(window.scrollY>8);onScroll();window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll)},[]);
 const logout=async()=>{await logoutApi().catch(()=>{});localStorage.removeItem('mcu_user');localStorage.removeItem('mcu_token');setUser(null);setProfileOpen(false);navigate('/')};
 const initials=(user?.name||user?.email||'MCU').split(/\s+/).map(part=>part[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
 const flatCollections=menuCollections.filter(item=>FLAT_LINK_COLLECTIONS.has(item.name));
 const dropdownCollections=menuCollections.filter(item=>!STATIC_COLLECTIONS.has(item.name)&&!FLAT_LINK_COLLECTIONS.has(item.name));
 const eomsCollection=menuCollections.find(item=>item.name==='Educational Organization Management System');
 const currentCollectionParam=new URLSearchParams(location.search).get('collection');
 const isSystemsActive=(collectionId,isDefault=false)=>location.pathname==='/systems'&&(String(currentCollectionParam)===String(collectionId)||(isDefault&&!currentCollectionParam));
 const guardedNav=(to,extraOnClick)=>event=>{extraOnClick?.();setOpen(false);if(user)return;event.preventDefault();setPendingTo(to);setLoginError('');setLoginPrompt(true)};
 const microsoftLogin=async()=>{setLoginError('');setChecking(true);try{const response=await fetch('/api/auth/status',{credentials:'include'});if(!response.ok)throw new Error();const data=await response.json();if(!data.microsoftConfigured){setLoginError('Microsoft sign-in is not configured. Contact the administrator.');setChecking(false);return}window.location.assign(`/api/auth/microsoft?returnTo=${encodeURIComponent(pendingTo)}`)}catch{setLoginError('The Knowledge Base API is unavailable. Please try again later.');setChecking(false)}};

 return <div className="site-shell">
  <header className={`topbar${scrolled?' scrolled':''}`}>
   <Link className="brand" to="/" aria-label="Manila Central University Knowledge Base home"><img className="header-logo" src="/images/mcu-logo-purple.png" alt="Manila Central University"/></Link>
   <button className="menu-button" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
   <nav className={open?'open':''}>
    <NavLink to="/" onClick={()=>setOpen(false)}>Home</NavLink>
    <Link className={isSystemsActive(eomsCollection?.id,true)?'active':''} to={eomsCollection?`/systems?collection=${eomsCollection.id}`:'/systems'} onClick={guardedNav(eomsCollection?`/systems?collection=${eomsCollection.id}`:'/systems')}>Educational Organization Management System</Link>
    {flatCollections.map(collection=>{const to=`/systems?collection=${collection.id}`;return <Link key={collection.id} className={isSystemsActive(collection.id)?'active':''} to={to} onClick={guardedNav(to)}>{collection.name}</Link>})}
    {dropdownCollections.map(collection=><CollectionDropdown key={collection.id} collection={collection} onNavigate={()=>setOpen(false)} guardedNav={guardedNav}/>)}
    <NavLink to="/accreditation" onClick={()=>setOpen(false)}>Accreditation</NavLink>
    {user&&<div className="public-profile"><button className="public-profile-trigger" type="button" aria-label="Open profile menu" aria-expanded={profileOpen} onClick={()=>setProfileOpen(value=>!value)}>{!photoFailed?<img src="/api/auth/photo" alt={`${user.name}'s Microsoft profile`} onError={()=>setPhotoFailed(true)}/>:<span>{initials}</span>}</button>{profileOpen&&<div className="public-profile-menu"><div>{!photoFailed?<img src="/api/auth/photo" alt=""/>:<span>{initials}</span>}<p><strong>{user.name}</strong><small>{user.email}</small></p></div>{[1,2].includes(Number(user.role_id))&&<Link to="/admin" onClick={()=>setProfileOpen(false)}>Admin Portal</Link>}<button type="button" onClick={logout}><LogOut/> Sign out</button></div>}</div>}
   </nav>
  </header>
  <main><Outlet/></main>
  {loginPrompt&&<div className="search-login-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!checking)setLoginPrompt(false)}}><section className="search-login-modal" role="dialog" aria-modal="true" aria-labelledby="nav-login-title"><button className="search-login-close" type="button" aria-label="Close sign-in dialog" disabled={checking} onClick={()=>setLoginPrompt(false)}><X/></button><span className="search-login-icon"><ShieldCheck/></span><small>SECURE DOCUMENT SEARCH</small><h2 id="nav-login-title">Sign in to browse the knowledge base</h2><p>Continue with your MCU Microsoft account to view department policies, forms, and manuals allowed for your role and department.</p>{loginError&&<div className="search-login-error">{loginError}</div>}<button className="search-microsoft-button" type="button" disabled={checking} onClick={microsoftLogin}><LogIn/>{checking?'Connecting…':'Continue with Microsoft'}</button><button className="search-login-cancel" type="button" disabled={checking} onClick={()=>setLoginPrompt(false)}>Cancel</button></section></div>}
  <footer><div><div className="footer-mcu"><span className="brand-seal">MCU</span><span><b>MCU</b><small>Manila Central University</small></span></div><p>Manila Central University,<br/>EDSA, Caloocan City 1400</p><p>(+632) 8364-10-71 up to 74</p><a href="mailto:hello@mcu.edu.ph">hello@mcu.edu.ph</a></div><div className="footer-column"><h4>Other Websites</h4><a href="https://mcu.edu.ph">MCU Official Website</a><a href="#">Employee Portal</a><a href="#">NEO LMS</a><a href="https://office.com">Office 365</a></div><div className="footer-column"><h4>Social Medias</h4><div className="socials"><a aria-label="Facebook" href="#"><Facebook/></a><a aria-label="Instagram" href="#"><Instagram/></a><a aria-label="Twitter" href="#"><Twitter/></a><a aria-label="YouTube" href="#"><Youtube/></a><a aria-label="LinkedIn" href="#"><Linkedin/></a></div></div><p className="copyright">© Manila Central University - All Right Reserved {new Date().getFullYear()}</p></footer>
 </div>;
}

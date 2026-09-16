import {BarChart3,Bell,FolderTree,Gauge,LayoutTemplate,LogOut,Megaphone,Monitor,Settings,Users} from 'lucide-react';
import {useEffect,useState} from 'react';
import {NavLink,Outlet,useNavigate} from 'react-router-dom';
import SessionInactivityGuard from '../components/SessionInactivityGuard';
import {getCurrentUser,logout as logoutApi} from '../services/adminApi';

const links=[['/admin',Gauge,'Dashboard'],['/admin/users',Users,'Users'],['/admin/systems',Monitor,'Documents'],['/admin/categories',FolderTree,'Categories'],['/admin/departments',FolderTree,'Departments'],['/admin/landing-pages',LayoutTemplate,'Landing Pages'],['/admin/announcements',Megaphone,'Announcements'],['/admin/analytics',BarChart3,'Analytics'],['/admin/settings',Settings,'Settings']];

export default function AdminLayout(){
 const nav=useNavigate();
 const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('mcu_user'))||null}catch{return null}});
 const [photoFailed,setPhotoFailed]=useState(false);
 useEffect(()=>{let active=true;getCurrentUser().then(({data})=>{if(active)setUser(data.user)}).catch(()=>{});return()=>{active=false}},[]);
 const logout=async()=>{await logoutApi().catch(()=>{});localStorage.removeItem('mcu_user');localStorage.removeItem('mcu_token');nav('/login')};
 const initials=(user?.name||user?.email||'Admin').split(/\s+/).map(part=>part[0]).filter(Boolean).slice(0,2).join('').toUpperCase();

 return <SessionInactivityGuard><div className="admin-shell">
  <aside><div className="admin-logo"><span className="brand-seal">MCU</span><span>Admin Portal<small>Knowledge Base</small></span></div><nav>{links.map(([to,Icon,label])=><NavLink key={to} to={to} end={to==='/admin'}><Icon size={19}/>{label}</NavLink>)}</nav><button onClick={logout}><LogOut size={18}/> Sign out</button></aside>
  <section className="admin-main"><header><div><small>Manila Central University</small><strong>Knowledge Base Administration</strong></div><Bell/><span className="avatar admin-profile-photo" title={user?.name||'Administrator'}>{!photoFailed?<img src="/api/auth/photo" alt={`${user?.name||'Administrator'} Microsoft profile`} onError={()=>setPhotoFailed(true)}/>:initials}</span></header><Outlet/></section>
 </div></SessionInactivityGuard>;
}

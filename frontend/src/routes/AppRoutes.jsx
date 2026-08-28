import { useEffect,useState } from 'react';
import { Navigate,Route,Routes,useLocation } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';import AuthLayout from '../layouts/AuthLayout';import AdminLayout from '../layouts/AdminLayout';
import Home from '../pages/public/Home';import Search from '../pages/public/Search';import Systems from '../pages/public/Systems';import DocumentView from '../pages/public/DocumentView';import Login from '../pages/auth/Login';
import Dashboard from '../pages/admin/Dashboard';import Users from '../pages/admin/Users';import AdminSystems from '../pages/admin/Systems';import Categories from '../pages/admin/Categories';import Announcements from '../pages/admin/Announcements';import Analytics from '../pages/admin/Analytics';import Settings from '../pages/admin/Settings';
import Departments from '../pages/admin/Departments';
import Accreditation from '../pages/public/Accreditation';
import BasicEducation from '../pages/public/BasicEducation';
import SeniorHighSchool from '../pages/public/SeniorHighSchool';
import { getCurrentUser } from '../services/adminApi';

const useSession=()=>{const [state,setState]=useState({loading:true,user:null});useEffect(()=>{getCurrentUser().then(({data})=>{localStorage.setItem('mcu_user',JSON.stringify(data.user));setState({loading:false,user:data.user})}).catch(()=>{localStorage.removeItem('mcu_user');setState({loading:false,user:null})})},[]);return state};
const Authenticated=({children})=>{const state=useSession();const location=useLocation();if(state.loading)return <div className="route-loader">Verifying secure session…</div>;if(!state.user){const returnTo=`${location.pathname}${location.search}`;return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace/>}return children};
const AdminProtected=({children})=>{const state=useSession();const location=useLocation();if(state.loading)return <div className="route-loader">Verifying secure session…</div>;if(!state.user){const returnTo=`${location.pathname}${location.search}`;return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace/>}return [1,2].includes(Number(state.user.role_id))?children:<Navigate to="/?access=admin-denied" replace/>};

export default function AppRoutes(){return <Routes>
 <Route element={<PublicLayout/>}><Route index element={<Home/>}/><Route path="accreditation" element={<Accreditation/>}/><Route path="basic-education" element={<BasicEducation/>}/><Route path="senior-high-school" element={<SeniorHighSchool/>}/><Route path="search" element={<Authenticated><Search/></Authenticated>}/><Route path="documents/:id" element={<Authenticated><DocumentView/></Authenticated>}/><Route path="systems" element={<Authenticated><Systems/></Authenticated>}/></Route>
 <Route element={<AuthLayout/>}><Route path="login" element={<Login/>}/></Route>
 <Route path="admin" element={<AdminProtected><AdminLayout/></AdminProtected>}><Route index element={<Dashboard/>}/><Route path="documents/:id" element={<DocumentView/>}/><Route path="users" element={<Users/>}/><Route path="systems" element={<AdminSystems/>}/><Route path="categories" element={<Categories/>}/><Route path="departments" element={<Departments/>}/><Route path="announcements" element={<Announcements/>}/><Route path="analytics" element={<Analytics/>}/><Route path="settings" element={<Settings/>}/></Route>
 <Route path="*" element={<Navigate to="/"/>}/>
 </Routes>}

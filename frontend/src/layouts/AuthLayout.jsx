import { Link, Outlet } from 'react-router-dom';
export default function AuthLayout(){return <div className="auth-shell"><Link className="auth-brand" to="/"><span className="brand-seal">MCU</span><span>Knowledge Base</span></Link><Outlet/></div>}

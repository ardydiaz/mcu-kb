import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../services/adminApi';
export default function SessionInactivityGuard({ children, minutes = 30 }) {
  const navigate = useNavigate();
  useEffect(() => { let timer; const reset = () => { clearTimeout(timer); timer = setTimeout(async() => { await logout().catch(()=>{}); localStorage.removeItem('mcu_token'); localStorage.removeItem('mcu_user'); navigate('/login', { replace: true }); }, minutes * 60000); }; const events = ['mousemove','keydown','click','scroll','touchstart']; events.forEach((e) => addEventListener(e, reset)); reset(); return () => { clearTimeout(timer); events.forEach((e) => removeEventListener(e, reset)); }; }, [minutes, navigate]);
  return children;
}

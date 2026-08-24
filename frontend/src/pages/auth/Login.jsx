import { useState } from 'react';

export default function Login(){
  const status=new URLSearchParams(window.location.search).get('status');
  const returnTo=new URLSearchParams(window.location.search).get('returnTo')||'';
  const [error,setError]=useState('');
  const [checking,setChecking]=useState(false);

  const microsoftLogin=async()=>{
    setError('');setChecking(true);
    try{
      const response=await fetch('/api/auth/status',{credentials:'include'});
      if(!response.ok)throw new Error();
      const data=await response.json();
      if(!data.microsoftConfigured){setError('Microsoft sign-in is not configured. Contact the administrator.');setChecking(false);return}
      window.location.assign(`/api/auth/microsoft${returnTo?`?returnTo=${encodeURIComponent(returnTo)}`:''}`);
    }catch{
      setError('The Knowledge Base API is not running. Start the backend on port 4000, then try again.');
      setChecking(false);
    }
  };

  return <div className="login-card"><span className="section-label">SECURE ACCESS</span><h1>Welcome back</h1><p>Use your MCU Microsoft account to securely access department knowledge and documents.</p>{status==='pending'&&<div className="login-status pending">Your account was created and is waiting for approval from an Admin or Super admin.</div>}{status==='inactive'&&<div className="login-status inactive">Your account is inactive. Contact the Knowledge Base administrator.</div>}{error&&<div className="login-status inactive">{error}</div>}<button type="button" className="microsoft-button" onClick={microsoftLogin} disabled={checking}><span>▦</span>{checking?'Checking secure connection…':'Continue with Microsoft'}</button><p className="login-help">Your account profile and access role are managed by the Knowledge Base administrator.</p></div>;
}

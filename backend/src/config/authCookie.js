const isProduction=()=>process.env.NODE_ENV==='production';
export const sessionCookieName='mcu_session';
export const sessionCookieOptions=()=>({httpOnly:true,secure:isProduction(),sameSite:'lax',maxAge:8*60*60*1000,path:'/'});
export const oauthCookieOptions=()=>({httpOnly:true,secure:isProduction(),sameSite:'lax',maxAge:10*60*1000,path:'/api/auth/microsoft/callback'});
export const readCookie=(req,name)=>{const header=req.headers.cookie||'';const item=header.split(';').map(value=>value.trim()).find(value=>value.startsWith(`${name}=`));return item?decodeURIComponent(item.slice(name.length+1)):null};

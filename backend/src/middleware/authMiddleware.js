import { verifyToken } from '../config/jwt.js';
import { readCookie, sessionCookieName } from '../config/authCookie.js';
import UserModel from '../models/UserModel.js';

export default async function auth(req,res,next) {
  const token=req.headers.authorization?.replace(/^Bearer\s+/i,'')||readCookie(req,sessionCookieName);
  if(!token)return res.status(401).json({message:'Authentication required'});
  try {
    const payload=verifyToken(token);
    const account=await UserModel.byEmail(payload.email);
    if(!account)return res.status(401).json({message:'Account no longer exists'});
    if(account.status!=='active')return res.status(403).json({message:'This account is inactive',code:'ACCOUNT_INACTIVE'});
    req.user={
      id:account.id,
      email:account.email,
      name:account.fullname,
      department:account.department??null,
      role_id:account.role_id??null,
      role:account.role_name??null,
    };
    next();
  } catch(error) {
    if(error.name==='JsonWebTokenError'||error.name==='TokenExpiredError')return res.status(401).json({message:'Invalid or expired session'});
    next(error);
  }
}

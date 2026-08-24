import { verifyToken } from '../config/jwt.js';import { readCookie,sessionCookieName } from '../config/authCookie.js';
export default function optionalAuth(req,res,next){const token=req.headers.authorization?.replace(/^Bearer\s+/i,'')||readCookie(req,sessionCookieName);if(!token)return next();try{req.user=verifyToken(token)}catch{req.user=null}next()}

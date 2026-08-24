import jwt from 'jsonwebtoken';
const secret=()=>process.env.JWT_SECRET||'development-only-secret-change-this';
export const signToken=(payload)=>jwt.sign(payload,secret(),{expiresIn:process.env.JWT_EXPIRES_IN||'8h',issuer:'mcu-kb-api'});
export const verifyToken=(token)=>jwt.verify(token,secret(),{issuer:'mcu-kb-api'});

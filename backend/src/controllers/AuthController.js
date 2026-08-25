import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import AuthService from '../services/AuthService.js';
import { getMicrosoftClient, microsoftConfigured, scopes } from '../config/microsoft.js';
import { oauthCookieOptions, readCookie, sessionCookieName, sessionCookieOptions } from '../config/authCookie.js';
import { uploadDirectory } from '../config/multer.js';

const oauthStateCookie='mcu_oauth_state';
const oauthReturnCookie='mcu_oauth_return';
const frontendUrl=()=>process.env.FRONTEND_URL||'http://localhost:5174';
const saveSession=(res,session)=>res.cookie(sessionCookieName,session.token,sessionCookieOptions());
const avatarDirectory=path.join(uploadDirectory,'avatars');
const avatarExtensions=['jpg','png','webp'];
const cacheMicrosoftPhoto=async(userId,accessToken)=>{try{const response=await fetch('https://graph.microsoft.com/v1.0/me/photo/$value',{headers:{Authorization:`Bearer ${accessToken}`}});if(!response.ok)return;const type=response.headers.get('content-type')||'';const extension=type.includes('png')?'png':type.includes('webp')?'webp':'jpg';await fs.mkdir(avatarDirectory,{recursive:true});await Promise.all(avatarExtensions.filter(item=>item!==extension).map(item=>fs.unlink(path.join(avatarDirectory,`${userId}.${item}`)).catch(()=>{})));await fs.writeFile(path.join(avatarDirectory,`${userId}.${extension}`),Buffer.from(await response.arrayBuffer()))}catch(error){console.warn('Microsoft profile photo could not be cached:',error.message)}};

export default class AuthController {
  static status(req,res) {
    res.json({status:'ok',microsoftConfigured:microsoftConfigured()});
  }

  static async microsoftRedirect(req,res,next) {
    try {
      if(!microsoftConfigured())return res.status(503).json({message:'Microsoft Entra ID is not configured'});
      const state=crypto.randomBytes(32).toString('hex');
      res.cookie(oauthStateCookie,state,oauthCookieOptions());
      const requested=String(req.query.returnTo||'');
      const returnTo=/^\/(admin(?:\/|\?|$)|search(?:\?|$)|documents\/|systems(?:\?|$))/.test(requested)?requested:'';
      if(returnTo)res.cookie(oauthReturnCookie,returnTo,oauthCookieOptions());
      const url=await getMicrosoftClient().getAuthCodeUrl({scopes,redirectUri:process.env.AZURE_REDIRECT_URI,state,prompt:'select_account'});
      res.redirect(url);
    } catch(error) { next(error); }
  }

  static async microsoftCallback(req,res,next) {
    try {
      const expectedState=readCookie(req,oauthStateCookie);
      const returnTo=readCookie(req,oauthReturnCookie);
      res.clearCookie(oauthStateCookie,{...oauthCookieOptions(),maxAge:undefined});
      res.clearCookie(oauthReturnCookie,{...oauthCookieOptions(),maxAge:undefined});
      if(!expectedState||!req.query.state||req.query.state!==expectedState)return res.status(400).json({message:'Invalid Microsoft authentication state'});
      if(req.query.error)return res.redirect(`${frontendUrl()}/login?error=microsoft_sign_in_cancelled`);
      const tokenResult=await getMicrosoftClient().acquireTokenByCode({code:req.query.code,scopes,redirectUri:process.env.AZURE_REDIRECT_URI});
      const graphResponse=await fetch('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName,givenName,surname,jobTitle,department',{headers:{Authorization:`Bearer ${tokenResult.accessToken}`}});
      if(!graphResponse.ok)throw Object.assign(new Error('Unable to retrieve Microsoft profile'),{status:502});
      const profile=await graphResponse.json();
      const session=await AuthService.authenticateMicrosoft(profile);
      await cacheMicrosoftPhoto(session.user.id,tokenResult.accessToken);
      saveSession(res,session);
      const hasAdminAccess=[1,2].includes(Number(session.user.role_id));
      const destination=returnTo?.startsWith('/admin')?(hasAdminAccess?returnTo:'/?access=admin-denied'):(returnTo||(hasAdminAccess?'/admin':'/'));
      res.redirect(`${frontendUrl()}${destination}`);
    } catch(error) {
      if(error.code==='ACCOUNT_PENDING')return res.redirect(`${frontendUrl()}/login?status=pending`);
      if(error.code==='ACCOUNT_INACTIVE')return res.redirect(`${frontendUrl()}/login?status=inactive`);
      next(error);
    }
  }

  static me(req,res) { res.json({user:req.user}); }
  static async photo(req,res) { for(const extension of avatarExtensions){const file=path.join(avatarDirectory,`${req.user.id}.${extension}`);try{await fs.access(file);res.set('Cache-Control','private, max-age=3600');return res.type(extension==='jpg'?'jpeg':extension).sendFile(file)}catch{}}return res.status(404).json({message:'Microsoft profile photo is unavailable'}); }
  static logout(req,res) { res.clearCookie(sessionCookieName,{...sessionCookieOptions(),maxAge:undefined});res.json({message:'Signed out successfully'}); }
}

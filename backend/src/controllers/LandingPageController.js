import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import LandingPageService from '../services/LandingPageService.js';
import {query} from '../config/database.js';
import {landingPageMediaDirectory} from '../config/landingPageMulter.js';
const saveFile=async file=>{const id=crypto.randomUUID(),storedName=`${Date.now()}-${id}${path.extname(file.originalname).toLowerCase()}`,target=path.join(landingPageMediaDirectory,storedName);await fs.mkdir(landingPageMediaDirectory,{recursive:true});for(let attempt=0;attempt<3;attempt+=1){try{await fs.writeFile(target,file.buffer,{flag:'wx'});return{id,storedName,target}}catch(error){if(!['EPERM','EBUSY'].includes(error.code)||attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,100*(attempt+1)))}}};
export default class LandingPageController{
 static async list(req,res){res.json({data:await LandingPageService.list()})}
 static async show(req,res){res.json({data:await LandingPageService.show(req.params.slug)})}
 static async save(req,res){res.json({message:'Landing page updated successfully',data:await LandingPageService.save(req.params.slug,req.body,req.user.id)})}
 static async upload(req,res){if(!req.file)throw Object.assign(new Error('Select an image to upload.'),{status:422,errors:{image:'Select an image to upload.'}});const saved=await saveFile(req.file);try{await query('INSERT INTO landing_page_media (id,original_name,stored_name,mime_type,file_size,uploaded_by) VALUES (:id,:originalName,:storedName,:mimeType,:fileSize,:userId)',{id:saved.id,originalName:req.file.originalname,storedName:saved.storedName,mimeType:req.file.mimetype,fileSize:req.file.size,userId:req.user.id})}catch(error){await fs.unlink(saved.target).catch(()=>{});throw error}res.status(201).json({message:'Page image uploaded successfully',data:{id:saved.id,url:`/api/public/landing-page-media/${saved.storedName}`,name:req.file.originalname}})}
 static media(req,res){const name=path.basename(req.params.filename);if(name!==req.params.filename||!/^[a-zA-Z0-9_.-]+$/.test(name))throw Object.assign(new Error('Image not found'),{status:404});res.sendFile(path.join(landingPageMediaDirectory,name),error=>{if(error&&!res.headersSent)res.status(error.statusCode||404).json({message:'Image not found'})})}
}

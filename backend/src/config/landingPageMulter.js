import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import {fileURLToPath} from 'node:url';
export const landingPageMediaDirectory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../storage/landing-page-media');
fs.mkdirSync(landingPageMediaDirectory,{recursive:true});
const allowed=new Map([['image/jpeg',['.jpg','.jpeg']],['image/png',['.png']],['image/webp',['.webp']],['image/gif',['.gif']]]);
export default multer({storage:multer.memoryStorage(),limits:{fileSize:15*1024*1024,files:1},fileFilter:(_,file,callback)=>{const extension=path.extname(file.originalname).toLowerCase(),extensions=allowed.get(file.mimetype);return extensions?.includes(extension)?callback(null,true):callback(Object.assign(new Error('Only JPG, PNG, WebP, and GIF images are accepted.'),{status:415,errors:{image:'Select a valid JPG, PNG, WebP, or GIF image.'}}))}});

import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const uploadDirectory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../uploads');
const allowed=new Map([
  ['application/pdf',['.pdf']],
  ['application/msword',['.doc']],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',['.docx']],
  ['application/vnd.ms-excel',['.xls']],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',['.xlsx']],
]);
const storage=multer.diskStorage({destination:uploadDirectory,filename:(_,file,callback)=>callback(null,`${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)});
export default multer({storage,limits:{fileSize:25*1024*1024,files:1,fields:20},fileFilter:(_,file,callback)=>{const extension=path.extname(file.originalname).toLowerCase();const extensions=allowed.get(file.mimetype);return extensions?.includes(extension)?callback(null,true):callback(Object.assign(new Error('Only PDF, Microsoft Word, and Microsoft Excel files are accepted'),{status:415}))}});

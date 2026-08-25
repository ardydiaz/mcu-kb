import path from 'node:path';
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
import sanitizeHtml from 'sanitize-html';
import WordExtractor from 'word-extractor';

const MAX_SHEETS=5,MAX_ROWS=200,MAX_COLUMNS=50,MAX_CELL_LENGTH=2000,MAX_WORD_TEXT=300000;
const cleanCell=value=>String(value??'').slice(0,MAX_CELL_LENGTH);
const allowedTags=['p','br','h1','h2','h3','h4','h5','h6','strong','b','em','i','u','s','ul','ol','li','table','thead','tbody','tr','th','td','blockquote','a','img','sup','sub'];

export default class DocumentPreviewService{
 static async preview(document,filePath){
  const extension=path.extname(document.original_name||'').toLowerCase();
  if(extension==='.xlsx')return this.excel(filePath);
  if(extension==='.docx')return this.docx(filePath);
  if(extension==='.doc')return this.doc(filePath);
  if(extension==='.xls')throw Object.assign(new Error('Legacy .xls preview is not supported. Save the workbook as .xlsx and upload a new version.'),{status:415});
  throw Object.assign(new Error('Preview is unavailable for this file type'),{status:415});
 }

 static async excel(filePath){
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.readFile(filePath);const sheets=[];
  workbook.worksheets.slice(0,MAX_SHEETS).forEach(sheet=>{const rows=[];const rowCount=Math.min(sheet.actualRowCount||sheet.rowCount,MAX_ROWS);const columnCount=Math.min(sheet.actualColumnCount||sheet.columnCount,MAX_COLUMNS);for(let rowNumber=1;rowNumber<=rowCount;rowNumber++){const row=sheet.getRow(rowNumber);const values=[];for(let columnNumber=1;columnNumber<=columnCount;columnNumber++)values.push(cleanCell(row.getCell(columnNumber).text));rows.push(values)}sheets.push({name:sheet.name,rows,column_count:columnCount,truncated:(sheet.actualRowCount||sheet.rowCount)>MAX_ROWS||(sheet.actualColumnCount||sheet.columnCount)>MAX_COLUMNS})});
  return{kind:'excel',sheets,truncated:workbook.worksheets.length>MAX_SHEETS};
 }

 static async docx(filePath){
  const result=await mammoth.convertToHtml({path:filePath},{convertImage:mammoth.images.imgElement(image=>image.read('base64').then(data=>({src:`data:${image.contentType};base64,${data}`})))});const html=sanitizeHtml(result.value,{allowedTags,allowedAttributes:{a:['href'],img:['src','alt'],th:['colspan','rowspan'],td:['colspan','rowspan']},allowedSchemes:['http','https','mailto'],allowedSchemesByTag:{img:['data']},transformTags:{a:sanitizeHtml.simpleTransform('a',{rel:'noopener noreferrer',target:'_blank'})}});return{kind:'word',html,warnings:result.messages.map(message=>message.message).slice(0,10)};
 }

 static async doc(filePath){const extractor=new WordExtractor();const document=await extractor.extract(filePath);return{kind:'word-text',text:String(document.getBody()||'').slice(0,MAX_WORD_TEXT)}}
}

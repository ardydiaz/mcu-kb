import path from 'node:path';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import WordExtractor from 'word-extractor';
import OcrService from './OcrService.js';

const clean=value=>String(value??'').replace(/\u0000/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
const columnName=number=>{let result='';for(let value=number;value>0;value=Math.floor((value-1)/26))result=String.fromCharCode(65+(value-1)%26)+result;return result};

export default class DocumentContentExtractor{
  static async extract(filePath,originalName){
    const extension=path.extname(originalName||filePath).toLowerCase();
    if(extension==='.pdf')return this.pdf(filePath);
    if(extension==='.docx')return this.docx(filePath);
    if(extension==='.doc')return this.doc(filePath);
    if(extension==='.xlsx')return this.xlsx(filePath);
    throw Object.assign(new Error(`${extension||'This file type'} content extraction is not supported. Convert legacy Excel files to .xlsx.`),{status:415});
  }

  static async pdf(filePath){
    const pages=[];
    const renderPage=async page=>{const content=await page.getTextContent({normalizeWhitespace:true});const text=clean(content.items.map(item=>item.str).join(' '));pages.push(text);return text};
    await pdf(filePath,{pagerender:renderPage,max:0});
    const extracted=pages.map((content,index)=>({content,page_number:index+1})).filter(section=>section.content);
    return extracted.length?extracted:OcrService.readPdf(filePath);
  }

  static async docx(filePath){
    const result=await mammoth.extractRawText({path:filePath});
    return clean(result.value).split(/\n\s*\n/).map(content=>({content:clean(content)})).filter(section=>section.content);
  }

  static async doc(filePath){
    const extractor=new WordExtractor();const document=await extractor.extract(filePath);
    return clean(document.getBody()).split(/\n\s*\n/).map(content=>({content:clean(content)})).filter(section=>section.content);
  }

  static async xlsx(filePath){
    const workbook=new ExcelJS.Workbook();await workbook.xlsx.readFile(filePath);const sections=[];
    for(const sheet of workbook.worksheets){
      const maxColumn=Math.min(sheet.actualColumnCount||sheet.columnCount,100);
      for(let rowNumber=1;rowNumber<=Math.min(sheet.actualRowCount||sheet.rowCount,10000);rowNumber++){
        const values=[];const row=sheet.getRow(rowNumber);
        for(let column=1;column<=maxColumn;column++){const value=clean(row.getCell(column).text);if(value)values.push(`${columnName(column)}: ${value}`)}
        if(values.length)sections.push({content:`Workbook sheet: ${sheet.name}\nRow ${rowNumber}\n${values.join('\n')}`,sheet_name:sheet.name,cell_range:`A${rowNumber}:${columnName(maxColumn)}${rowNumber}`});
      }
    }
    return sections;
  }
}

import fs from 'node:fs/promises';

const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const endpoint=()=>String(process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT||'').replace(/\/$/,'');

export default class OcrService{
  static configured(){return Boolean(endpoint()&&process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY)}
  static async readPdf(filePath){
    if(!this.configured())throw new Error('The PDF contains no extractable text. Configure Azure Document Intelligence OCR or upload a searchable PDF.');
    const response=await fetch(`${endpoint()}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=${process.env.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION||'2024-11-30'}`,{method:'POST',headers:{'Content-Type':'application/octet-stream','Ocp-Apim-Subscription-Key':process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY},body:await fs.readFile(filePath)});
    if(!response.ok)throw new Error(`OCR service returned ${response.status}`);const operation=response.headers.get('operation-location');if(!operation)throw new Error('OCR service did not return an operation URL');
    for(let attempt=0;attempt<60;attempt++){await wait(1000);const resultResponse=await fetch(operation,{headers:{'Ocp-Apim-Subscription-Key':process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY}});if(!resultResponse.ok)throw new Error(`OCR result service returned ${resultResponse.status}`);const result=await resultResponse.json();if(result.status==='failed')throw new Error(result.error?.message||'OCR processing failed');if(result.status==='succeeded')return (result.analyzeResult?.pages||[]).map((page,index)=>({content:(page.lines||[]).map(line=>line.content).join(' ').trim(),page_number:page.pageNumber||index+1})).filter(page=>page.content)}
    throw new Error('OCR processing timed out');
  }
}

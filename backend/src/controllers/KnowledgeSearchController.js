import KnowledgeSearchService from '../services/KnowledgeSearchService.js';

const pendingAnswers=new Map();

export default class KnowledgeSearchController {
  static async ask(req,res){
    const message=String(req.body.message||'').trim();
    if(!message)return res.status(422).json({message:'Please correct the highlighted fields',errors:{message:'Enter a document question or search keyword.'}});
    if(message.length<2)return res.status(422).json({message:'Please correct the highlighted fields',errors:{message:'Search must contain at least 2 characters.'}});
    if(message.length>500)return res.status(422).json({message:'Please correct the highlighted fields',errors:{message:'Search must not exceed 500 characters.'}});
    const key=`${req.user.id}:${message.toLowerCase()}`;
    let pending=pendingAnswers.get(key);
    if(!pending){
      pending=KnowledgeSearchService.ask(message,{user:req.user}).finally(()=>pendingAnswers.delete(key));
      pendingAnswers.set(key,pending);
    }
    res.json(await pending);
  }
}

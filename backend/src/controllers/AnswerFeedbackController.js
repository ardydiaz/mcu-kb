import AnswerFeedbackModel from '../models/AnswerFeedbackModel.js';
export default class AnswerFeedbackController{
  static async record(req,res){
    const queryText=String(req.body.query||'').trim();
    const vote=String(req.body.vote||'').trim();
    if(!queryText||!['up','down'].includes(vote))return res.status(422).json({message:'Please correct the highlighted fields',errors:{vote:'Provide the question asked and a vote of up or down.'}});
    await AnswerFeedbackModel.upsert({user_id:req.user.id,query_text:queryText.slice(0,500),answer_excerpt:String(req.body.answer||'').slice(0,2000),vote});
    res.status(201).json({message:'Feedback recorded.'});
  }
}

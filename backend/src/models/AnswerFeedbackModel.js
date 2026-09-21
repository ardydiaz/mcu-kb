import { query } from '../config/database.js';
export default class AnswerFeedbackModel{
  static upsert({user_id,query_text,answer_excerpt,vote}){
    return query('INSERT INTO answer_feedback (user_id,query_text,answer_excerpt,vote) VALUES (:user_id,:query_text,:answer_excerpt,:vote) ON DUPLICATE KEY UPDATE vote=:vote,answer_excerpt=:answer_excerpt,updated_at=CURRENT_TIMESTAMP',{user_id,query_text,answer_excerpt,vote});
  }
  static summary(){
    return query("SELECT SUM(vote='up') up,SUM(vote='down') down,COUNT(*) total FROM answer_feedback");
  }
  static recent(limit=10){
    return query(`SELECT f.vote,f.query_text,f.created_at,f.updated_at,u.fullname FROM answer_feedback f LEFT JOIN users u ON u.id=f.user_id ORDER BY f.updated_at DESC LIMIT ${Math.min(Number(limit)||10,50)}`);
  }
}

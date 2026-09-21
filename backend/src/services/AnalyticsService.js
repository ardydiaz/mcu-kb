import { query } from '../config/database.js';
import DocumentService from './DocumentService.js';
import AnswerFeedbackModel from '../models/AnswerFeedbackModel.js';

export default class AnalyticsService {
  static async dashboard(){
    const [userRows,documentStats]=await Promise.all([
      query("SELECT COUNT(*) users,SUM(status='pending') pending FROM users"),
      DocumentService.stats(),
    ]);
    return {users:Number(userRows[0]?.users||0),pending:Number(userRows[0]?.pending||0),documents:documentStats.documents,departments:documentStats.departments};
  }

  static async visits(){return[]}

  static async answerFeedback(){
    const [summaryRows,recent]=await Promise.all([AnswerFeedbackModel.summary(),AnswerFeedbackModel.recent(10)]);
    const summary=summaryRows[0]||{};
    return {up:Number(summary.up||0),down:Number(summary.down||0),total:Number(summary.total||0),recent};
  }
}

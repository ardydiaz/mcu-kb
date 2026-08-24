import { query } from '../config/database.js';
import DocumentService from './DocumentService.js';

export default class AnalyticsService {
  static async dashboard(){
    const [userRows,documentStats]=await Promise.all([
      query("SELECT COUNT(*) users,SUM(status='pending') pending FROM users"),
      DocumentService.stats(),
    ]);
    return {users:Number(userRows[0]?.users||0),pending:Number(userRows[0]?.pending||0),documents:documentStats.documents,departments:documentStats.departments};
  }

  static async visits(){return[]}
}

import AnalyticsService from '../services/AnalyticsService.js';
import DocumentService from '../services/DocumentService.js';

export default class DashboardController {
  static async index(req,res){
    const [stats,documents]=await Promise.all([AnalyticsService.dashboard(),DocumentService.recent()]);
    const recent=documents.map(document=>({action:`${document.title} uploaded by ${document.department||'Unassigned department'}`,created_at:document.uploaded_at,entity_type:'document'}));
    res.json({stats,recent});
  }
}

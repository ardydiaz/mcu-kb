import AnalyticsService from '../services/AnalyticsService.js';
import DocumentService from '../services/DocumentService.js';

export default class DashboardController {
  static async index(req,res){
    const [stats,documents]=await Promise.all([AnalyticsService.dashboard(),DocumentService.recent()]);
    const recent=documents.map(document=>({id:document.id,title:document.title,department:document.department||'Unassigned department',category:document.category_name||'General',status:document.status,version:document.version_number,mime_type:document.mime_type,created_at:document.version_created_at||document.updated_at||document.created_at,entity_type:'document'}));
    res.json({stats,recent});
  }
}

import AnalyticsService from '../services/AnalyticsService.js';export default class AnalyticsController{static async visits(req,res){res.json({data:await AnalyticsService.visits()})}}

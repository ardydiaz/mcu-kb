import DocumentService from '../services/DocumentService.js';export default class KnowledgeController{static async tree(req,res){res.json({data:await DocumentService.browse(req.user)})}}

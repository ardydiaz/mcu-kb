import DocumentService from '../services/DocumentService.js';
export default class SystemController{static async list(req,res){res.json({data:await DocumentService.departments(req.user)})}}

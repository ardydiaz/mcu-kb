import DepartmentService from '../services/DepartmentService.js';
export default class DepartmentController{
 static async list(req,res){const includeDeleted=req.query.include_deleted==='true'&&[1,2].includes(Number(req.user.role_id));res.json({data:await DepartmentService.list({search:String(req.query.search||'').trim(),includeDeleted})})}
 static async create(req,res){res.status(201).json({message:'Department created successfully',data:await DepartmentService.create(req.body,req.user.id)})}
 static async update(req,res){res.json({message:'Department updated successfully',data:await DepartmentService.update(req.params.id,req.body,req.user.id)})}
 static async remove(req,res){await DepartmentService.remove(req.params.id,req.user.id);res.json({message:'Department deleted successfully'})}
}

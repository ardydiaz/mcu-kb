import CategoryService from '../services/CategoryService.js';
export default class CategoryController {
  static async list(req,res) {
    const includeDeleted=req.query.include_deleted==='true'&&[1,2].includes(Number(req.user?.role_id));
    res.json({data:await CategoryService.list({search:String(req.query.search||'').trim(),includeDeleted})});
  }
  static async create(req,res) {
    const data=await CategoryService.create(req.body,req.user.id);
    res.status(201).json({message:'Category created successfully',data});
  }
  static async update(req,res) {
    const data=await CategoryService.update(req.params.id,req.body,req.user.id);
    res.json({message:'Category updated successfully',data});
  }
  static async remove(req,res) {
    await CategoryService.remove(req.params.id,req.user.id);
    res.json({message:'Category deleted successfully'});
  }
}

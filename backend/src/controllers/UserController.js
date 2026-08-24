import UserModel from '../models/UserModel.js';

export default class UserController {
  static async list(req,res) {
    res.json({data:await UserModel.list()});
  }

  static async updateStatus(req,res) {
    const status=String(req.body.status||'');
    if(!['active','inactive'].includes(status))return res.status(422).json({message:'Status must be active or inactive'});
    const target=await UserModel.byId(req.params.id);
    if(!target)return res.status(404).json({message:'User not found'});
    if(Number(target.id)===Number(req.user.id)&&status==='inactive')return res.status(409).json({message:'You cannot deactivate your own account'});
    if(Number(req.user.role_id)===2&&Number(target.role_id)===1)return res.status(403).json({message:'Admins cannot modify a Super admin account'});
    await UserModel.updateStatus(target.id,status);
    res.json({message:status==='active'?'User approved successfully':'User deactivated successfully',data:await UserModel.byId(target.id)});
  }

  static async updateRole(req,res) {
    const roleId=Number(req.body.role_id);
    if(![1,2,3].includes(roleId))return res.status(422).json({message:'Role must be 1, 2, or 3'});
    const target=await UserModel.byId(req.params.id);
    if(!target)return res.status(404).json({message:'User not found'});
    if(Number(target.id)===Number(req.user.id)&&roleId!==1)return res.status(409).json({message:'You cannot remove your own Super admin role'});
    await UserModel.updateRole(target.id,roleId);
    res.json({message:'User role updated successfully',data:await UserModel.byId(target.id)});
  }
}

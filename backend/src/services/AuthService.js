import UserModel from '../models/UserModel.js';
import { signToken } from '../config/jwt.js';

export default class AuthService {
  static session(user) {
    const safe = {
      id: user.id,
      email: user.email,
      name: user.fullname,
      department: user.department ?? null,
      role_id: user.role_id ?? null,
      role: user.role_name ?? null,
    };
    return { token: signToken(safe), user: safe };
  }

  static async authenticateMicrosoft(profile) {
    const email = String(profile.mail || profile.userPrincipalName || '').toLowerCase();
    if (!email) throw Object.assign(new Error('Microsoft account did not provide an email address'), { status: 422 });
    let user = await UserModel.byEmail(email);
    if (user) {
      if (user.status==='pending')throw Object.assign(new Error('Your account is waiting for administrator approval'),{status:403,code:'ACCOUNT_PENDING'});
      if (user.status!=='active')throw Object.assign(new Error('This account is inactive'),{status:403,code:'ACCOUNT_INACTIVE'});
      user = await UserModel.updateMicrosoftProfile(user.id, { ...profile, email });
    } else {
      const result = await UserModel.create({
        email,
        fullname: profile.displayName || email,
        microsoft_id: profile.id,
        role_id: 3,
        department: profile.department || null,
        status: 'pending',
      });
      user = await UserModel.byEmail(email);
      if (!user) user = { id: result.insertId, email, fullname: profile.displayName || email, department:profile.department||null,role_id:3,role_name:'student',status:'pending' };
      throw Object.assign(new Error('Your account was created and is waiting for administrator approval'),{status:403,code:'ACCOUNT_PENDING'});
    }
    await UserModel.touch(user.id);
    return this.session(user);
  }
}

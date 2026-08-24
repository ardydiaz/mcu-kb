import { query } from '../config/database.js';

const accountSelect=`SELECT u.id,u.microsoft_id,u.email,u.fullname,u.role_id,u.department,u.status,u.created_at,u.updated_at,r.name role_name FROM users u LEFT JOIN roles r ON r.id=u.role_id`;

export default class UserModel {
  static list() {
    return query(`${accountSelect} ORDER BY u.created_at DESC`);
  }

  static byEmail(email) {
    return query(`${accountSelect} WHERE LOWER(u.email)=LOWER(:email) LIMIT 1`, { email }).then(rows=>rows[0]);
  }

  static byMicrosoftId(id) {
    return query(`${accountSelect} WHERE u.microsoft_id=:id LIMIT 1`, { id }).then(rows=>rows[0]);
  }

  static byId(id) {
    return query(`${accountSelect} WHERE u.id=:id LIMIT 1`, { id }).then(rows=>rows[0]);
  }

  static create({ email, fullname, microsoft_id, role_id=3, department=null, status='active' }) {
    return query('INSERT INTO users (microsoft_id,email,fullname,role_id,department,status) VALUES (:microsoft_id,:email,:fullname,:role_id,:department,:status)', { microsoft_id,email,fullname,role_id,department,status });
  }

  static async updateMicrosoftProfile(id, profile) {
    await query('UPDATE users SET microsoft_id=:microsoft_id,fullname=:fullname,department=COALESCE(:department,department),updated_at=NOW() WHERE id=:id', { id,microsoft_id:profile.id,fullname:profile.displayName||profile.email,department:profile.department||null });
    return this.byEmail(profile.email);
  }

  static touch(id) {
    return query('UPDATE users SET updated_at=NOW() WHERE id=:id', { id });
  }

  static updateStatus(id,status) {
    return query('UPDATE users SET status=:status,updated_at=NOW() WHERE id=:id', { id,status });
  }

  static updateRole(id,roleId) {
    return query('UPDATE users SET role_id=:roleId,updated_at=NOW() WHERE id=:id', { id,roleId });
  }
}

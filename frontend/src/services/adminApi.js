import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', withCredentials: true });
api.interceptors.request.use((config) => { const token = localStorage.getItem('mcu_token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use((r) => r, (error) => { if (error.response?.status === 401) { localStorage.removeItem('mcu_token'); localStorage.removeItem('mcu_user'); } return Promise.reject(error); });
export const getSystems = (params) => api.get('/systems', { params });
export const getCategories = (params) => api.get('/categories', { params });
export const createCategory = (payload) => api.post('/categories', payload);
export const updateCategory = (id,payload) => api.patch(`/categories/${id}`, payload);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);
export const getDepartments = (params) => api.get('/departments', { params });
export const createDepartment = (payload) => api.post('/departments', payload);
export const updateDepartment = (id,payload) => api.patch(`/departments/${id}`, payload);
export const deleteDepartment = (id) => api.delete(`/departments/${id}`);
export const getDocuments = (params) => api.get('/documents/admin', { params });
export const uploadDocument = (formData,onUploadProgress) => api.post('/documents/upload',formData,{headers:{'Content-Type':'multipart/form-data'},onUploadProgress});
export const uploadDocumentVersion = (id,formData,onUploadProgress) => api.post(`/documents/${id}/versions`,formData,{headers:{'Content-Type':'multipart/form-data'},onUploadProgress});
export const updateDocumentStatus = (id,status) => api.patch(`/documents/${id}/status`,{status});
export const getAdminDocument = (id) => api.get(`/documents/${id}`);
export const updateDocument = (id,payload) => api.patch(`/documents/${id}`,payload);
export const getAnnouncements = () => api.get('/announcements');
export const getDashboard = () => api.get('/dashboard');
export const getUsers = () => api.get('/users');
export const updateUserStatus = (id, status) => api.patch(`/users/${id}/status`, { status });
export const updateUserRole = (id, role_id) => api.patch(`/users/${id}/role`, { role_id });
export const logout = () => api.post('/auth/logout');
export const getCurrentUser = () => api.get('/auth/me');
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const pendingRequests=new Map();
const once=(key,factory)=>{if(pendingRequests.has(key))return pendingRequests.get(key);const request=Promise.resolve().then(factory).finally(()=>pendingRequests.delete(key));pendingRequests.set(key,request);return request};
export const askKnowledgeBase = (message,history=[])=>once(`ask:${String(message).trim()}:${JSON.stringify(history)}`,async()=>{
  let lastError;
  for(let attempt=0;attempt<2;attempt++){
    try{return await api.post('/public/ask',{message,history},{timeout:75000})}
    catch(error){
      lastError=error;
      const status=error.response?.status;
      const transient=!error.response||[502,503,504].includes(status);
      if(!transient||attempt===1)throw error;
      await wait(900);
    }
  }
  throw lastError;
});
export const searchPublicDocuments = (params) => once(`documents:${JSON.stringify(params||{})}`,()=>api.get('/public/documents', { params }));
export const getSearchSuggestions = (q) => api.get('/public/documents/suggestions', { params:{q} });
export const getPublicDocument = (id) => api.get(`/public/documents/${id}`);
export const getDocumentPreviewData = (id) => api.get(`/public/documents/${id}/preview-data`);
export const getKnowledgeTree = () => api.get('/knowledge/categories');
export const getLandingPages = () => api.get('/landing-pages');
export const getLandingPage = (slug) => api.get(`/landing-pages/${slug}`);
export const updateLandingPage = (slug,content) => api.put(`/landing-pages/${slug}`,{content});
export const uploadLandingPageImage = (formData,onUploadProgress) => api.post('/landing-pages/media',formData,{headers:{'Content-Type':'multipart/form-data'},onUploadProgress});
export const getPublicLandingPage = (slug) => api.get(`/public/landing-pages/${slug}`);
export default api;

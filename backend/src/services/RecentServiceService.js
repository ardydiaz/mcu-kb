import DocumentService from './DocumentService.js';
export default class RecentServiceService{static list(user){return DocumentService.search({limit:6,user})}}

import { Router } from 'express';
import DocumentController from '../controllers/DocumentController.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { uploadSingle } from '../middleware/uploadMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';

const router=Router();
router.get('/search',asyncHandler(DocumentController.search));
router.get('/admin',allowRoles(1,2),asyncHandler(DocumentController.adminList));
router.post('/upload',allowRoles(1,2),uploadSingle,asyncHandler(DocumentController.upload));
router.post('/:id/versions',allowRoles(1,2),uploadSingle,asyncHandler(DocumentController.uploadVersion));
router.post('/:id/reindex',allowRoles(1,2),asyncHandler(DocumentController.reindex));
router.get('/:id/download',asyncHandler(DocumentController.download));
router.get('/:id',asyncHandler(DocumentController.show));
router.patch('/:id/status',allowRoles(1,2),asyncHandler(DocumentController.updateStatus));
router.patch('/:id/access',allowRoles(1,2),asyncHandler(DocumentController.updateAccess));
router.patch('/:id',allowRoles(1,2),asyncHandler(DocumentController.update));
router.delete('/:id',allowRoles(1),asyncHandler(DocumentController.remove));
export default router;

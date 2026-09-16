import {Router} from 'express';
import LandingPageController from '../controllers/LandingPageController.js';
import upload from '../config/landingPageMulter.js';
import {allowRoles} from '../middleware/roleMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';
const router=Router();router.use(allowRoles(1,2));router.get('/',asyncHandler(LandingPageController.list));router.post('/media',upload.single('image'),asyncHandler(LandingPageController.upload));router.get('/:slug',asyncHandler(LandingPageController.show));router.put('/:slug',asyncHandler(LandingPageController.save));export default router;

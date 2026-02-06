import { Router } from 'express';
import socialController from '../controllers/socialController';
import { authenticate } from '../middlewares/unifiedAuth';
// import { requireAdmin } from '../middlewares/roleMiddleware'; // Assuming this exists

const router = Router();

// --- Admin Routes ---
// GET /api/admin/social/posts
router.get('/admin/social/posts', authenticate, socialController.getPosts);

// PUT /api/admin/social/posts/:id/moderate
router.put('/admin/social/posts/:id/moderate', authenticate, socialController.moderatePost);

// POST /api/admin/social/sync
router.post('/admin/social/sync', authenticate, socialController.syncNow);

// POST /api/admin/social/create (Standalone)
router.post('/admin/social/create', authenticate, socialController.createWall);

// GET /api/admin/social/walls (List)
router.get('/admin/social/walls', authenticate, socialController.listWalls);


// --- TV Routes (Public/Token based) ---
// POST /api/tv/pair
router.post('/tv/pair', authenticate, socialController.pairDevice); // Admin pairs it?

// GET /api/tv/config - Public but requires code
router.get('/tv/config', socialController.getDeviceConfig);

export default router;

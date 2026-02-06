import { Router } from 'express';
import socialController from '../controllers/socialController';
import { authenticate } from '../middlewares/unifiedAuth';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
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

// GET /api/admin/social/walls/:id (Detail)
router.get('/admin/social/walls/:id', authenticate, socialController.getWall);

// PUT /api/admin/social/walls/:id (Update)
router.put('/admin/social/walls/:id', authenticate, socialController.updateWall);

// DELETE /api/admin/social/walls/:id (Delete)
router.delete('/admin/social/walls/:id', authenticate, socialController.deleteWall);

// GET /api/admin/social/leaderboard
router.get('/admin/social/leaderboard', authenticate, socialController.getLeaderboard);


// --- Announcement Routes ---
// GET /api/events/:id/social/announcements
router.get('/events/:id/social/announcements', authenticate, socialController.getAnnouncements);
// POST /api/events/:id/social/announcements
router.post('/events/:id/social/announcements', authenticate, socialController.createAnnouncement);
// PUT /api/announcements/:id
router.put('/announcements/:id', authenticate, socialController.updateAnnouncement);
// DELETE /api/announcements/:id
router.delete('/announcements/:id', authenticate, socialController.deleteAnnouncement);


// --- TV Routes (Public/Token based) ---
// POST /api/tv/pair
router.post('/tv/pair', authenticate, socialController.pairDevice); // Admin pairs it?

// GET /api/tv/config - Public but requires code
router.get('/tv/config', socialController.getDeviceConfig);

// Public upload from QR Code
router.post('/public/social/upload/:slug', upload.single('image'), socialController.directUpload);

export default router;

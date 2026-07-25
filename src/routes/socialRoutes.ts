import { createSafeRouter } from '../middlewares/safeRouter.js';
import socialController from '../controllers/socialController.js';
import { authenticate, requireAdmin } from '../middlewares/unifiedAuth.js';
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware.js';
import { uploadSingle } from '../middlewares/upload.js';

const router = createSafeRouter();

// --- Admin Routes ---
// GET /api/admin/social/posts
router.get('/admin/social/posts', authenticate, requireAdmin, socialController.getPosts);

// PUT /api/admin/social/posts/:id/moderate
router.put('/admin/social/posts/:id/moderate', authenticate, requireAdmin, socialController.moderatePost);

// POST /api/admin/social/sync
router.post('/admin/social/sync', authenticate, requireAdmin, socialController.syncNow);

// POST /api/admin/social/create (Standalone)
router.post('/admin/social/create', authenticate, requireAdmin, socialController.createWall);

// GET /api/admin/social/walls (List)
router.get('/admin/social/walls', authenticate, requireAdmin, socialController.listWalls);

// GET /api/admin/social/walls/:id (Detail)
router.get('/admin/social/walls/:id', authenticate, requireAdmin, socialController.getWall);

// PUT /api/admin/social/walls/:id (Update)
router.put('/admin/social/walls/:id', authenticate, requireAdmin, socialController.updateWall);

// DELETE /api/admin/social/walls/:id (Delete)
router.delete('/admin/social/walls/:id', authenticate, requireAdmin, socialController.deleteWall);

// GET /api/admin/social/leaderboard
router.get('/admin/social/leaderboard', authenticate, requireAdmin, socialController.getLeaderboard);


// --- Announcement Routes ---
// GET /api/events/:id/social/announcements (admin only)
router.get('/events/:id/social/announcements', authenticate, requireAdmin, socialController.getAnnouncements);
// Public announcements endpoint for TVs and public displays (no auth)
router.get('/public/events/:id/social/announcements', socialController.getAnnouncements);
// POST /api/events/:id/social/announcements
router.post('/events/:id/social/announcements', authenticate, requireAdmin, socialController.createAnnouncement);
// PUT /api/announcements/:id
router.put('/announcements/:id', authenticate, requireAdmin, socialController.updateAnnouncement);
// DELETE /api/announcements/:id
router.delete('/announcements/:id', authenticate, requireAdmin, socialController.deleteAnnouncement);


// --- TV Routes (Public/Token based) ---
// POST /api/tv/pair (admin-only: pairs a physical display device)
router.post('/tv/pair', authenticate, requireAdmin, socialController.pairDevice);

// GET /api/tv/config - Public but requires code
router.get('/tv/config', socialController.getDeviceConfig);

// Public upload from QR Code — uploadRateLimit por IP, já que este endpoint é
// intencionalmente anônimo (não dá para exigir login sem quebrar o fluxo do QR code).
// uploadSingle('image') reaproveita o multer config + tratamento de erro já usado pelos
// uploads autenticados (limite de 50MB, filtro de mimetype, erros viram JSON 400 em vez de
// vazar como erro 500 não tratado); a validação de conteúdo real (magic bytes) continua
// dentro do controller, que é onde o buffer do arquivo passa a existir.
router.post('/public/social/upload/:slug', uploadRateLimit, uploadSingle('image'), socialController.directUpload);

export default router;

import { createSafeRouter } from '../middlewares/safeRouter.js';
import sponsorController from '../controllers/sponsorController.js';
import { authenticate, requireAdmin } from '../middlewares/unifiedAuth.js';
import multer from 'multer';
import { validateBody, validateId } from '../config/validation.js';
import { sponsorCreateSchema } from '../schemas/cms.schema.js';

// Multer in memory for Cloudinary upload
const upload = multer({ storage: multer.memoryStorage() });

const router = createSafeRouter();

// Achado de auditoria: este router é montado em "/admin/sponsors" (routes/index.ts), mas é
// um router IRMÃO de adminRoutes.ts, não aninhado nele — por isso não herdava o
// authenticateWithDB+requireAdmin de lá. Só exigia `authenticate` genérico: qualquer
// usuário autenticado (inclusive CLIENT) conseguia criar/apagar patrocinador apesar do path
// sugerir admin-only. Confirmado que só a página /admin (AdminSponsorPage.tsx) consome esta
// rota — nenhum cliente legítimo é afetado por restringir a admin.
router.use(authenticate, requireAdmin);

router.post('/', upload.single('logo'), validateBody(sponsorCreateSchema.pick({ name: true })), sponsorController.create);
router.get('/', sponsorController.list);
router.delete('/:id', validateId(), sponsorController.delete);

export default router;

import { createSafeRouter } from "../middlewares/safeRouter";
import {
  getAllPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getCollaboratorPayments,
  getPaymentStats,
} from "../controllers/collaboratorController";
import { authenticate, adminOnly } from "../middlewares/unifiedAuth";

const router = createSafeRouter();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas de pagamentos de colaboradores (dados financeiros: apenas admin)
router.get("/", adminOnly, getAllPayments);
router.post("/", adminOnly, createPayment);
router.put("/:id", adminOnly, updatePayment);
router.delete("/:id", adminOnly, deletePayment);

// Rotas para buscar pagamentos e estatísticas de um colaborador específico
router.get("/collaborator/:collaboratorId", adminOnly, getCollaboratorPayments);
router.get("/collaborator/:collaboratorId/stats", adminOnly, getPaymentStats);

export default router;

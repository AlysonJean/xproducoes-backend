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
import { validateBody } from "../config/validation";
import { paymentCreateSchema } from "../schemas/collaborator.schema";

const router = createSafeRouter();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas de pagamentos de colaboradores (dados financeiros: apenas admin)
router.get("/", adminOnly, getAllPayments);
// validateBody garante eventId/collaboratorId presentes antes de chegar no repository —
// necessário desde que CollaboratorPayment.eventId ganhou FK real para Booking (antes,
// a ausência de eventId era mascarada por um fallback para o valor literal "placeholder",
// que agora violaria a constraint em vez de ser aceito silenciosamente).
router.post("/", adminOnly, validateBody(paymentCreateSchema), createPayment);
router.put("/:id", adminOnly, updatePayment);
router.delete("/:id", adminOnly, deletePayment);

// Rotas para buscar pagamentos e estatísticas de um colaborador específico
router.get("/collaborator/:collaboratorId", adminOnly, getCollaboratorPayments);
router.get("/collaborator/:collaboratorId/stats", adminOnly, getPaymentStats);

export default router;

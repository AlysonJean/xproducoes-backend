import { Router, type Router as RouterType } from "express";
import {
  getAllPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getCollaboratorPayments,
  getPaymentStats,
} from "../controllers/collaboratorController";
import { authenticate } from "../middlewares/unifiedAuth";
import { ensureAdmin } from "../config/ensureAdmin";

const router: RouterType = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas de pagamentos de colaboradores
router.get("/", getAllPayments);
router.post("/", ensureAdmin, createPayment);
router.put("/:id", ensureAdmin, updatePayment);
router.delete("/:id", ensureAdmin, deletePayment);

// Rotas para buscar pagamentos e estatísticas de um colaborador específico
router.get("/collaborator/:collaboratorId", getCollaboratorPayments);
router.get("/collaborator/:collaboratorId/stats", getPaymentStats);

export default Router;

import { Router, type Router as RouterType } from "express";
import {
  getAllAvailabilities,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  getCollaboratorAvailabilities,
} from "../controllers/collaboratorController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { ensureAdmin } from "../config/ensureAdmin";

const router: any = Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas de disponibilidades
router.get("/", getAllAvailabilities);
router.post("/", ensureAdmin, createAvailability);
router.put("/:id", ensureAdmin, updateAvailability);
router.delete("/:id", ensureAdmin, deleteAvailability);

// Rota para buscar disponibilidades de um colaborador específico
router.get("/collaborator/:collaboratorId", getCollaboratorAvailabilities);

export default router;

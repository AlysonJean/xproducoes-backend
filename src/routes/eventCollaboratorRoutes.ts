import { Router, type Router as RouterType } from "express";
import {
  getAllEventCollaborators,
  createEventCollaborator,
} from "../controllers/collaboratorController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router: RouterType = Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rota para buscar todos os event collaborators
router.get("/", getAllEventCollaborators);

// Rota para criar uma nova atribuição de colaborador a evento
router.post("/", createEventCollaborator);

export default router;

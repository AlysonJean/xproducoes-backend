import { Router, type Router as RouterType } from "express";
import { profileController } from "../controllers/profileController";
import { authenticate } from "../middlewares/auth";

const router: RouterType = Router();

// Todas as rotas de perfil requerem autenticação
router.use(authenticate);

// Rotas de perfil geral
router.get("/profile", profileController.getProfile);
router.put("/profile", profileController.updateProfile);

// Rotas de colaboradores
router.get("/collaborators", profileController.getCollaborators);
router.get("/collaborators/:id", profileController.getCollaboratorDetails);
router.put(
  "/collaborator/profile",
  profileController.updateCollaboratorProfile,
);
router.post("/collaborator/portfolio", profileController.addPortfolioItem);

// Rotas de clientes
router.get("/clients", profileController.getClients);
router.put("/client/profile", profileController.updateClientProfile);

export default router;

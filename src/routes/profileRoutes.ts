import { createSafeRouter } from "../middlewares/safeRouter";
import { profileController } from "../controllers/profileController";
import { authenticate, requireStaff } from "../middlewares/unifiedAuth";

const router = createSafeRouter();

// Todas as rotas de perfil requerem autenticação
router.use(authenticate);

// Rotas de perfil geral (self-service — sem :id na URL, sempre o próprio req.userId)
router.get("/profile", profileController.getProfile);
router.put("/profile", profileController.updateProfile);

// Rotas de colaboradores — dado operacional interno (inclui remuneração/agenda em
// eventAssignments), não algo que um CLIENT deva enxergar. Achado de auditoria: só exigiam
// `authenticate` genérico, sem checagem de role nenhuma.
router.get("/collaborators", requireStaff, profileController.getCollaborators);
router.get("/collaborators/:id", requireStaff, profileController.getCollaboratorDetails);
router.put(
  "/collaborator/profile",
  profileController.updateCollaboratorProfile,
);
router.post("/collaborator/portfolio", profileController.addPortfolioItem);

// Rotas de clientes — mesma classe: listagem de PII (orçamento, endereço, empresa) de toda
// a base de clientes só devia ser alcançável por staff.
router.get("/clients", requireStaff, profileController.getClients);
router.put("/client/profile", profileController.updateClientProfile);

export default router;

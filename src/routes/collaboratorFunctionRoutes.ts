import { createSafeRouter } from "../middlewares/safeRouter";
import { CollaboratorFunctionController } from "../controllers/collaboratorFunctionController";
import { authenticate, adminOnly } from "../middlewares/unifiedAuth";

const router = createSafeRouter();
const controller = new CollaboratorFunctionController();

router.get("/", authenticate, controller.getAll);
router.get("/:id", authenticate, controller.getById);
router.post("/", authenticate, adminOnly, controller.create);
router.put("/:id", authenticate, adminOnly, controller.update);
router.delete("/:id", authenticate, adminOnly, controller.delete);

export default router;

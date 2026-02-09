import { Router } from "express";
import { CollaboratorFunctionController } from "../controllers/collaboratorFunctionController";

const router = Router();
const controller = new CollaboratorFunctionController();

router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;

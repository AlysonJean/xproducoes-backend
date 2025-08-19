// Caminho: backend/src/routes/contactRoutes.ts

import { Router, type Router as RouterType } from "express";
import { ContactController } from "../controllers/contactController";

const contactRoutes: RouterType = Router();
const contactController = new ContactController();

// Rota para o formulário público
contactRoutes.post("/", contactController.submitForm);

export default contactRoutes;

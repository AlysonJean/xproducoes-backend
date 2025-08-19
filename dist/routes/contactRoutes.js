"use strict";
// Caminho: backend/src/routes/contactRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contactController_1 = require("../controllers/contactController");
const contactRoutes = (0, express_1.Router)();
const contactController = new contactController_1.ContactController();
// Rota para o formulário público
contactRoutes.post("/", contactController.submitForm);
exports.default = contactRoutes;

"use strict";
// backend/src/routes/diagnosticRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnosticRoutes = void 0;
const express_1 = require("express");
const diagnostics_1 = require("../utils/diagnostics");
const router = (0, express_1.Router)();
// Rota para executar diagnósticos do sistema
router.get("/", async (req, res) => {
    try {
        const diagnostics = await (0, diagnostics_1.runDiagnostics)();
        res.json(diagnostics);
    }
    catch (error) {
        res.status(500).json({ error: "Erro ao executar diagnósticos" });
    }
});
exports.diagnosticRoutes = router;

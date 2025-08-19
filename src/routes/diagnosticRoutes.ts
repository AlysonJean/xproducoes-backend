// backend/src/routes/diagnosticRoutes.ts

import { Router, type Router as RouterType } from "express";
import { runDiagnostics } from "../utils/diagnostics";

const router: RouterType = Router();

// Rota para executar diagnósticos do sistema
router.get("/", async (req, res) => {
  try {
    const diagnostics = await runDiagnostics();
    res.json(diagnostics);
  } catch (error) {
    res.status(500).json({ error: "Erro ao executar diagnósticos" });
  }
});

export const diagnosticRoutes: Router = router;

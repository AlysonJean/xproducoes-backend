import { Router } from 'express';
import { ChecklistController } from '../controllers/checklistController';
import unifiedAuth from "../middlewares/unifiedAuth";

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(unifiedAuth.authenticateToken);

// ================================
// ROTAS PARA COLABORADORES
// ================================

// Buscar checklists do colaborador atual
router.get('/my-checklists', ChecklistController.getMyChecklists);

// Buscar checklist específico
router.get('/:id', ChecklistController.getChecklist);

// Atualizar status de um item do checklist
router.put('/:checklistId/items/:itemId', ChecklistController.updateChecklistItem);

// Atualizar status do assignment do checklist
router.put('/:id/status', ChecklistController.updateChecklistStatus);

// ================================
// ROTAS PARA ADMINISTRADORES
// ================================

// Buscar todos os checklists (admin)
router.get('/', unifiedAuth.requireManager, ChecklistController.getAllChecklists);

// Criar novo checklist
router.post('/', unifiedAuth.requireManager, ChecklistController.createChecklist);

// Atualizar checklist
router.put('/:id', unifiedAuth.requireManager, ChecklistController.updateChecklist);

// Deletar checklist
router.delete('/:id', unifiedAuth.requireManager, ChecklistController.deleteChecklist);

// Atribuir checklist a usuários
router.post('/:checklistId/assign', unifiedAuth.requireManager, ChecklistController.assignChecklist);

// Remover atribuição de checklist
router.delete('/:checklistId/assign/:userId', unifiedAuth.requireManager, ChecklistController.unassignChecklist);

export default router;
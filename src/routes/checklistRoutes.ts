import { Router } from 'express';
import { ChecklistController } from '../controllers/checklistController';
import authMiddleware from '../middlewares/authAdvanced';

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(authMiddleware.authenticateToken);

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
router.get('/', authMiddleware.requireManager, ChecklistController.getAllChecklists);

// Criar novo checklist
router.post('/', authMiddleware.requireManager, ChecklistController.createChecklist);

// Atualizar checklist
router.put('/:id', authMiddleware.requireManager, ChecklistController.updateChecklist);

// Deletar checklist
router.delete('/:id', authMiddleware.requireManager, ChecklistController.deleteChecklist);

// Atribuir checklist a usuários
router.post('/:checklistId/assign', authMiddleware.requireManager, ChecklistController.assignChecklist);

// Remover atribuição de checklist
router.delete('/:checklistId/assign/:userId', authMiddleware.requireManager, ChecklistController.unassignChecklist);

export default router;
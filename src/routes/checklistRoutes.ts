import { createSafeRouter } from '../middlewares/safeRouter';
import { ChecklistController } from '../controllers/checklistController';
import unifiedAuth from "../middlewares/unifiedAuth";

import { validateBody, validateId } from "../config/validation";
import { 
  checklistCreateSchema, 
  checklistUpdateSchema, 
  checklistItemUpdateSchema, 
  checklistAssignSchema,
  assignmentUpdateSchema 
} from "../schemas/checklist.schema";

const router = createSafeRouter();

// Middleware de autenticação para todas as rotas
router.use(unifiedAuth.authenticateToken);

// ================================
// ROTAS PARA COLABORADORES
// ================================

// Buscar checklists do colaborador atual
router.get('/my-checklists', ChecklistController.getMyChecklists);

// Buscar checklist específico
router.get('/:id', validateId(), ChecklistController.getChecklist);

// Atualizar status de um item do checklist
router.put('/:checklistId/items/:itemId', validateId('checklistId'), validateId('itemId'), validateBody(checklistItemUpdateSchema), ChecklistController.updateChecklistItem);

// Atualizar status do assignment do checklist
router.put('/:id/status', validateId(), validateBody(assignmentUpdateSchema), ChecklistController.updateChecklistStatus);

// ================================
// ROTAS PARA ADMINISTRADORES
// ================================

// Buscar todos os checklists (admin)
router.get('/', unifiedAuth.requireManager, ChecklistController.getAllChecklists);

// Criar novo checklist
router.post('/', unifiedAuth.requireManager, validateBody(checklistCreateSchema), ChecklistController.createChecklist);

// Atualizar checklist
router.put('/:id', unifiedAuth.requireManager, validateId(), validateBody(checklistUpdateSchema), ChecklistController.updateChecklist);

// Deletar checklist
router.delete('/:id', unifiedAuth.requireManager, validateId(), ChecklistController.deleteChecklist);

// Atribuir checklist a usuários
router.post('/:checklistId/assign', unifiedAuth.requireManager, validateId('checklistId'), validateBody(checklistAssignSchema), ChecklistController.assignChecklist);

// Remover atribuição de checklist
router.delete('/:checklistId/assign/:userId', unifiedAuth.requireManager, validateId('checklistId'), validateId('userId'), ChecklistController.unassignChecklist);

export default router;
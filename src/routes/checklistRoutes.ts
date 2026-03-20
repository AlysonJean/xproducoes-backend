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
const checklistController = new ChecklistController();

// Middleware de autenticação para todas as rotas
router.use(unifiedAuth.authenticateToken);

// ================================
// ROTAS PARA COLABORADORES
// ================================

// Buscar checklists do colaborador atual
router.get('/my-checklists', checklistController.getMyChecklists);

// Buscar checklist específico
router.get('/:id', validateId(), checklistController.getChecklist);

// Atualizar status de um item do checklist
router.put('/:checklistId/items/:itemId', validateId('checklistId'), validateId('itemId'), validateBody(checklistItemUpdateSchema), checklistController.updateChecklistItem);

// Atualizar status do assignment do checklist
router.put('/:id/status', validateId(), validateBody(assignmentUpdateSchema), checklistController.updateChecklistStatus);

// ================================
// ROTAS PARA ADMINISTRADORES
// ================================

// Buscar todos os checklists (admin)
router.get('/', unifiedAuth.requireManager, checklistController.getAllChecklists);

// Criar novo checklist
router.post('/', unifiedAuth.requireManager, validateBody(checklistCreateSchema), checklistController.createChecklist);

// Atualizar checklist
router.put('/:id', unifiedAuth.requireManager, validateId(), validateBody(checklistUpdateSchema), checklistController.updateChecklist);

// Deletar checklist
router.delete('/:id', unifiedAuth.requireManager, validateId(), checklistController.deleteChecklist);

// Atribuir checklist a usuários
router.post('/:checklistId/assign', unifiedAuth.requireManager, validateId('checklistId'), validateBody(checklistAssignSchema), checklistController.assignChecklist);

// Remover atribuição de checklist
router.delete('/:checklistId/assign/:userId', unifiedAuth.requireManager, validateId('checklistId'), validateId('userId'), checklistController.unassignChecklist);

export default router;

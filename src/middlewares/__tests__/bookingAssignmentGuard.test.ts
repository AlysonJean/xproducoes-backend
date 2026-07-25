// Teste de regressão dos achados #2 (addExpense) e #6 (toggleTask) da auditoria adversarial:
// qualquer ADMIN/COLLABORATOR passava no gate de role e conseguia agir (lançar despesa,
// concluir tarefa) em reservas onde não estava escalado. Reproduz o ataque (colaborador
// autenticado, não-assinado, tentando acessar a reserva de outro) e comprova o bloqueio.
import { requireEventCollaboratorAssignment, bookingIdFromParam, bookingIdFromTaskParam } from "../bookingAssignmentGuard";

jest.mock("../../config/prisma", () => ({
  prisma: {
    collaborator: { findFirst: jest.fn() },
    eventCollaborator: { findFirst: jest.fn() },
    bookingTask: { findUnique: jest.fn() },
  },
}));

const { prisma } = require("../../config/prisma");

function mockReqRes(overrides: Record<string, unknown> = {}) {
  const req: any = { userId: "user-1", userRole: "COLLABORATOR", params: { id: "booking-1" }, ...overrides };
  const res: any = {};
  const next = jest.fn();
  return { req, res, next };
}

describe("requireEventCollaboratorAssignment", () => {
  beforeEach(() => jest.clearAllMocks());

  it("ADMIN passa direto, sem consultar o banco (bypass legítimo)", async () => {
    const { req, res, next } = mockReqRes({ userRole: "ADMIN" });
    await requireEventCollaboratorAssignment(bookingIdFromParam("id"))(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(prisma.collaborator.findFirst).not.toHaveBeenCalled();
  });

  it("bloqueia colaborador SEM perfil de Collaborator vinculado", async () => {
    prisma.collaborator.findFirst.mockResolvedValue(null);
    const { req, res, next } = mockReqRes();
    await requireEventCollaboratorAssignment(bookingIdFromParam("id"))(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it("bloqueia colaborador com perfil, mas NÃO escalado nesta reserva (o ataque real dos achados #2/#6)", async () => {
    prisma.collaborator.findFirst.mockResolvedValue({ id: "collab-1" });
    prisma.eventCollaborator.findFirst.mockResolvedValue(null); // não escalado
    const { req, res, next } = mockReqRes();
    await requireEventCollaboratorAssignment(bookingIdFromParam("id"))(req, res, next);
    expect(prisma.eventCollaborator.findFirst).toHaveBeenCalledWith({
      where: { bookingId: "booking-1", collaboratorId: "collab-1" },
    });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it("permite colaborador realmente escalado na reserva", async () => {
    prisma.collaborator.findFirst.mockResolvedValue({ id: "collab-1" });
    prisma.eventCollaborator.findFirst.mockResolvedValue({ id: "ec-1" });
    const { req, res, next } = mockReqRes();
    await requireEventCollaboratorAssignment(bookingIdFromParam("id"))(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("bookingIdFromTaskParam resolve o bookingId real da tarefa antes de checar (achado #6)", async () => {
    prisma.bookingTask.findUnique.mockResolvedValue({ bookingId: "booking-42" });
    prisma.collaborator.findFirst.mockResolvedValue({ id: "collab-1" });
    prisma.eventCollaborator.findFirst.mockResolvedValue(null); // não escalado no evento 42
    const { req, res, next } = mockReqRes({ params: { taskId: "task-1" } });
    await requireEventCollaboratorAssignment(bookingIdFromTaskParam)(req, res, next);
    expect(prisma.bookingTask.findUnique).toHaveBeenCalledWith({ where: { id: "task-1" }, select: { bookingId: true } });
    expect(prisma.eventCollaborator.findFirst).toHaveBeenCalledWith({
      where: { bookingId: "booking-42", collaboratorId: "collab-1" },
    });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it("bloqueia quando a tarefa referenciada não existe (resolver retorna null)", async () => {
    prisma.bookingTask.findUnique.mockResolvedValue(null);
    const { req, res, next } = mockReqRes({ params: { taskId: "task-inexistente" } });
    await requireEventCollaboratorAssignment(bookingIdFromTaskParam)(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(prisma.collaborator.findFirst).not.toHaveBeenCalled();
  });
});

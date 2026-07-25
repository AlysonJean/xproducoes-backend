import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { ForbiddenError } from "../utils/errors";

// Achado de auditoria: bookingController.addExpense e toggleTask checavam só a ROLE
// (adminOrCollaborator) na rota, sem verificar se o colaborador está de fato escalado
// (EventCollaborator) na reserva/tarefa em questão — qualquer colaborador conseguia lançar
// despesa ou marcar tarefa concluída em evento alheio. getRoadmap, ao lado, já tinha a
// checagem certa mas duplicada inline. Este middleware centraliza a checagem como classe,
// reutilizável por qualquer rota de reserva que precise de "admin OU colaborador escalado
// neste evento específico".
type BookingIdResolver = (req: Request) => Promise<string | null> | string | null;

export function requireEventCollaboratorAssignment(resolveBookingId: BookingIdResolver) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.userRole === "ADMIN") {
        return next();
      }

      const bookingId = await resolveBookingId(req);
      if (!bookingId) {
        return next(new ForbiddenError("Reserva não encontrada."));
      }

      const collaborator = await prisma.collaborator.findFirst({
        where: { userId: req.userId },
      });
      if (!collaborator) {
        return next(new ForbiddenError("Acesso negado. Perfil de colaborador não encontrado."));
      }

      const isAssigned = await prisma.eventCollaborator.findFirst({
        where: { bookingId, collaboratorId: collaborator.id },
      });
      if (!isAssigned) {
        return next(new ForbiddenError("Acesso negado. Você não está escalado para este evento."));
      }

      return next();
    } catch (error) {
      next(error);
    }
  };
}

// Resolvers prontos para os dois formatos de parâmetro usados nas rotas de booking.
export const bookingIdFromParam = (paramName: string = "id"): BookingIdResolver => {
  return (req: Request) => (req.params[paramName] as string) || null;
};

export const bookingIdFromTaskParam: BookingIdResolver = async (req: Request) => {
  const taskId = req.params.taskId as string;
  if (!taskId) return null;
  const task = await prisma.bookingTask.findUnique({
    where: { id: taskId },
    select: { bookingId: true },
  });
  return task?.bookingId ?? null;
};

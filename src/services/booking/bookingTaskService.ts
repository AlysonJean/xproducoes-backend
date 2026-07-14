import { BookingNotFoundError } from "../../utils/bookingErrors.js";
import { prisma } from "../../config/prisma.js";
import { bookingIncludeConfig } from "./bookingShared.js";

// Tarefas, despesas e roadmap operacional do evento (Crew Experience). Extraído de
// bookingService.ts (antes uma única classe de 1351 linhas/25 métodos) na decomposição em 6
// services menores.
export class BookingTaskService {
  private prisma = prisma;
  private readonly bookingInclude = bookingIncludeConfig;

  /**
   * Crie uma nova tarefa para a reserva
   */
  async createBookingTask(bookingId: string, data: { title: string; description?: string }) {
    return await this.prisma.bookingTask.create({
      data: {
        bookingId,
        title: data.title,
        description: data.description,
      }
    });
  }

  /**
   * Alterna o status de conclusão de uma tarefa
   */
  async toggleTaskStatus(taskId: string, isCompleted: boolean) {
    return await this.prisma.bookingTask.update({
      where: { id: taskId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      }
    });
  }

  /**
   * Registra uma nova despesa para a reserva
   */
  async createBookingExpense(data: {
    bookingId: string;
    collaboratorId: string;
    amount: number;
    description: string;
    receiptUrl?: string
  }) {
    return await this.prisma.bookingExpense.create({
      data: {
        bookingId: data.bookingId,
        collaboratorId: data.collaboratorId,
        amount: data.amount,
        description: data.description,
        receiptUrl: data.receiptUrl,
        status: 'PENDING'
      }
    });
  }

  /**
   * Retorna os dados completos para o Roadmap do Evento (Crew Experience)
   */
  async getEventRoadmap(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        ...this.bookingInclude,
        eventCollaborators: {
          include: {
            collaborator: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true
                  }
                }
              }
            },
            function: true
          }
        },
        tasks: {
          orderBy: { createdAt: 'asc' as const }
        },
        expenses: {
          include: {
            collaborator: {
              select: { id: true, name: true, avatarUrl: true }
            }
          }
        }
      }
    });

    if (!booking) throw new BookingNotFoundError();
    return booking;
  }
}

export const bookingTaskService = new BookingTaskService();

import { Prisma } from "@prisma/client";

// Configuração de includes para queries otimizadas de Booking, compartilhada por todos os
// services de booking abaixo (Crud/Status/Calendar/Reporting/Attachment/Task). Extraída para
// o escopo do módulo + `satisfies` para preservar os literais `true` dos campos de `select`
// (necessário para o Prisma.BookingGetPayload abaixo inferir os campos corretamente).
//
// Movida de bookingService.ts (antes uma única classe de 1351 linhas/25 métodos) na
// decomposição em 6 services menores — ver relatório de auditoria para o racional completo.
export const bookingIncludeConfig = {
  client: {
    select: {
      id: true,
      phone: true,
      companyName: true,
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
  // Inclui resumo de avaliação para controlar UI de "Deixar Avaliação"
  review: {
    select: {
      id: true,
      rating: true,
      reported: true,
      createdAt: true,
    }
  },
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  },
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  },
  kit: {
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      imageUrl: true,
      items: {
        select: {
          equipment: {
            select: {
              id: true,
              name: true,
              description: true,
              pricePerHour: true,
              imageUrl: true,
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }
    }
  },
  equipments: {
    select: {
      id: true,
      name: true,
      description: true,
      pricePerHour: true,
      imageUrl: true,
      status: true,
      category: {
        select: {
          id: true,
          name: true
        }
      }
    }
  },
  attachments: {
    select: {
      id: true,
      url: true,
      filename: true,
      mimeType: true,
      createdAt: true
    }
  },
  services: {
    select: {
      id: true,
      name: true,
      price: true,
      imageUrl: true,
      duration: true
    }
  },
  items: {
    select: {
      id: true,
      description: true,
      quantity: true,
      unitPrice: true,
      discount: true,
      totalPrice: true,
      itemType: true,
      equipmentId: true,
      serviceId: true,
      kitId: true
    }
  },
  chats: {
    select: {
      id: true,
      name: true,
      type: true,
      updatedAt: true
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
} satisfies Prisma.BookingInclude;

// Shape de Booking com os relacionamentos de `bookingIncludeConfig` já carregados — usado nos
// métodos que recebem uma booking já buscada (sync de calendário, notificações etc.)
export type BookingWithIncludes = Prisma.BookingGetPayload<{ include: typeof bookingIncludeConfig }>;

export type BookingUpdateExtras = {
  technicalRider?: string | null;
  technicalRiderUrl?: string | null;
  locationUrl?: string | null;
  venueContactName?: string | null;
  venueContactPhone?: string | null;
};

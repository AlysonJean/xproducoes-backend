import logger from "./config/logger";

/**
 * ✅ PRISMA QUERY OPTIMIZER - ENTERPRISE PERFORMANCE
 * Helper para otimização de queries do Prisma com includes seletivos
 * Reduz overhead de dados e melhora performance
 */

// ✅ INTERFACES PARA INCLUDES TIPADOS E OTIMIZADOS

export interface OptimizedUserInclude {
  basic: {
    id: true;
    name: true;
    email: true;
  };
  profile: {
    id: true;
    name: true;
    email: true;
    avatarUrl: true;
    verified: true;
  };
  detailed: {
    id: true;
    name: true;
    email: true;
    avatarUrl: true;
    verified: true;
    createdAt: true;
    role: true;
  };
}

export interface OptimizedBookingInclude {
  minimal: {
    id: true;
    eventDate: true;
    eventEndDate: true;
    status: true;
    totalPrice: true;
    creatorId: true;
  };
  list: {
    id: true;
    eventDate: true;
    eventEndDate: true;
    status: true;
    totalPrice: true;
    location: true;
    creatorId: true;
    creator: {
      select: OptimizedUserInclude["basic"];
    };
    equipments: {
      select: {
        id: true;
        name: true;
        imageUrl: true;
      };
    };
  };
  detailed: {
    id: true;
    eventDate: true;
    eventEndDate: true;
    status: true;
    totalPrice: true;
    location: true;
    street: true;
    city: true;
    notes: true;
    creatorId: true;
    creator: {
      select: OptimizedUserInclude["profile"];
    };
    equipments: {
      select: {
        id: true;
        name: true;
        description: true;
        pricePerHour: true;
        imageUrl: true;
      };
    };
    kit: {
      select: {
        id: true;
        name: true;
        description: true;
        price: true;
        imageUrl: true;
      };
    };
  };
}

export interface OptimizedEquipmentInclude {
  basic: {
    id: true;
    name: true;
    pricePerHour: true;
    imageUrl: true;
  };
  detailed: {
    id: true;
    name: true;
    description: true;
    pricePerHour: true;
    imageUrl: true;
    category: true;
    specifications: true;
    available: true;
  };
}

export interface OptimizedCollaboratorInclude {
  basic: {
    id: true;
    user: {
      select: OptimizedUserInclude["basic"];
    };
    collaboratorRole: true;
    hourlyRate: true;
  };
  profile: {
    id: true;
    user: {
      select: OptimizedUserInclude["profile"];
    };
    collaboratorRole: true;
    specialties: true;
    hourlyRate: true;
    averageRating: true;
  };
}

// ✅ QUERY OPTIMIZER CLASS
export class PrismaQueryOptimizer {
  /**
   * ✅ OPTIMIZED USER QUERIES
   */
  static userIncludes: OptimizedUserInclude = {
    basic: {
      id: true,
      name: true,
      email: true,
    },
    profile: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      verified: true,
    },
    detailed: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      verified: true,
      createdAt: true,
      role: true,
    },
  };

  /**
   * ✅ OPTIMIZED BOOKING QUERIES
   */
  static bookingIncludes: OptimizedBookingInclude = {
    minimal: {
      id: true,
      eventDate: true,
      eventEndDate: true,
      status: true,
      totalPrice: true,
      creatorId: true,
    },
    list: {
      id: true,
      eventDate: true,
      eventEndDate: true,
      status: true,
      totalPrice: true,
      location: true,
      creatorId: true,
      creator: {
        select: this.userIncludes.basic,
      },
      equipments: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
    detailed: {
      id: true,
      eventDate: true,
      eventEndDate: true,
      status: true,
      totalPrice: true,
      location: true,
      street: true,
      city: true,
      notes: true,
      creatorId: true,
      creator: {
        select: this.userIncludes.profile,
      },
      equipments: {
        select: {
          id: true,
          name: true,
          description: true,
          pricePerHour: true,
          imageUrl: true,
        },
      },
      kit: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
        },
      },
    },
  };

  /**
   * ✅ OPTIMIZED EQUIPMENT QUERIES
   */
  static equipmentIncludes: OptimizedEquipmentInclude = {
    basic: {
      id: true,
      name: true,
      pricePerHour: true,
      imageUrl: true,
    },
    detailed: {
      id: true,
      name: true,
      description: true,
      pricePerHour: true,
      imageUrl: true,
      category: true,
      specifications: true,
      available: true,
    },
  };

  /**
   * ✅ OPTIMIZED COLLABORATOR QUERIES
   */
  static collaboratorIncludes: OptimizedCollaboratorInclude = {
    basic: {
      id: true,
      user: {
        select: this.userIncludes.basic,
      },
      collaboratorRole: true,
      hourlyRate: true,
    },
    profile: {
      id: true,
      user: {
        select: this.userIncludes.profile,
      },
      collaboratorRole: true,
      specialties: true,
      hourlyRate: true,
      averageRating: true,
    },
  };

  /**
   * ✅ PAGINATION HELPER com otimização automática
   */
  static getPaginationConfig(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100); // Máximo 100 itens por página

    return { skip, take };
  }

  /**
   * ✅ CACHE KEY GENERATOR para consultas
   */
  static generateCacheKey(
    model: string,
    operation: string,
    params: Record<string, any>,
  ): string {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `${model}:${operation}:${Buffer.from(paramString).toString("base64")}`;
  }

  /**
   * ✅ QUERY PERFORMANCE ANALYZER
   */
  static async measureQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await queryFunction();
      const duration = Date.now() - startTime;

      // Log apenas queries lentas (>500ms)
      if (duration > 500) {
        logger.warn(`Slow query detected: ${queryName} - ${duration}ms`, {
          query: queryName,
          duration,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Query failed: ${queryName} - ${duration}ms`, {
        query: queryName,
        duration,
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * ✅ BATCH QUERY HELPER para operações em lote
   */
  static async batchQuery<T>(
    queries: Array<() => Promise<T>>,
    batchSize: number = 5,
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((query) => query()));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * ✅ WHERE CLAUSE OPTIMIZER
   */
  static optimizeWhereClause(
    filters: Record<string, any>,
  ): Record<string, any> {
    const optimized: Record<string, any> = {};

    // Remove filtros vazios ou undefined
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        optimized[key] = value;
      }
    });

    return optimized;
  }
}

// ✅ HOOKS PARA LOGGING DE PERFORMANCE (opcional)
export const withQueryLogging = <T extends (...args: any[]) => Promise<any>>(
  queryFunction: T,
  queryName: string,
): T => {
  return (async (...args: any[]) => {
    return PrismaQueryOptimizer.measureQuery(queryName, () =>
      queryFunction(...args),
    );
  }) as T;
};

// ✅ EXPORT DE INCLUDES TIPADOS PARA USO DIRETO
export const QueryIncludes = {
  User: PrismaQueryOptimizer.userIncludes,
  Booking: PrismaQueryOptimizer.bookingIncludes,
  Equipment: PrismaQueryOptimizer.equipmentIncludes,
  Collaborator: PrismaQueryOptimizer.collaboratorIncludes,
};

export default PrismaQueryOptimizer;

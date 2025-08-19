"use strict";
/**
 * ✅ PRISMA QUERY OPTIMIZER - ENTERPRISE PERFORMANCE
 * Helper para otimização de queries do Prisma com includes seletivos
 * Reduz overhead de dados e melhora performance
 */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryIncludes = exports.withQueryLogging = exports.PrismaQueryOptimizer = void 0;
// ✅ QUERY OPTIMIZER CLASS
class PrismaQueryOptimizer {
    /**
     * ✅ PAGINATION HELPER com otimização automática
     */
    static getPaginationConfig(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100); // Máximo 100 itens por página
        return { skip, take };
    }
    /**
     * ✅ CACHE KEY GENERATOR para consultas
     */
    static generateCacheKey(model, operation, params) {
        const paramString = JSON.stringify(params, Object.keys(params).sort());
        return `${model}:${operation}:${Buffer.from(paramString).toString("base64")}`;
    }
    /**
     * ✅ QUERY PERFORMANCE ANALYZER
     */
    static async measureQuery(queryName, queryFunction) {
        const startTime = Date.now();
        try {
            const result = await queryFunction();
            const duration = Date.now() - startTime;
            // Log apenas queries lentas (>500ms)
            if (duration > 500) {
                console.warn(`Slow query detected: ${queryName} - ${duration}ms`, {
                    query: queryName,
                    duration,
                    timestamp: new Date().toISOString(),
                });
            }
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            console.error(`Query failed: ${queryName} - ${duration}ms`, {
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
    static async batchQuery(queries, batchSize = 5) {
        const results = [];
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
    static optimizeWhereClause(filters) {
        const optimized = {};
        // Remove filtros vazios ou undefined
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                optimized[key] = value;
            }
        });
        return optimized;
    }
}
exports.PrismaQueryOptimizer = PrismaQueryOptimizer;
_a = PrismaQueryOptimizer;
/**
 * ✅ OPTIMIZED USER QUERIES
 */
PrismaQueryOptimizer.userIncludes = {
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
PrismaQueryOptimizer.bookingIncludes = {
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
            select: _a.userIncludes.basic,
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
            select: _a.userIncludes.profile,
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
PrismaQueryOptimizer.equipmentIncludes = {
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
PrismaQueryOptimizer.collaboratorIncludes = {
    basic: {
        id: true,
        user: {
            select: _a.userIncludes.basic,
        },
        collaboratorRole: true,
        hourlyRate: true,
    },
    profile: {
        id: true,
        user: {
            select: _a.userIncludes.profile,
        },
        collaboratorRole: true,
        specialties: true,
        hourlyRate: true,
        averageRating: true,
    },
};
// ✅ HOOKS PARA LOGGING DE PERFORMANCE (opcional)
const withQueryLogging = (queryFunction, queryName) => {
    return (async (...args) => {
        return PrismaQueryOptimizer.measureQuery(queryName, () => queryFunction(...args));
    });
};
exports.withQueryLogging = withQueryLogging;
// ✅ EXPORT DE INCLUDES TIPADOS PARA USO DIRETO
exports.QueryIncludes = {
    User: PrismaQueryOptimizer.userIncludes,
    Booking: PrismaQueryOptimizer.bookingIncludes,
    Equipment: PrismaQueryOptimizer.equipmentIncludes,
    Collaborator: PrismaQueryOptimizer.collaboratorIncludes,
};
exports.default = PrismaQueryOptimizer;

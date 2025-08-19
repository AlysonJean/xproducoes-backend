"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachedUserRepository = void 0;
const prisma_1 = require("../config/prisma");
const queryOptimizer_1 = __importDefault(require("../queryOptimizer"));
const cacheService_1 = require("../services/cacheService");
/**
 * ✅ CACHED USER REPOSITORY - ENTERPRISE PERFORMANCE
 * Repository com cache integrado e queries otimizadas
 */
class CachedUserRepository {
    /**
     * ✅ FIND BY EMAIL com cache
     */
    async findByEmail(email, includeLevel = "basic") {
        const cacheKey = `user:email:${email}:${includeLevel}`;
        return cacheService_1.cacheService.getOrSet(cacheKey, async () => {
            return queryOptimizer_1.default.measureQuery("User.findByEmail", async () => {
                return prisma_1.prisma.user.findUnique({
                    where: { email },
                    select: queryOptimizer_1.default.userIncludes[includeLevel],
                });
            });
        }, cacheService_1.CacheService.TTL.MEDIUM);
    }
    /**
     * ✅ FIND BY ID com cache
     */
    async findById(id, includeLevel = "basic") {
        const cacheKey = cacheService_1.CacheService.KEYS.USER(id);
        return cacheService_1.cacheService.getOrSet(cacheKey, async () => {
            return queryOptimizer_1.default.measureQuery("User.findById", async () => {
                return prisma_1.prisma.user.findUnique({
                    where: { id },
                    select: queryOptimizer_1.default.userIncludes[includeLevel],
                });
            });
        }, cacheService_1.CacheService.TTL.MEDIUM);
    }
    /**
     * ✅ CREATE com invalidação de cache
     */
    async create(data) {
        const user = await queryOptimizer_1.default.measureQuery("User.create", async () => {
            return prisma_1.prisma.user.create({
                data,
                select: queryOptimizer_1.default.userIncludes.profile,
            });
        });
        // Invalidar caches relacionados
        if (user.email) {
            await cacheService_1.cacheService.delete(`user:email:${user.email}:basic`);
            await cacheService_1.cacheService.delete(`user:email:${user.email}:profile`);
            await cacheService_1.cacheService.delete(`user:email:${user.email}:detailed`);
        }
        return user;
    }
    /**
     * ✅ UPDATE com invalidação de cache
     */
    async update(id, data, includeLevel = "profile") {
        const user = await queryOptimizer_1.default.measureQuery("User.update", async () => {
            return prisma_1.prisma.user.update({
                where: { id },
                data,
                select: queryOptimizer_1.default.userIncludes[includeLevel],
            });
        });
        // Invalidar caches do usuário
        await cacheService_1.cacheService.invalidateUserCaches(id);
        return user;
    }
    /**
     * ✅ DELETE com invalidação de cache
     */
    async delete(id) {
        await queryOptimizer_1.default.measureQuery("User.delete", async () => {
            return prisma_1.prisma.user.delete({ where: { id } });
        });
        // Invalidar caches do usuário
        await cacheService_1.cacheService.invalidateUserCaches(id);
    }
    /**
     * ✅ COUNT ALL CLIENTS com cache
     */
    async countAllClients() {
        const cacheKey = "stats:clients:count";
        return cacheService_1.cacheService.getOrSet(cacheKey, async () => {
            return queryOptimizer_1.default.measureQuery("User.countClients", async () => {
                return prisma_1.prisma.user.count({ where: { role: "CLIENT" } });
            });
        }, cacheService_1.CacheService.TTL.LONG);
    }
    /**
     * ✅ FIND ALL CLIENTS com cache e paginação
     */
    async findAllClients(page = 1, limit = 10) {
        const cacheKey = `clients:page:${page}:limit:${limit}`;
        return cacheService_1.cacheService.getOrSet(cacheKey, async () => {
            return queryOptimizer_1.default.measureQuery("User.findAllClients", async () => {
                const { skip, take } = queryOptimizer_1.default.getPaginationConfig(page, limit);
                return prisma_1.prisma.user.findMany({
                    where: { role: "CLIENT" },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                        createdAt: true,
                        clientProfile: {
                            select: {
                                phone: true,
                                companyName: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take,
                });
            });
        }, cacheService_1.CacheService.TTL.MEDIUM);
    }
    /**
     * ✅ SEARCH USERS sem cache (dados dinâmicos)
     */
    async searchUsers(searchTerm, page = 1, limit = 10) {
        return queryOptimizer_1.default.measureQuery("User.search", async () => {
            const { skip, take } = queryOptimizer_1.default.getPaginationConfig(page, limit);
            return prisma_1.prisma.user.findMany({
                where: {
                    OR: [
                        { name: { contains: searchTerm, mode: "insensitive" } },
                        { email: { contains: searchTerm, mode: "insensitive" } },
                    ],
                },
                select: queryOptimizer_1.default.userIncludes.profile,
                orderBy: { name: "asc" },
                skip,
                take,
            });
        });
    }
    /**
     * ✅ VERIFY EMAIL AVAILABILITY com cache curto
     */
    async isEmailAvailable(email, excludeUserId) {
        const cacheKey = `email:available:${email}:${excludeUserId || "none"}`;
        return cacheService_1.cacheService.getOrSet(cacheKey, async () => {
            return queryOptimizer_1.default.measureQuery("User.emailAvailable", async () => {
                const where = excludeUserId
                    ? { email, id: { not: excludeUserId } }
                    : { email };
                const user = await prisma_1.prisma.user.findFirst({
                    where,
                    select: { id: true },
                });
                return !user;
            });
        }, cacheService_1.CacheService.TTL.SHORT); // Cache curto para dados críticos
    }
    /**
     * ✅ GET USER DASHBOARD STATS com cache
     */
    async getUserDashboardStats(userId) {
        const cacheKey = cacheService_1.CacheService.KEYS.DASHBOARD_STATS(userId);
        return cacheService_1.cacheService.getOrSet(cacheKey, async () => {
            return queryOptimizer_1.default.measureQuery("User.dashboardStats", async () => {
                const [totalBookings, completedBookings, totalSpent] = await Promise.all([
                    prisma_1.prisma.booking.count({ where: { creatorId: userId } }),
                    prisma_1.prisma.booking.count({
                        where: {
                            creatorId: userId,
                            status: "COMPLETED",
                        },
                    }),
                    prisma_1.prisma.booking.aggregate({
                        where: {
                            creatorId: userId,
                            status: { in: ["CONFIRMED", "COMPLETED"] },
                        },
                        _sum: { totalPrice: true },
                    }),
                ]);
                return {
                    totalBookings,
                    completedBookings,
                    totalSpent: totalSpent._sum.totalPrice || 0,
                    completionRate: totalBookings > 0
                        ? (completedBookings / totalBookings) * 100
                        : 0,
                };
            });
        }, cacheService_1.CacheService.TTL.LONG);
    }
}
exports.CachedUserRepository = CachedUserRepository;

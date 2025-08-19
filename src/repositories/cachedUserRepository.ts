import { prisma } from "../config/prisma";
import PrismaQueryOptimizer from "../queryOptimizer";
import { cacheService, CacheService } from "../services/cacheService";

type UserIncludeLevel = "basic" | "profile" | "detailed";

/**
 * ✅ CACHED USER REPOSITORY - ENTERPRISE PERFORMANCE
 * Repository com cache integrado e queries otimizadas
 */
export class CachedUserRepository {
  /**
   * ✅ FIND BY EMAIL com cache
   */
  async findByEmail(email: string, includeLevel: UserIncludeLevel = "basic") {
    const cacheKey = `user:email:${email}:${includeLevel}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return PrismaQueryOptimizer.measureQuery(
          "User.findByEmail",
          async () => {
            return prisma.user.findUnique({
              where: { email },
              select: PrismaQueryOptimizer.userIncludes[includeLevel],
            });
          },
        );
      },
      CacheService.TTL.MEDIUM,
    );
  }

  /**
   * ✅ FIND BY ID com cache
   */
  async findById(id: string, includeLevel: UserIncludeLevel = "basic") {
    const cacheKey = CacheService.KEYS.USER(id);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return PrismaQueryOptimizer.measureQuery("User.findById", async () => {
          return prisma.user.findUnique({
            where: { id },
            select: PrismaQueryOptimizer.userIncludes[includeLevel],
          });
        });
      },
      CacheService.TTL.MEDIUM,
    );
  }

  /**
   * ✅ CREATE com invalidação de cache
   */
  async create(data: Parameters<typeof prisma.user.create>[0]["data"]) {
    const user = await PrismaQueryOptimizer.measureQuery(
      "User.create",
      async () => {
        return prisma.user.create({
          data,
          select: PrismaQueryOptimizer.userIncludes.profile,
        });
      },
    );

    // Invalidar caches relacionados
    if (user.email) {
      await cacheService.delete(`user:email:${user.email}:basic`);
      await cacheService.delete(`user:email:${user.email}:profile`);
      await cacheService.delete(`user:email:${user.email}:detailed`);
    }

    return user;
  }

  /**
   * ✅ UPDATE com invalidação de cache
   */
  async update(
    id: string,
    data: { name?: string; avatarUrl?: string },
    includeLevel: UserIncludeLevel = "profile",
  ) {
    const user = await PrismaQueryOptimizer.measureQuery(
      "User.update",
      async () => {
        return prisma.user.update({
          where: { id },
          data,
          select: PrismaQueryOptimizer.userIncludes[includeLevel],
        });
      },
    );

    // Invalidar caches do usuário
    await cacheService.invalidateUserCaches(id);

    return user;
  }

  /**
   * ✅ DELETE com invalidação de cache
   */
  async delete(id: string): Promise<void> {
    await PrismaQueryOptimizer.measureQuery("User.delete", async () => {
      return prisma.user.delete({ where: { id } });
    });

    // Invalidar caches do usuário
    await cacheService.invalidateUserCaches(id);
  }

  /**
   * ✅ COUNT ALL CLIENTS com cache
   */
  async countAllClients() {
    const cacheKey = "stats:clients:count";

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return PrismaQueryOptimizer.measureQuery(
          "User.countClients",
          async () => {
            return prisma.user.count({ where: { role: "CLIENT" } });
          },
        );
      },
      CacheService.TTL.LONG,
    );
  }

  /**
   * ✅ FIND ALL CLIENTS com cache e paginação
   */
  async findAllClients(page: number = 1, limit: number = 10) {
    const cacheKey = `clients:page:${page}:limit:${limit}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return PrismaQueryOptimizer.measureQuery(
          "User.findAllClients",
          async () => {
            const { skip, take } = PrismaQueryOptimizer.getPaginationConfig(
              page,
              limit,
            );

            return prisma.user.findMany({
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
          },
        );
      },
      CacheService.TTL.MEDIUM,
    );
  }

  /**
   * ✅ SEARCH USERS sem cache (dados dinâmicos)
   */
  async searchUsers(searchTerm: string, page: number = 1, limit: number = 10) {
    return PrismaQueryOptimizer.measureQuery("User.search", async () => {
      const { skip, take } = PrismaQueryOptimizer.getPaginationConfig(
        page,
        limit,
      );

      return prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: PrismaQueryOptimizer.userIncludes.profile,
        orderBy: { name: "asc" },
        skip,
        take,
      });
    });
  }

  /**
   * ✅ VERIFY EMAIL AVAILABILITY com cache curto
   */
  async isEmailAvailable(
    email: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const cacheKey = `email:available:${email}:${excludeUserId || "none"}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return PrismaQueryOptimizer.measureQuery(
          "User.emailAvailable",
          async () => {
            const where: { email: string; id?: { not: string } } = excludeUserId
              ? { email, id: { not: excludeUserId } }
              : { email };

            const user = await prisma.user.findFirst({
              where,
              select: { id: true },
            });

            return !user;
          },
        );
      },
      CacheService.TTL.SHORT,
    ); // Cache curto para dados críticos
  }

  /**
   * ✅ GET USER DASHBOARD STATS com cache
   */
  async getUserDashboardStats(userId: string) {
    const cacheKey = CacheService.KEYS.DASHBOARD_STATS(userId);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return PrismaQueryOptimizer.measureQuery(
          "User.dashboardStats",
          async () => {
            const [totalBookings, completedBookings, totalSpent] =
              await Promise.all([
                prisma.booking.count({ where: { creatorId: userId } }),
                prisma.booking.count({
                  where: {
                    creatorId: userId,
                    status: "COMPLETED",
                  },
                }),
                prisma.booking.aggregate({
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
              completionRate:
                totalBookings > 0
                  ? (completedBookings / totalBookings) * 100
                  : 0,
            };
          },
        );
      },
      CacheService.TTL.LONG,
    );
  }
}

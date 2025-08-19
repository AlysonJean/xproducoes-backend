/**
 * ✅ MEMORY CACHE SERVICE - ENTERPRISE PERFORMANCE
 * Sistema de cache em memória para otimização de queries
 * Para produção, substituir por Redis
 */

interface CacheItem {
  data: any;
  expires: number;
}

export class CacheService {
  private static instance: CacheService;
  private memoryStore = new Map<string, CacheItem>();
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Limpeza automática a cada 5 minutos
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * ✅ CLEANUP EXPIRED ITEMS
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, item] of this.memoryStore.entries()) {
      if (now > item.expires) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * ✅ GET CACHED DATA
   */
  async get<T>(key: string): Promise<T | null> {
    const item = this.memoryStore.get(key);
    if (!item || Date.now() > item.expires) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.data;
  }

  /**
   * ✅ SET CACHED DATA with TTL
   */
  async set(
    key: string,
    data: any,
    ttlSeconds: number = 300,
  ): Promise<boolean> {
    this.memoryStore.set(key, {
      data,
      expires: Date.now() + ttlSeconds * 1000,
    });
    return true;
  }

  /**
   * ✅ DELETE CACHE KEY
   */
  async delete(key: string): Promise<boolean> {
    return this.memoryStore.delete(key);
  }

  /**
   * ✅ DELETE CACHE PATTERN
   */
  async deletePattern(pattern: string): Promise<boolean> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    let deleted = false;

    for (const key of this.memoryStore.keys()) {
      if (regex.test(key)) {
        this.memoryStore.delete(key);
        deleted = true;
      }
    }

    return deleted;
  }

  /**
   * ✅ GET OR SET PATTERN - Cache com fallback
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlSeconds: number = 300,
  ): Promise<T> {
    // Tenta buscar no cache primeiro
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Executa a função de busca
    const data = await fetchFunction();

    // Salva no cache para próximas consultas
    await this.set(key, data, ttlSeconds);

    return data;
  }

  /**
   * ✅ CACHE TTL PRESETS
   */
  static readonly TTL = {
    SHORT: 60, // 1 minuto
    MEDIUM: 300, // 5 minutos
    LONG: 1800, // 30 minutos
    VERY_LONG: 3600, // 1 hora
    DAILY: 86400, // 24 horas
  } as const;

  /**
   * ✅ CACHE KEY GENERATORS
   */
  static readonly KEYS = {
    USER: (id: string) => `user:${id}`,
    USER_BOOKINGS: (userId: string, page: number) =>
      `user:${userId}:bookings:${page}`,
    BOOKING: (id: string) => `booking:${id}`,
    BOOKING_LIST: (page: number, filters: string) =>
      `bookings:${page}:${filters}`,
    EQUIPMENT: (id: string) => `equipment:${id}`,
    EQUIPMENT_AVAILABILITY: (id: string, date: string) =>
      `equipment:${id}:availability:${date}`,
    REVENUE_STATS: (period: string) => `stats:revenue:${period}`,
    POPULAR_EQUIPMENT: () => "stats:popular-equipment",
    DASHBOARD_STATS: (userId: string) => `dashboard:${userId}:stats`,
  } as const;

  /**
   * ✅ INVALIDATE RELATED CACHES
   */
  async invalidateUserCaches(userId: string): Promise<void> {
    await Promise.all([
      this.delete(CacheService.KEYS.USER(userId)),
      this.deletePattern(`user:${userId}:*`),
      this.deletePattern(`dashboard:${userId}:*`),
    ]);
  }

  async invalidateBookingCaches(bookingId?: string): Promise<void> {
    const patterns = ["bookings:*", "stats:*", "dashboard:*"];

    if (bookingId) {
      patterns.push(CacheService.KEYS.BOOKING(bookingId));
    }

    await Promise.all(patterns.map((pattern) => this.deletePattern(pattern)));
  }

  async invalidateEquipmentCaches(equipmentId?: string): Promise<void> {
    const patterns = ["equipment:*", "stats:popular-equipment"];

    if (equipmentId) {
      patterns.push(CacheService.KEYS.EQUIPMENT(equipmentId));
      patterns.push(`equipment:${equipmentId}:*`);
    }

    await Promise.all(patterns.map((pattern) => this.deletePattern(pattern)));
  }

  /**
   * ✅ HEALTH CHECK
   */
  async healthCheck(): Promise<{
    status: string;
    connected: boolean;
    itemCount: number;
  }> {
    return {
      status: "healthy",
      connected: true,
      itemCount: this.memoryStore.size,
    };
  }

  /**
   * ✅ CLEAR ALL CACHE
   */
  async clear(): Promise<void> {
    this.memoryStore.clear();
  }

  /**
   * ✅ GET CACHE STATS
   */
  async getStats(): Promise<{ size: number; keys: string[] }> {
    return {
      size: this.memoryStore.size,
      keys: Array.from(this.memoryStore.keys()),
    };
  }

  /**
   * ✅ DESTRUCTOR
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.memoryStore.clear();
  }
}

// ✅ EXPORT SINGLETON INSTANCE
export const cacheService = CacheService.getInstance();

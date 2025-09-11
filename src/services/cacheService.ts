/**
 * ✅ ENTERPRISE CACHE SERVICE - REDIS + MEMORY FALLBACK
 * Sistema de cache híbrido para máxima performance e confiabilidade
 * Redis para produção + Memory cache como fallback
 */

import Redis from 'ioredis';
import logger from '../config/logger.js';

interface CacheItem {
  data: any;
  expires: number;
}

interface CacheConfig {
  ttl: number;
  prefix?: string;
}

export class CacheService {
  private static instance: CacheService;
  private redis: Redis | null = null;
  private memoryStore = new Map<string, CacheItem>();
  private isRedisConnected = false;
  private cleanupInterval: NodeJS.Timeout;
  private readonly keyPrefix = 'xproducoes:';

  private constructor() {
    this.initializeRedis();
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
   * ✅ INITIALIZE REDIS CONNECTION
   */
  private async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

      if (!redisUrl) {
        logger.warn('Redis URL não configurada. Usando cache em memória como fallback.');
        return;
      }

      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 3000,
      });

      this.redis.on('connect', () => {
        this.isRedisConnected = true;
        logger.info('✅ Cache Redis conectado com sucesso');
      });

      this.redis.on('error', (error: any) => {
        this.isRedisConnected = false;
        logger.error(`❌ Erro na conexão Redis: ${error.message || String(error)}`);
      });

      this.redis.on('close', () => {
        this.isRedisConnected = false;
        logger.warn('⚠️ Conexão Redis fechada');
      });

    } catch (error) {
      logger.error(`❌ Falha ao inicializar Redis: ${String(error)}`);
    }
  }

  /**
   * ✅ CLEANUP EXPIRED ITEMS (Memory Cache)
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
   * ✅ GENERATE CACHE KEY
   */
  private generateKey(namespace: string, key: string): string {
    return `${this.keyPrefix}${namespace}:${key}`;
  }

  /**
   * ✅ CHECK REDIS AVAILABILITY
   */
  private isRedisAvailable(): boolean {
    return this.redis !== null && this.isRedisConnected;
  }

  /**
   * ✅ GET CACHED DATA (Redis first, then Memory)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Tenta Redis primeiro
      if (this.isRedisAvailable()) {
        const cached = await this.redis!.get(key);
        if (cached) {
          logger.debug(`🔴 Redis HIT: ${key}`);
          return JSON.parse(cached);
        }
      }

      // Fallback para cache em memória
      const item = this.memoryStore.get(key);
      if (item && Date.now() <= item.expires) {
        logger.debug(`🟡 Memory HIT: ${key}`);
        return item.data;
      }

      // Cache miss
      this.memoryStore.delete(key);
      logger.debug(`⚫ Cache MISS: ${key}`);
      return null;

    } catch (error) {
      logger.error(`❌ Erro ao buscar cache ${key}: ${String(error)}`);
      return null;
    }
  }

  /**
   * ✅ SET CACHED DATA with TTL
   */
  async set(
    key: string,
    data: any,
    ttlSeconds: number = 300,
  ): Promise<boolean> {
    try {
      // Salva no Redis se disponível
      if (this.isRedisAvailable()) {
        const serialized = JSON.stringify(data);
        await this.redis!.setex(key, ttlSeconds, serialized);
        logger.debug(`🔴 Redis SET: ${key} (TTL: ${ttlSeconds}s)`);
      }

      // Sempre salva na memória como backup
      this.memoryStore.set(key, {
        data,
        expires: Date.now() + ttlSeconds * 1000,
      });

      return true;

    } catch (error) {
      logger.error(`❌ Erro ao salvar cache ${key}: ${String(error)}`);
      return false;
    }
  }

  /**
   * ✅ DELETE CACHE KEY
   */
  async delete(key: string): Promise<boolean> {
    try {
      let deleted = false;

      // Remove do Redis
      if (this.isRedisAvailable()) {
        await this.redis!.del(key);
        deleted = true;
      }

      // Remove da memória
      deleted = this.memoryStore.delete(key) || deleted;

      if (deleted) {
        logger.debug(`🗑️ Cache DELETE: ${key}`);
      }

      return deleted;

    } catch (error) {
      logger.error(`❌ Erro ao deletar cache ${key}: ${String(error)}`);
      return false;
    }
  }

  /**
   * ✅ DELETE CACHE PATTERN
   */
  async deletePattern(pattern: string): Promise<boolean> {
    try {
      let deleted = false;

      // Remove do Redis
      if (this.isRedisAvailable()) {
        const keys = await this.redis!.keys(pattern);
        if (keys.length > 0) {
          await this.redis!.del(...keys);
          deleted = true;
          logger.debug(`🗑️ Redis DELETE pattern: ${pattern} (${keys.length} keys)`);
        }
      }

      // Remove da memória
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      for (const key of this.memoryStore.keys()) {
        if (regex.test(key)) {
          this.memoryStore.delete(key);
          deleted = true;
        }
      }

      return deleted;

    } catch (error) {
      logger.error(`❌ Erro ao deletar pattern ${pattern}: ${String(error)}`);
      return false;
    }
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
    redisConnected: boolean;
    memoryConnected: boolean;
    redisItemCount?: number;
    memoryItemCount: number;
  }> {
    const result: {
      status: string;
      redisConnected: boolean;
      memoryConnected: boolean;
      redisItemCount?: number;
      memoryItemCount: number;
    } = {
      status: "healthy",
      redisConnected: this.isRedisConnected,
      memoryConnected: true,
      memoryItemCount: this.memoryStore.size,
    };

    if (this.isRedisAvailable()) {
      try {
        const redisKeys = await this.redis!.dbsize();
        result.redisItemCount = redisKeys;
      } catch (error) {
        result.status = "degraded";
        logger.error(`Erro ao verificar Redis: ${String(error)}`);
      }
    }

    return result;
  }

  /**
   * ✅ CLEAR ALL CACHE
   */
  async clear(): Promise<void> {
    try {
      // Limpa Redis
      if (this.isRedisAvailable()) {
        await this.redis!.flushdb();
        logger.info('🧹 Redis cache limpo');
      }

      // Limpa memória
      this.memoryStore.clear();
      logger.info('🧹 Memory cache limpo');

    } catch (error) {
      logger.error(`❌ Erro ao limpar cache: ${String(error)}`);
    }
  }

  /**
   * ✅ GET CACHE STATS
   */
  async getStats(): Promise<{
    redis: { size?: number; keys?: string[] };
    memory: { size: number; keys: string[] };
  }> {
    const stats = {
      redis: {} as any,
      memory: {
        size: this.memoryStore.size,
        keys: Array.from(this.memoryStore.keys()),
      },
    };

    if (this.isRedisAvailable()) {
      try {
        const [size, keys] = await Promise.all([
          this.redis!.dbsize(),
          this.redis!.keys('*')
        ]);
        stats.redis = { size, keys };
      } catch (error) {
        logger.error(`Erro ao obter stats Redis: ${String(error)}`);
      }
    }

    return stats;
  }

  /**
   * ✅ CLOSE REDIS CONNECTION
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.isRedisConnected = false;
      logger.info('🔌 Conexão Redis fechada');
    }
  }

  /**
   * ✅ DESTRUCTOR
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.memoryStore.clear();
    this.close();
  }
}

// ✅ EXPORT SINGLETON INSTANCE
export const cacheService = CacheService.getInstance();

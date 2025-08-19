"use strict";
/**
 * ✅ MEMORY CACHE SERVICE - ENTERPRISE PERFORMANCE
 * Sistema de cache em memória para otimização de queries
 * Para produção, substituir por Redis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
class CacheService {
    constructor() {
        this.memoryStore = new Map();
        // Limpeza automática a cada 5 minutos
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }
    static getInstance() {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }
    /**
     * ✅ CLEANUP EXPIRED ITEMS
     */
    cleanup() {
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
    async get(key) {
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
    async set(key, data, ttlSeconds = 300) {
        this.memoryStore.set(key, {
            data,
            expires: Date.now() + ttlSeconds * 1000,
        });
        return true;
    }
    /**
     * ✅ DELETE CACHE KEY
     */
    async delete(key) {
        return this.memoryStore.delete(key);
    }
    /**
     * ✅ DELETE CACHE PATTERN
     */
    async deletePattern(pattern) {
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
    async getOrSet(key, fetchFunction, ttlSeconds = 300) {
        // Tenta buscar no cache primeiro
        const cached = await this.get(key);
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
     * ✅ INVALIDATE RELATED CACHES
     */
    async invalidateUserCaches(userId) {
        await Promise.all([
            this.delete(CacheService.KEYS.USER(userId)),
            this.deletePattern(`user:${userId}:*`),
            this.deletePattern(`dashboard:${userId}:*`),
        ]);
    }
    async invalidateBookingCaches(bookingId) {
        const patterns = ["bookings:*", "stats:*", "dashboard:*"];
        if (bookingId) {
            patterns.push(CacheService.KEYS.BOOKING(bookingId));
        }
        await Promise.all(patterns.map((pattern) => this.deletePattern(pattern)));
    }
    async invalidateEquipmentCaches(equipmentId) {
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
    async healthCheck() {
        return {
            status: "healthy",
            connected: true,
            itemCount: this.memoryStore.size,
        };
    }
    /**
     * ✅ CLEAR ALL CACHE
     */
    async clear() {
        this.memoryStore.clear();
    }
    /**
     * ✅ GET CACHE STATS
     */
    async getStats() {
        return {
            size: this.memoryStore.size,
            keys: Array.from(this.memoryStore.keys()),
        };
    }
    /**
     * ✅ DESTRUCTOR
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.memoryStore.clear();
    }
}
exports.CacheService = CacheService;
/**
 * ✅ CACHE TTL PRESETS
 */
CacheService.TTL = {
    SHORT: 60, // 1 minuto
    MEDIUM: 300, // 5 minutos
    LONG: 1800, // 30 minutos
    VERY_LONG: 3600, // 1 hora
    DAILY: 86400, // 24 horas
};
/**
 * ✅ CACHE KEY GENERATORS
 */
CacheService.KEYS = {
    USER: (id) => `user:${id}`,
    USER_BOOKINGS: (userId, page) => `user:${userId}:bookings:${page}`,
    BOOKING: (id) => `booking:${id}`,
    BOOKING_LIST: (page, filters) => `bookings:${page}:${filters}`,
    EQUIPMENT: (id) => `equipment:${id}`,
    EQUIPMENT_AVAILABILITY: (id, date) => `equipment:${id}:availability:${date}`,
    REVENUE_STATS: (period) => `stats:revenue:${period}`,
    POPULAR_EQUIPMENT: () => "stats:popular-equipment",
    DASHBOARD_STATS: (userId) => `dashboard:${userId}:stats`,
};
// ✅ EXPORT SINGLETON INSTANCE
exports.cacheService = CacheService.getInstance();

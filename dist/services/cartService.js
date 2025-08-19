"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = void 0;
const cartRepository_1 = require("../repositories/cartRepository");
class CartService {
    constructor() {
        this.repo = new cartRepository_1.CartRepository();
    }
    async getOrCreateCart(userId) {
        return this.repo.findOrCreateCart(userId);
    }
    async getCart(userId) {
        return this.getOrCreateCart(userId);
    }
    async addItemToCart(userId, equipmentId) {
        const cart = await this.getOrCreateCart(userId);
        const updated = await this.repo.addItems(cart.id, [equipmentId]);
        return updated;
    }
    async removeItemFromCart(userId, equipmentId) {
        const cart = await this.getOrCreateCart(userId);
        const updated = await this.repo.removeItem(cart.id, equipmentId);
        return updated;
    }
    async addKitToCart(userId, kitId) {
        const cart = await this.getOrCreateCart(userId);
        const updated = await this.repo.updateKit(cart.id, kitId);
        return updated;
    }
    async clearCart(userId) {
        const cart = await this.getOrCreateCart(userId);
        await this.repo.clearEquipments(cart.id);
        await this.repo.clearKit(cart.id);
        return this.getOrCreateCart(userId);
    }
    async checkout(data) {
        // Mantém simulação por ora; fluxo de checkout real é gerido por Booking
        return {
            id: `booking_${Date.now()}`,
            status: "PENDING",
            ...data,
            createdAt: new Date(),
        };
    }
}
exports.CartService = CartService;

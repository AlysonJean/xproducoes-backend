// backend/src/services/cartService.ts
import { CartRepository } from "../repositories/cartRepository";

export class CartService {
  private repo = new CartRepository();

  private async getOrCreateCart(userId: string) {
    return this.repo.findOrCreateCart(userId);
  }

  async getCart(userId: string) {
    return this.getOrCreateCart(userId);
  }

  async addItemToCart(userId: string, equipmentId: string) {
    const cart = await this.getOrCreateCart(userId);
    const updated = await this.repo.addItems(cart.id, [equipmentId]);
    return updated;
  }

  async addServiceToCart(userId: string, serviceId: string) {
    const cart = await this.getOrCreateCart(userId);
    const updated = await this.repo.addService(cart.id, serviceId);
    return updated;
  }

  async removeItemFromCart(userId: string, equipmentId: string) {
    const cart = await this.getOrCreateCart(userId);
    const updated = await this.repo.removeItem(cart.id, equipmentId);
    return updated;
  }

  async removeServiceFromCart(userId: string, serviceId: string) {
    const cart = await this.getOrCreateCart(userId);
    const updated = await this.repo.removeService(cart.id, serviceId);
    return updated;
  }

  async addKitToCart(userId: string, kitId: string) {
    const cart = await this.getOrCreateCart(userId);
    const updated = await this.repo.updateKit(cart.id, kitId);
    return updated;
  }

  async removeKitFromCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    const updated = await this.repo.clearKit(cart.id);
    return updated;
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.repo.clearEquipments(cart.id);
    await this.repo.clearServices(cart.id);
    await this.repo.clearKit(cart.id);
    return this.getOrCreateCart(userId);
  }

  async checkout(data: Record<string, unknown>) {
    // Mantém simulação por ora; fluxo de checkout real é gerido por Booking
    return {
      id: `booking_${Date.now()}`,
      status: "PENDING",
      ...data,
      createdAt: new Date(),
    };
  }
}

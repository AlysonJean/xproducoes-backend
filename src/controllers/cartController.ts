import { Request, Response, NextFunction } from "express";
import { CartService } from "../services/cartService";

const cartService = new CartService();

export class CartController {
  getCart = async (req: Request, res: Response) => {
    const cart = await cartService.getCart(req.userId!);
    return res.json(cart);
  };

  addItem = async (req: Request, res: Response) => {
    const { equipmentId } = req.body;
    if (!equipmentId)
      return res
        .status(400)
        .json({ message: "O ID do equipamento é obrigatório." });
  const cart = await cartService.addItemToCart(req.userId!, equipmentId);
  return res.status(200).json(cart);
  };

  removeItem = async (req: Request, res: Response) => {
    const { equipmentId } = req.params;
    if (!equipmentId)
      return res
        .status(400)
        .json({ message: "O ID do equipamento é obrigatório." });
  const cart = await cartService.removeItemFromCart(req.userId!, equipmentId);
  return res.status(200).json(cart);
  };

  // Controller para o checkout
  checkout = async (req: Request, res: Response) => {
    try {
      const data = { ...req.body, userId: req.userId! };
      const booking = await cartService.checkout(data);
      return res.status(200).json(booking);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(422)
          .json({ message: "Dados inválidos", details: error.errors });
      }
      if (error.message === "Acesso negado") {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === "Não encontrado") {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  };

  addKit = async (req: Request, res: Response) => {
    const { kitId } = req.body;
    if (!kitId) {
      return res.status(400).json({ message: "O ID do kit é obrigatório." });
    }
  const cart = await cartService.addKitToCart(req.userId!, kitId);
  return res.status(200).json(cart);
  };

  // Novo método para calcular o preço do carrinho
  calculatePrice = async (req: Request, res: Response) => {
    try {
      const { eventDate, eventEndDate, requiresStairs, isCovered } = req.body;
      const cart = await cartService.getCart(req.userId!);

      // Cálculo simples do preço
      let finalPrice = 0;
      const hours = Math.ceil(
        (new Date(eventEndDate).getTime() - new Date(eventDate).getTime()) /
          (1000 * 60 * 60),
      );

      // Calcular preço dos equipamentos
      if (cart && cart.equipments) {
        for (const equipment of cart.equipments) {
          finalPrice += Number((equipment as any).pricePerHour || 0) * hours;
        }
      }

      // Calcular preço do kit
      if (cart && cart.kit) {
        finalPrice += Number(cart.kit.price || 0);
      }

      // Adicionar taxas extras
      if (requiresStairs) {
        finalPrice *= 1.1; // 10% extra
      }

      if (!isCovered) {
        finalPrice *= 1.05; // 5% extra
      }
      return res.json({ totalPrice: finalPrice });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  };

  clearEquipments = async (req: Request, res: Response) => {
  const cart = await cartService.getCart(req.userId!);
  if (!cart) return res.status(404).json({ message: "Carrinho não encontrado" });
  const updated = await (cartService as any).repo.clearEquipments(cart.id);
  return res.status(200).json(updated);
  };

  clearKit = async (req: Request, res: Response) => {
    const cart = await cartService.getCart(req.userId!);
    if (!cart) return res.status(404).json({ message: "Carrinho não encontrado" });
    // Reutiliza o service de clear apenas do kit
    // Implementação direta via repo para evitar limpar equipamentos
    const updated = await (cartService as any).repo.clearKit(cart.id);
    return res.status(200).json(updated);
  };

  clearCart = async (req: Request, res: Response) => {
    const cleared = await cartService.clearCart(req.userId!);
    return res.status(200).json(cleared);
  };
}

import { Request, Response } from "express";
import { CartService } from "../services/cartService";
import { getErrorMessage, isAppError } from "../types/common";

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

  addService = async (req: Request, res: Response) => {
    const { serviceId } = req.body;
    if (!serviceId)
      return res.status(400).json({ message: "O ID do serviço é obrigatório." });
    const cart = await cartService.addServiceToCart(req.userId!, serviceId);
    return res.status(200).json(cart);
  };

  removeItem = async (req: Request, res: Response) => {
    const { equipmentId } = req.params as { equipmentId: string };
    if (!equipmentId)
      return res
        .status(400)
        .json({ message: "O ID do equipamento é obrigatório." });
    const cart = await cartService.removeItemFromCart(req.userId!, equipmentId);
    return res.status(200).json(cart);
  };

  removeService = async (req: Request, res: Response) => {
    const { serviceId } = req.params as { serviceId: string };
    if (!serviceId)
      return res.status(400).json({ message: "O ID do serviço é obrigatório." });
    const cart = await cartService.removeServiceFromCart(req.userId!, serviceId);
    return res.status(200).json(cart);
  };

  checkout = async (req: Request, res: Response) => {
    try {
      const data = { ...req.body, userId: req.userId! };
      const booking = await cartService.checkout(data);
      return res.status(200).json(booking);
    } catch (error: unknown) {
      if (isAppError(error) && error.name === "ZodError") {
        return res
          .status(422)
          .json({ message: "Dados inválidos", details: (error as Error & { errors?: unknown }).errors });
      }
      const errMsg = getErrorMessage(error);
      if (errMsg === "Acesso negado") {
        return res.status(403).json({ message: errMsg });
      }
      if (errMsg === "Não encontrado") {
        return res.status(404).json({ message: errMsg });
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

  calculatePrice = async (req: Request, res: Response) => {
    try {
      const { eventDate, eventEndDate, requiresStairs, isCovered } = req.body;
      const cart = await cartService.getCart(req.userId!);

      let finalPrice = 0;
      const hours = Math.ceil(
        (new Date(eventEndDate).getTime() - new Date(eventDate).getTime()) /
          (1000 * 60 * 60),
      );

      if (cart && cart.equipments) {
        for (const equipment of cart.equipments) {
          finalPrice += Number((equipment as any).pricePerHour || 0) * hours;
        }
      }

      if (cart && (cart as any).services) {
        for (const service of (cart as any).services) {
          finalPrice += Number(service.price || 0);
        }
      }

      if (cart && cart.kit) {
        finalPrice += Number(cart.kit.price || 0);
      }

      if (requiresStairs) {
        finalPrice *= 1.1;
      }

      if (!isCovered) {
        finalPrice *= 1.05;
      }
      return res.json({ totalPrice: finalPrice });
    } catch (error: unknown) {
      return res.status(400).json({ message: getErrorMessage(error) });
    }
  };

  clearCart = async (req: Request, res: Response) => {
    const cleared = await cartService.clearCart(req.userId!);
    return res.status(200).json(cleared);
  };
}

import { Request, Response, NextFunction } from "express";
import { CartService } from "../services/cartService";

const cartService = new CartService();

type NumericLike = number | string | { toString(): string } | null | undefined;
type PricedEquipment = { pricePerHour?: NumericLike };
type PricedService = { price?: NumericLike };
type CartWithServices = { services?: PricedService[] };

const toNumeric = (value: NumericLike): number => Number(value ?? 0);

export class CartController {
  getCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cart = await cartService.getCart(req.userId!);
      return res.json({ success: true, data: cart });
    } catch (error) {
      return next(error);
    }
  };

  addItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { equipmentId } = req.body;
      if (!equipmentId)
        return res.status(400).json({ success: false, message: "O ID do equipamento é obrigatório." });
      const cart = await cartService.addItemToCart(req.userId!, equipmentId);
      return res.status(200).json({ success: true, data: cart });
    } catch (error) {
      return next(error);
    }
  };

  addService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serviceId } = req.body;
      if (!serviceId)
        return res.status(400).json({ success: false, message: "O ID do serviço é obrigatório." });
      const cart = await cartService.addServiceToCart(req.userId!, serviceId);
      return res.status(200).json({ success: true, data: cart });
    } catch (error) {
      return next(error);
    }
  };

  removeItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { equipmentId } = req.params as { equipmentId: string };
      if (!equipmentId)
        return res.status(400).json({ success: false, message: "O ID do equipamento é obrigatório." });
      const cart = await cartService.removeItemFromCart(req.userId!, equipmentId);
      return res.status(200).json({ success: true, data: cart });
    } catch (error) {
      return next(error);
    }
  };

  removeService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serviceId } = req.params as { serviceId: string };
      if (!serviceId)
        return res.status(400).json({ success: false, message: "O ID do serviço é obrigatório." });
      const cart = await cartService.removeServiceFromCart(req.userId!, serviceId);
      return res.status(200).json({ success: true, data: cart });
    } catch (error) {
      return next(error);
    }
  };

  removeKit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cart = await cartService.removeKitFromCart(req.userId!);
      return res.status(200).json({ success: true, data: cart });
    } catch (error) {
      return next(error);
    }
  };

  checkout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = { ...req.body, userId: req.userId! };
      const booking = await cartService.checkout(data);
      return res.status(200).json({ success: true, data: booking });
    } catch (error: unknown) {
      return next(error);
    }
  };

  addKit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { kitId } = req.body;
      if (!kitId) {
        return res.status(400).json({ success: false, message: "O ID do kit é obrigatório." });
      }
      const cart = await cartService.addKitToCart(req.userId!, kitId);
      return res.status(200).json({ success: true, data: cart });
    } catch (error) {
      return next(error);
    }
  };

  calculatePrice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventDate, eventEndDate, requiresStairs, isCovered } = req.body;
      const cart = await cartService.getCart(req.userId!);

      let finalPrice = 0;
      const hours = Math.ceil(
        (new Date(eventEndDate).getTime() - new Date(eventDate).getTime()) /
          (1000 * 60 * 60),
      );

      if (cart && cart.equipments) {
        for (const equipment of cart.equipments as PricedEquipment[]) {
          finalPrice += toNumeric(equipment.pricePerHour) * hours;
        }
      }

      if (cart && (cart as CartWithServices).services) {
        for (const service of (cart as CartWithServices).services || []) {
          finalPrice += toNumeric(service.price);
        }
      }

      if (cart && cart.kit) {
        finalPrice += toNumeric(cart.kit.price);
      }

      if (requiresStairs) finalPrice *= 1.1;
      if (!isCovered) finalPrice *= 1.05;

      return res.json({ success: true, data: { totalPrice: finalPrice } });
    } catch (error: unknown) {
      return next(error);
    }
  };

  clearCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cleared = await cartService.clearCart(req.userId!);
      return res.status(200).json({ success: true, data: cleared });
    } catch (error) {
      return next(error);
    }
  };
}

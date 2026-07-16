import { Request, Response, NextFunction } from "express";
import * as couponService from "../services/couponService";
import { BadRequestError } from "../utils/errors";

export class CouponController {
  validate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, subtotal } = req.body;
      if (!code || typeof subtotal !== "number") {
        throw new BadRequestError("Informe o código do cupom e o subtotal do pedido.");
      }

      const result = await couponService.validateCoupon(code, { subtotal, userId: req.userId });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const coupons = await couponService.listCoupons();
      res.json({ success: true, data: coupons });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const coupon = await couponService.getCouponById(req.params.id as string);
      res.json({ success: true, data: coupon });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const coupon = await couponService.createCoupon(req.body);
      res.status(201).json({ success: true, data: coupon });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const coupon = await couponService.updateCoupon(req.params.id as string, req.body);
      res.json({ success: true, data: coupon });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await couponService.deleteCoupon(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

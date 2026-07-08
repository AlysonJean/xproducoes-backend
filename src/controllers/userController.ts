import { Request, Response, NextFunction } from "express";

import * as userService from "../services/userService";
import * as userRepository from "../repositories/userRepository";
import {
  userRegisterSchema,
  userLoginSchema,

} from "../validators/userSchema";
import { AuthenticatedRequest } from "../middlewares/unifiedAuth";

export async function register(req: Request, res: Response, next: NextFunction) {
  const parse = userRegisterSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, errors: parse.error.flatten() });
  }
  try {
    const user = await userService.register(parse.data);
    return res.status(201).json({ success: true, data: user });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  const parse = userLoginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, errors: parse.error.flatten() });
  }
  try {
    const result = await userService.login(parse.data);
    return res.json({ success: true, data: result });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await userService.getProfile(authReq.userId!);
    return res.json({ success: true, data: user });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await userService.updateProfile(
      authReq.userId!,
      req.body,
      req.file,
    );
    return res.json({ success: true, data: user });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    // Rota restrita a ADMIN (ver requireAdmin em userRoutes.ts). Paginada para
    // não devolver a base inteira de usuários numa única resposta.
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));

    const { data, pagination } = await userRepository.findMany({}, { page, limit });
    return res.json({ success: true, data, pagination });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.forgotPassword(req.body.email);
    return res.json({ success: true, message: "E-mail de recuperação enviado." });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.resetPassword(req.body.token, req.body.password);
    return res.json({ success: true, message: "Senha redefinida com sucesso." });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    const stats = await userService.getUserStats(authReq.userId!);
    return res.json({ success: true, data: stats });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function promoteVip(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    await userService.promoteToVip(authReq.userId!);
    return res.json({ success: true, message: 'Usuário promovido a VIP' });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Regra de promoção para VIP não satisfeita')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error instanceof Error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    return next(error);
  }
}

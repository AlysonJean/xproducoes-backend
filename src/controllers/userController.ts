import { Request, Response } from "express";

import * as userService from "../services/userService";
import {
  userRegisterSchema,
  userLoginSchema,

} from "../validators/userSchema";
import { getErrorMessage } from "../types/common";
import { AuthenticatedRequest } from "../middlewares/unifiedAuth";

export async function register(req: Request, res: Response) {
  const parse = userRegisterSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ errors: parse.error.flatten() });
  }
  try {
    const user = await userService.register(parse.data);
    return res.status(201).json(user);
  } catch (error: unknown) {
    return res.status(400).json({ error: getErrorMessage(error) });
  }
}

export async function login(req: Request, res: Response) {
  const parse = userLoginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ errors: parse.error.flatten() });
  }
  try {
    const result = await userService.login(parse.data);
    return res.json(result);
  } catch (error: unknown) {
    return res.status(401).json({ error: getErrorMessage(error) });
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await userService.getProfile(authReq.userId!);
    return res.json(user);
  } catch (error: unknown) {
    return res.status(404).json({ error: getErrorMessage(error) });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    // req.body já validado/sanitizado pelo Zod middleware
    
    const user = await userService.updateProfile(
      authReq.userId!,
      req.body,
      req.file,
    );
    return res.json(user);
    

  } catch (error: unknown) {
    return res.status(400).json({ error: getErrorMessage(error) });
  }
}

export async function listUsers(req: Request, res: Response) {
  try {
    const users = await userService.listUsers();
    return res.json(users);
  } catch (error: unknown) {
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    await userService.forgotPassword(req.body.email);
    return res.json({ message: "E-mail de recuperação enviado." });
  } catch (error: unknown) {
    return res.status(400).json({ error: getErrorMessage(error) });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    await userService.resetPassword(req.body.token, req.body.password);
    return res.json({ message: "Senha redefinida com sucesso." });
  } catch (error: unknown) {
    return res.status(400).json({ error: getErrorMessage(error) });
  }
}

export async function getStats(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const stats = await userService.getUserStats(authReq.userId!);
    return res.json({
      success: true,
      data: stats
    });
  } catch (error: unknown) {
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function promoteVip(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    await userService.promoteToVip(authReq.userId!);
    return res.json({ success: true, message: 'Usuário promovido a VIP' });
  } catch (error: unknown) {
    const errMsg = getErrorMessage(error);
    if (errMsg.includes('Regra de promoção')) {
      return res.status(400).json({ success: false, error: errMsg });
    }
    return res.status(500).json({ success: false, error: errMsg });
  }
}

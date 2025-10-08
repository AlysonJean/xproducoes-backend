import { prisma } from "../config/prisma";
import * as userService from "./userService";
import jwt from "jsonwebtoken";
import { config as envConfig } from "../config/environment";

export class AuthService {
  async register(data: any) {
    return userService.register({
      name: data.name,
      email: data.email,
      password: data.password
    });
  }

  async login(data: any) {
    return userService.login({
      email: data.email,
      password: data.password
    });
  }

  async requestPasswordReset(email: string, ipAddress?: string, userAgent?: string) {
    return userService.requestPasswordReset(email, ipAddress, userAgent);
  }

  async resetPassword(token: string, newPassword: string, ipAddress?: string) {
    return userService.resetPassword(token, newPassword, ipAddress);
  }

  async getProfile(userId: string) {
    return userService.getProfile(userId);
  }

  async updateProfile(userId: string, data: any, file?: Express.Multer.File) {
    return userService.updateProfile(userId, data, file);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    return userService.changePassword(userId, currentPassword, newPassword);
  }

  // Métodos adicionais para o authController
  async inviteCollaborator(data: any) {
    // Implementação simples - expandir conforme necessário
    return {
      id: `invite_${Date.now()}`,
      ...data,
      status: 'PENDING',
      createdAt: new Date()
    };
  }

  async completeRegistration(data: any) {
    // Implementação simples para completar registro
    return this.register(data);
  }

  async findUserByEmail(email: string) {
    // Busca direta e eficiente via prisma
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null;
  }

  async loginById(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Usuário não encontrado');
    const token = jwt.sign({ userId: user.id, role: user.role }, envConfig.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id, role: user.role }, envConfig.jwtSecret, { expiresIn: '7d' });
    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
      refreshToken,
    };
  }
}

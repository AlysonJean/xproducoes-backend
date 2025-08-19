import { prisma } from "../config/prisma";
import * as userService from "./userService";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

  async requestPasswordReset(email: string) {
    return userService.requestPasswordReset(email);
  }

  async resetPassword(token: string, newPassword: string) {
    return userService.resetPassword(token, newPassword);
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
    // Implementação simples usando userService
    const users = await userService.getAllUsers({ page: 1, limit: 1000 });
    return users.users.find(user => user.email === email);
  }

  async loginById(userId: string) {
    const user = await userService.getUserById(Number(userId));
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    // Simula login por ID
    return {
      user,
      token: `mock_token_${userId}_${Date.now()}`
    };
  }
}

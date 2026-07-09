import logger from '../config/logger.js';
import { prisma } from "../config/prisma.js";
import * as userService from "./userService.js";
import jwt from "jsonwebtoken";
import { config as envConfig } from "../config/environment.js";
import { NotFoundError } from "../utils/errors.js";

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
  phone?: string;
  companyName?: string;
  bookingId?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface InviteData {
  email: string;
  name?: string;
  role?: string;
  collaboratorRole?: string;
  specialties?: string[];
  hourlyRate?: number;
  [key: string]: unknown; // Permitir campos extras
}

export class AuthService {
  async register(data: RegisterData) {
    const user = await userService.register({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role || 'CLIENT'
    });

    if (user && user.role === 'CLIENT') {
      try {
        const { BookingService } = await import('./bookingService.js');
        const bookingService = new BookingService();
        await bookingService.linkBookingsToUser(user.id, user.email, data.bookingId);
      } catch (e) {
        logger.error({ err: e }, 'Erro ao vincular orçamentos no registro');
      }
    }

    return user;
  }

  async login(data: LoginData) {
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

  async updateProfile(userId: string, data: userService.UpdateProfileInput, file?: Express.Multer.File) {
    return userService.updateProfile(userId, data, file);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    return userService.changePassword(userId, currentPassword, newPassword);
  }

  // Métodos adicionais para o authController
  async inviteCollaborator(data: InviteData) {
    // Implementação simples - expandir conforme necessário
    return {
      id: `invite_${Date.now()}`,
      ...data,
      status: 'PENDING',
      createdAt: new Date()
    };
  }

  async completeRegistration(data: RegisterData) {
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
    if (!user) throw new NotFoundError('Usuário não encontrado');
    const token = jwt.sign({ userId: user.id, role: user.role, type: 'access' }, envConfig.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id, role: user.role, type: 'refresh' }, envConfig.jwtSecret, { expiresIn: '7d' });
    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
      refreshToken,
    };
  }
}

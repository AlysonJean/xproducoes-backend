"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const prisma_1 = require("../config/prisma");
const userService = __importStar(require("./userService"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class AuthService {
    async register(data) {
        return userService.register({
            name: data.name,
            email: data.email,
            password: data.password
        });
    }
    async login(data) {
        return userService.login({
            email: data.email,
            password: data.password
        });
    }
    async requestPasswordReset(email) {
        return userService.requestPasswordReset(email);
    }
    async resetPassword(token, newPassword) {
        return userService.resetPassword(token, newPassword);
    }
    async getProfile(userId) {
        return userService.getProfile(userId);
    }
    async updateProfile(userId, data, file) {
        return userService.updateProfile(userId, data, file);
    }
    async changePassword(userId, currentPassword, newPassword) {
        return userService.changePassword(userId, currentPassword, newPassword);
    }
    // Métodos adicionais para o authController
    async inviteCollaborator(data) {
        // Implementação simples - expandir conforme necessário
        return {
            id: `invite_${Date.now()}`,
            ...data,
            status: 'PENDING',
            createdAt: new Date()
        };
    }
    async completeRegistration(data) {
        // Implementação simples para completar registro
        return this.register(data);
    }
    async findUserByEmail(email) {
        // Busca direta e eficiente via prisma
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        return user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null;
    }
    async loginById(userId) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new Error('Usuário não encontrado');
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'dev', { expiresIn: '7d' });
        return {
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            token,
        };
    }
}
exports.AuthService = AuthService;

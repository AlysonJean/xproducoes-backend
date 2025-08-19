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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const authService_1 = require("../services/authService");
class AuthController {
    constructor() {
        this.register = async (req, res, next) => {
            try {
                const { name, email, password, role, phone, companyName } = req.body;
                const result = await this.authService.register({
                    name,
                    email,
                    password,
                    role,
                    phone,
                    companyName,
                });
                res.status(201).json(result);
            }
            catch (error) {
                next(error);
            }
        };
        this.login = async (req, res, next) => {
            try {
                const { email, password } = req.body;
                if (!email || !password) {
                    res.status(400).json({ message: "Email e senha são obrigatórios" });
                    return;
                }
                try {
                    const result = await this.authService.login({ email, password });
                    res.status(200).json(result);
                }
                catch (error) {
                    if (error instanceof Error &&
                        error.message === "Credenciais inválidas.") {
                        res.status(401).json({ message: error.message });
                        return;
                    }
                    throw error;
                }
            }
            catch (error) {
                console.error("Erro no login:", error);
                next(error);
            }
        };
        this.requestPasswordReset = async (req, res, next) => {
            try {
                const { email } = req.body;
                const result = await this.authService.requestPasswordReset(email);
                res.status(200).json(result);
            }
            catch (error) {
                next(error);
            }
        };
        this.resetPassword = async (req, res, next) => {
            try {
                const { token, password } = req.body;
                const result = await this.authService.resetPassword(token, password);
                res.status(200).json(result);
            }
            catch (error) {
                next(error);
            }
        };
        // Endpoint público para verificar email via token
        this.verifyEmail = async (req, res, next) => {
            try {
                const token = req.query.token || req.body.token;
                if (!token) {
                    res.status(400).json({ message: 'Token é obrigatório' });
                    return;
                }
                try {
                    await (await Promise.resolve().then(() => __importStar(require('../services/userService')))).verifyEmailByToken(token);
                    res.status(200).json({ success: true });
                }
                catch (e) {
                    res.status(400).json({ message: e?.message || 'Token inválido' });
                }
            }
            catch (error) {
                next(error);
            }
        };
        // Endpoint público para usuário solicitar reenvio de verificação
        this.resendVerificationPublic = async (req, res, next) => {
            try {
                const { email } = req.body;
                if (!email) {
                    res.status(400).json({ message: 'Email é obrigatório' });
                    return;
                }
                const user = await this.authService.findUserByEmail(email);
                if (!user) {
                    res.status(404).json({ message: 'Usuário não encontrado' });
                    return;
                }
                await (await Promise.resolve().then(() => __importStar(require('../services/userService')))).resendEmailVerification(user.id);
                res.json({ success: true });
            }
            catch (error) {
                next(error);
            }
        };
        this.getProfile = async (req, res, next) => {
            try {
                if (!req.userId) {
                    res
                        .status(401)
                        .json({ message: "ID do utilizador não encontrado no token." });
                    return;
                }
                const user = await this.authService.getProfile(req.userId);
                res.json(user);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateProfile = async (req, res, next) => {
            try {
                if (!req.userId) {
                    res
                        .status(401)
                        .json({ message: "ID do utilizador não encontrado no token." });
                    return;
                }
                const { name, avatarUrl } = req.body;
                const user = await this.authService.updateProfile(req.userId, {
                    name,
                    avatarUrl,
                });
                res.json(user);
            }
            catch (error) {
                next(error);
            }
        };
        // Método para administradores convidarem colaboradores
        this.inviteCollaborator = async (req, res, next) => {
            try {
                const { name, email, collaboratorRole, hourlyRate, specialties } = req.body;
                const result = await this.authService.inviteCollaborator({
                    name,
                    email,
                    collaboratorRole,
                    hourlyRate,
                    specialties,
                });
                res.status(201).json(result);
            }
            catch (error) {
                next(error);
            }
        };
        // Método para colaboradores completarem o registo
        this.completeRegistration = async (req, res, next) => {
            try {
                const { token, password } = req.body;
                if (!token || !password) {
                    res.status(400).json({ message: 'Token e password são obrigatórios' });
                    return;
                }
                try {
                    await this.authService.resetPassword(token, password);
                    res.status(200).json({ success: true });
                }
                catch (e) {
                    res.status(400).json({ message: e?.message || 'Falha ao completar registro' });
                }
            }
            catch (error) {
                next(error);
            }
        };
        this.socialLogin = async (req, res, next) => {
            try {
                const { userData } = req.body;
                if (!userData?.email) {
                    res.status(400).json({ message: "Dados de utilizador inválidos" });
                    return;
                }
                // Por enquanto, implementação simplificada
                // Em produção, seria necessário validar o token com a API do provedor
                try {
                    // Buscar usuário pelo email
                    const user = await this.authService.findUserByEmail(userData.email);
                    if (user) {
                        // Se existe, fazer login
                        const result = await this.authService.loginById(user.id);
                        res.status(200).json(result);
                    }
                    else {
                        // Se não existe, criar novo utilizador
                        const randomPassword = Math.random().toString(36).slice(-8);
                        const result = await this.authService.register({
                            name: userData.name || userData.email.split("@")[0],
                            email: userData.email,
                            password: randomPassword,
                            role: "CLIENT",
                        });
                        res.status(201).json(result);
                    }
                }
                catch (error) {
                    console.error("Erro no login social:", error);
                    if (error instanceof Error) {
                        res.status(400).json({ message: error.message });
                        return;
                    }
                    throw error;
                }
            }
            catch (error) {
                console.error("Erro no processamento de login social:", error);
                next(error);
            }
        };
        this.getCurrentUser = async (req, res, next) => {
            try {
                if (!req.userId) {
                    res.status(401).json({ message: "Não autorizado" });
                    return;
                }
                const user = await this.authService.getProfile(req.userId);
                res.json(user);
            }
            catch (error) {
                next(error);
            }
        };
        this.logout = async (_req, res, next) => {
            try {
                // Para JWT, o logout é do lado do cliente (remover token)
                // Aqui podemos implementar uma blacklist de tokens se necessário
                res.status(200).json({ message: "Logout realizado com sucesso." });
            }
            catch (error) {
                next(error);
            }
        };
        this.authService = new authService_1.AuthService();
    }
}
exports.AuthController = AuthController;

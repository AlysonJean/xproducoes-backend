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
exports.AdminController = void 0;
const zod_1 = require("zod");
// Esquema de validação para atualização de perfil de cliente (reutilizado)
const clientProfileSchema = zod_1.z.object({
    companyName: zod_1.z.string().optional(),
    industry: zod_1.z.string().optional(),
    companySize: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.any().optional(),
    jobTitle: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    budget: zod_1.z.any().optional(),
    preferredCategories: zod_1.z.array(zod_1.z.string()).optional(),
    eventTypes: zod_1.z.array(zod_1.z.string()).optional(),
    communicationPrefs: zod_1.z.any().optional(),
});
const userService = __importStar(require("../services/userService"));
const clientService = __importStar(require("../services/clientService"));
const prisma_1 = require("../config/prisma");
const bookingService_1 = require("../services/bookingService");
const equipmentService_1 = require("../services/equipmentService");
const logger_1 = __importDefault(require("../config/logger"));
const uploadService_1 = require("../services/uploadService");
const emailService_1 = __importDefault(require("../services/emailService"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const bookingService = new bookingService_1.BookingService();
const equipmentService = new equipmentService_1.EquipmentService();
class AdminController {
    constructor() {
        // Criar novo cliente (validação, checagem de duplicata, upload avatar, transação)
        this.createClient = async (req, res, next) => {
            try {
                // Schema mínimo de criação (Zod)
                const createSchema = zod_1.z.object({
                    name: zod_1.z.string().min(1).max(120).optional(),
                    email: zod_1.z.string().email().optional(),
                    phone: zod_1.z.string().optional(),
                    bio: zod_1.z.string().optional(),
                    location: zod_1.z.string().optional(),
                    companyName: zod_1.z.string().optional(),
                    industry: zod_1.z.string().optional(),
                    companySize: zod_1.z.string().optional(),
                    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
                    password: zod_1.z.string().optional(),
                    userId: zod_1.z.string().optional(),
                    metadata: zod_1.z.any().optional(),
                });
                const payload = await createSchema.parseAsync(req.body || {});
                // Se email informado, checar duplicata
                if (payload.email) {
                    const existingUser = await prisma_1.prisma.user.findUnique({ where: { email: payload.email } });
                    if (existingUser) {
                        return res.status(409).json({ code: 'EMAIL_EXISTS', message: 'Email já cadastrado', existingUserId: existingUser.id });
                    }
                }
                // Preparar dados
                const userData = {};
                if (payload.email)
                    userData.email = payload.email.toLowerCase().trim();
                if (payload.name)
                    userData.name = payload.name.trim();
                userData.role = 'CLIENT';
                if (typeof payload.status !== 'undefined')
                    userData.isActive = payload.status === 'ACTIVE';
                // Avatar via upload middleware (req.file) -> usa UploadService
                let avatarUrl = undefined;
                const uploadedFile = req.file;
                if (uploadedFile) {
                    const us = new uploadService_1.UploadService();
                    avatarUrl = await us.uploadAvatar(userData.email ?? 'temp', uploadedFile);
                    userData.avatarUrl = avatarUrl;
                }
                // Criação atômica: se enviar user data, cria user e client em transação
                let tempPassword;
                let inviteToken;
                const result = await prisma_1.prisma.$transaction(async (tx) => {
                    let createdUser = null;
                    if (payload.email) {
                        // Se não enviou senha, gera uma temporária e cria token de convite
                        if (!payload.password) {
                            tempPassword = crypto_1.default.randomBytes(9).toString('hex'); // ~18 chars
                            inviteToken = crypto_1.default.randomBytes(20).toString('hex');
                        }
                        createdUser = await tx.user.create({
                            data: {
                                ...userData,
                                passwordHash: (payload.password ? await bcrypt_1.default.hash(payload.password, 10) : await bcrypt_1.default.hash(tempPassword || '', 10)),
                                passwordResetToken: inviteToken,
                                passwordResetTokenExpiry: inviteToken ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined,
                            },
                        });
                    }
                    const clientData = {
                        phone: payload.phone,
                        companyName: payload.companyName,
                        industry: payload.industry,
                        companySize: payload.companySize,
                        userId: createdUser?.id || payload.userId,
                    };
                    const createdClient = await tx.client.create({ data: clientData });
                    return { createdUser, createdClient };
                });
                // Audit log mínimo (se houver sistema de audit, gravar; caso contrário, logar)
                try {
                    const actorId = req.user?.id || 'system';
                    logger_1.default.info(`admin.createClient actor=${actorId} clientId=${result.createdClient.id}`);
                }
                catch (e) {
                    logger_1.default.warn('Falha ao gravar audit in-memory: ' + String(e));
                }
                const client = await prisma_1.prisma.client.findUnique({ where: { id: result.createdClient.id }, include: { user: true } });
                // Se geramos senha temporária, montar link de convite para o frontend
                let inviteUrl = undefined;
                if (inviteToken) {
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
                    inviteUrl = `${frontendUrl}/complete-registration?token=${inviteToken}`;
                }
                // Envia e-mail de convite se configurado
                try {
                    if (inviteUrl && client?.user?.email) {
                        await emailService_1.default.sendInviteEmail(client.user.email, inviteUrl, tempPassword);
                    }
                }
                catch (e) {
                    logger_1.default.warn('Falha ao enviar email de convite: ' + String(e));
                }
                return res.status(201).json({ client, tempPassword, inviteUrl });
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    return res.status(400).json({ message: 'Validação falhou', issues: error.issues });
                }
                return next(error);
            }
        };
        // Listar todos os clientes com perfil
        this.listClients = async (req, res, next) => {
            try {
                const { industry, companySize, location } = req.query;
                // Paginação: page e pageSize
                const page = parseInt(req.query.page || '1', 10);
                const pageSize = parseInt(req.query.pageSize || '20', 10);
                // Busca total de clientes para meta
                const total = await clientService.countClientsWithProfiles({ industry, companySize, location });
                // Busca clientes paginados
                const clients = await clientService.listClientsWithProfiles({ industry, companySize, location, page, pageSize });
                return res.json({
                    data: clients,
                    meta: {
                        total,
                        page,
                        pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                });
            }
            catch (error) {
                return next(error);
            }
        };
        // Obter um cliente específico por ID (com perfil)
        this.getClientById = async (req, res, next) => {
            try {
                const id = req.params["id"];
                if (!id) {
                    return res.status(400).json({ error: "ID é obrigatório" });
                }
                const client = await clientService.getClientById(id);
                if (!client) {
                    return res.status(404).json({ error: "Cliente não encontrado" });
                }
                // Mapeia o retorno para o formato esperado pelo frontend
                const user = client.user;
                const mapped = {
                    id: client.id,
                    userId: client.userId,
                    name: user?.name ?? client.companyName ?? '',
                    email: user?.email ?? '',
                    role: user?.role ?? 'CLIENT',
                    bio: user?.bio ?? '',
                    location: user?.location ?? '',
                    phone: client.phone ?? '',
                    avatar: user?.avatarUrl ?? '',
                    isActive: user?.isActive ?? true,
                    createdAt: client.createdAt,
                    updatedAt: client.updatedAt,
                    status: user?.isActive === false ? 'INACTIVE' : 'ACTIVE',
                    totalBookings: client.totalBookings ?? 0,
                    totalSpent: client.totalSpent ?? 0,
                    companyName: client.companyName,
                    industry: client.industry,
                    companySize: client.companySize,
                    address: client.address,
                    jobTitle: client.jobTitle,
                    department: client.department,
                    budget: client.budget,
                    preferredCategories: client.preferredCategories,
                    eventTypes: client.eventTypes,
                    communicationPrefs: client.communicationPrefs,
                    // Adicione outros campos do client se necessário
                };
                return res.json(mapped);
            }
            catch (error) {
                return next(error);
            }
        };
        // Atualizar dados do usuário e do perfil de cliente
        this.updateClient = async (req, res, next) => {
            try {
                const id = req.params["id"];
                if (!id) {
                    return res.status(400).json({ error: "ID é obrigatório" });
                }
                // Atualiza dados do perfil de cliente
                // Separa campos de client e user
                const clientFields = [
                    'phone', 'companyName', 'industry', 'companySize', 'address', 'jobTitle', 'department', 'budget',
                    'preferredCategories', 'eventTypes', 'communicationPrefs', 'totalBookings', 'totalSpent', 'averageRating', 'completedBookings'
                ];
                const userFields = ['name', 'email', 'role', 'bio', 'location', 'avatarUrl', 'isActive'];
                const clientData = {};
                const userData = {};
                for (const key in req.body) {
                    if (clientFields.includes(key))
                        clientData[key] = req.body[key];
                    if (userFields.includes(key))
                        userData[key] = req.body[key];
                }
                let updatedClient = null;
                if (Object.keys(clientData).length > 0) {
                    updatedClient = await prisma_1.prisma.client.update({
                        where: { id },
                        data: clientData,
                    });
                }
                // Se houver dados de usuário, atualiza também
                if (Object.keys(userData).length > 0 && updatedClient && updatedClient.userId) {
                    await userService.updateProfile(updatedClient.userId, userData, req.file);
                }
                // Retorna o cliente atualizado
                const client = await clientService.getClientById(id);
                if (!client) {
                    return res.status(404).json({ error: "Cliente não encontrado" });
                }
                const user = client.user;
                const mapped = {
                    id: client.id,
                    userId: client.userId,
                    name: user?.name ?? client.companyName ?? '',
                    email: user?.email ?? '',
                    role: user?.role ?? 'CLIENT',
                    bio: user?.bio ?? '',
                    location: user?.location ?? '',
                    phone: client.phone ?? '',
                    avatar: user?.avatarUrl ?? '',
                    isActive: user?.isActive ?? true,
                    createdAt: client.createdAt,
                    updatedAt: client.updatedAt,
                    status: user?.isActive === false ? 'INACTIVE' : 'ACTIVE',
                    totalBookings: client.totalBookings ?? 0,
                    totalSpent: client.totalSpent ?? 0,
                    companyName: client.companyName,
                    industry: client.industry,
                    companySize: client.companySize,
                    address: client.address,
                    jobTitle: client.jobTitle,
                    department: client.department,
                    budget: client.budget,
                    preferredCategories: client.preferredCategories,
                    eventTypes: client.eventTypes,
                    communicationPrefs: client.communicationPrefs,
                };
                return res.json(mapped);
            }
            catch (error) {
                return next(error);
            }
        };
        // Deletar um cliente (user + perfil)
        this.deleteClient = async (req, res, next) => {
            try {
                const id = req.params["id"];
                if (!id) {
                    return res.status(400).json({ error: "ID é obrigatório" });
                }
                // Remove perfil de cliente
                let client = null;
                try {
                    client = await clientService.getClientById(id);
                }
                catch { }
                await prisma_1.prisma.client.delete({ where: { id } });
                // Remove usuário, se existir
                if (client && client.userId) {
                    try {
                        await userService.deleteUser(client.userId);
                    }
                    catch { }
                }
                return res.status(204).send();
            }
            catch (error) {
                return next(error);
            }
        };
    }
    // Gerenciamento de usuários
    async getUsers(req, res, next) {
        try {
            const { page = 1, limit = 10, search } = req.query;
            const users = await userService.getAllUsers({
                page: Number(page),
                limit: Number(limit),
                search: search,
            });
            res.json(users);
        }
        catch (error) {
            logger_1.default.error('Erro ao buscar usuários: ' + String(error));
            next(error);
        }
    }
    async getUserById(req, res, next) {
        try {
            const { id } = req.params;
            const user = await userService.getUserById(Number(id));
            if (!user) {
                return res.status(404).json({ message: "Usuário não encontrado" });
            }
            res.json(user);
        }
        catch (error) {
            logger_1.default.error('Erro ao buscar usuário: ' + String(error));
            next(error);
        }
    }
    async updateUserRole(req, res, next) {
        try {
            const { id } = req.params;
            const { role } = req.body;
            const user = await userService.updateUserRole(Number(id), role);
            res.json(user);
        }
        catch (error) {
            logger_1.default.error('Erro ao atualizar role do usuário: ' + String(error));
            next(error);
        }
    }
    async deleteUser(req, res, next) {
        try {
            const { id } = req.params;
            await userService.deleteUser(Number(id));
            res.status(204).send();
        }
        catch (error) {
            logger_1.default.error('Erro ao deletar usuário: ' + String(error));
            next(error);
        }
    }
    // Dashboard e estatísticas
    async getDashboard(req, res, next) {
        try {
            const dashboardStats = await bookingService.getDashboardStats();
            const stats = {
                totalUsers: await userService.getTotalUsers(),
                totalBookings: dashboardStats.totalBookings,
                totalEquipments: await equipmentService.getTotalEquipments(),
                recentBookings: await bookingService.getAllBookings({ eventDateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }),
            };
            res.json(stats);
        }
        catch (error) {
            logger_1.default.error('Erro ao buscar dashboard: ' + String(error));
            next(error);
        }
    }
    // Gerenciamento de reservas
    async getAllBookings(req, res, next) {
        try {
            const { page = 1, limit = 10, status, startDate, endDate } = req.query;
            const bookings = await bookingService.getAllBookings({
                status: status,
                eventDateFrom: startDate ? new Date(startDate) : undefined,
                eventDateTo: endDate ? new Date(endDate) : undefined,
            });
            res.json(bookings);
        }
        catch (error) {
            logger_1.default.error('Erro ao buscar reservas: ' + String(error));
            next(error);
        }
    }
    async updateBookingStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status, adminNotes } = req.body;
            const booking = await bookingService.updateBookingStatus(id, status);
            res.json(booking);
        }
        catch (error) {
            logger_1.default.error('Erro ao atualizar status da reserva: ' + String(error));
            next(error);
        }
    }
    // Marca o email do usuário como verificado (apenas admin)
    async verifyUserEmail(req, res, next) {
        try {
            const { id } = req.params; // user id
            if (!id)
                return res.status(400).json({ message: 'ID do usuário é obrigatório' });
            const user = await prisma_1.prisma.user.findUnique({ where: { id } });
            if (!user)
                return res.status(404).json({ message: 'Usuário não encontrado' });
            if (user.verified)
                return res.status(200).json({ message: 'E-mail já verificado' });
            const updated = await prisma_1.prisma.user.update({ where: { id }, data: { verified: true } });
            return res.json({ success: true, user: { id: updated.id, email: updated.email, verified: updated.verified } });
        }
        catch (error) {
            logger_1.default.error('Erro ao verificar email de usuário: ' + String(error));
            next(error);
        }
    }
    // Reenvia e-mail de verificação: gera token e envia para o usuário
    async resendVerification(req, res, next) {
        try {
            const { id } = req.params; // user id
            if (!id)
                return res.status(400).json({ message: 'ID do usuário é obrigatório' });
            const user = await prisma_1.prisma.user.findUnique({ where: { id } });
            if (!user)
                return res.status(404).json({ message: 'Usuário não encontrado' });
            if (user.verified)
                return res.status(400).json({ message: 'E-mail já verificado' });
            const token = crypto_1.default.randomBytes(20).toString('hex');
            const updated = await prisma_1.prisma.user.update({
                where: { id },
                data: { passwordResetToken: token, passwordResetTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) },
            });
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
            const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
            try {
                await emailService_1.default.sendVerificationEmail(updated.email, verifyUrl);
            }
            catch (e) {
                logger_1.default.warn('Falha ao enviar e-mail de verificação: ' + String(e));
            }
            return res.json({ success: true, message: 'E-mail de verificação reenviado' });
        }
        catch (error) {
            logger_1.default.error('Erro ao reenviar verificação: ' + String(error));
            next(error);
        }
    }
}
exports.AdminController = AdminController;

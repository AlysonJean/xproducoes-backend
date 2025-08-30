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
exports.findAllClients = findAllClients;
exports.deleteUser = deleteUser;
exports.getUserById = getUserById;
exports.getAllUsers = getAllUsers;
exports.updateUserRole = updateUserRole;
exports.getTotalUsers = getTotalUsers;
exports.requestPasswordReset = requestPasswordReset;
exports.generateEmailVerificationToken = generateEmailVerificationToken;
exports.verifyEmailByToken = verifyEmailByToken;
exports.resendEmailVerification = resendEmailVerification;
exports.changePassword = changePassword;
exports.register = register;
exports.login = login;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.listUsers = listUsers;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.getUserStats = getUserStats;
// Listar todos os clientes (role CLIENT)
async function findAllClients() {
    return prisma_1.prisma.user.findMany({
        where: { role: "CLIENT" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
}
// Deletar usuário por ID
async function deleteUser(userId) {
    return prisma_1.prisma.user.delete({ where: { id: String(userId) } });
}
// Buscar usuário por ID
async function getUserById(id) {
    return prisma_1.prisma.user.findUnique({
        where: { id: String(id) },
        select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
}
// Buscar todos os usuários com paginação
async function getAllUsers(options) {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;
    const where = search ? {
        OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
        ]
    } : {};
    const [users, total] = await Promise.all([
        prisma_1.prisma.user.findMany({
            where,
            skip,
            take: limit,
            select: { id: true, name: true, email: true, role: true, createdAt: true }
        }),
        prisma_1.prisma.user.count({ where })
    ]);
    return { users, total, page, limit };
}
// Atualizar role do usuário
async function updateUserRole(id, role) {
    return prisma_1.prisma.user.update({
        where: { id: String(id) },
        data: { role }
    });
}
// Obter total de usuários
async function getTotalUsers() {
    return prisma_1.prisma.user.count();
}
// Métodos adicionais para o authService
async function requestPasswordReset(email) {
    // Segurança: não revelar se o usuário existe. Sempre retornar sucesso para
    // evitar enumeração de contas por e-mail.
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        // Log opcional e retorno silencioso
        try {
            console.info(`requestPasswordReset called for non-existing email: ${email}`);
        }
        catch (e) {
            // noop
        }
        // Não vazar resetToken via API (melhor prática)
        return { success: true };
    }
    // Gerar token de reset
    const resetToken = crypto_1.default.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetToken: resetToken,
            passwordResetTokenExpiry: resetTokenExpiry,
        },
    });
    // Enviar email com link seguro para reset (não bloquear o fluxo se o envio falhar)
    try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
        await (await Promise.resolve().then(() => __importStar(require('./emailService')))).default.sendPasswordResetEmail(user.email, user.name || '', resetUrl);
    }
    catch (e) {
        console.warn('Falha ao enviar email de reset:', e);
    }
    // Não retornar o token no corpo da resposta
    return { success: true };
}
async function generateEmailVerificationToken(userId) {
    const token = crypto_1.default.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma_1.prisma.user.update({ where: { id: userId }, data: { emailVerificationToken: token, emailVerificationTokenExpiry: expiry } });
    return token;
}
async function verifyEmailByToken(token) {
    const user = await prisma_1.prisma.user.findFirst({ where: { emailVerificationToken: token, emailVerificationTokenExpiry: { gte: new Date() } } });
    if (!user)
        throw new Error('Token inválido ou expirado');
    await prisma_1.prisma.user.update({ where: { id: user.id }, data: { verified: true, emailVerificationToken: null, emailVerificationTokenExpiry: null } });
    return true;
}
async function resendEmailVerification(userId) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('Usuário não encontrado');
    if (user.verified)
        throw new Error('E-mail já verificado');
    const token = await generateEmailVerificationToken(userId);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
    try {
        await (await Promise.resolve().then(() => __importStar(require('./emailService')))).default.sendVerificationEmail(user.email, verifyUrl);
    }
    catch (e) {
        console.warn('Falha ao enviar e-mail de verificação:', e);
    }
    return { success: true };
}
async function changePassword(userId, currentPassword, newPassword) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new Error("Usuário não encontrado");
    }
    // Verificar senha atual
    const isValid = await bcrypt_1.default.compare(currentPassword, user.passwordHash);
    if (!isValid) {
        throw new Error("Senha atual incorreta");
    }
    // Atualizar senha
    const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword }
    });
    return true;
}
const prisma_1 = require("../config/prisma");
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
// Use centralized, cryptographically generated secret from environment config
const config = { jwtSecret: environment_1.config.jwtSecret };
async function register(data) {
    const existing = await prisma_1.prisma.user.findUnique({
        where: { email: data.email },
    });
    if (existing)
        throw new Error("Email já está em uso.");
    const hash = await bcrypt_1.default.hash(data.password, 10);
    const user = await prisma_1.prisma.user.create({
        data: { name: data.name, email: data.email, passwordHash: hash },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    // Cria perfil de cliente por padrão (não bloqueante)
    try {
        await prisma_1.prisma.client.create({ data: { userId: user.id } });
    }
    catch (e) {
        console.warn('Falha ao criar perfil de cliente (não bloqueante):', e);
    }
    // Envia e-mail de verificação (não bloqueante)
    try {
        const token = await generateEmailVerificationToken(user.id);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
        await (await Promise.resolve().then(() => __importStar(require('./emailService')))).default.sendVerificationEmail(user.email, verifyUrl);
    }
    catch (e) {
        console.warn('Falha ao enviar e-mail de verificação (não bloqueante):', e);
    }
    return { ...user, needsEmailVerification: true };
}
async function login(data) {
    const user = await prisma_1.prisma.user.findUnique({ where: { email: data.email } });
    if (!user)
        throw new Error("Usuário não encontrado");
    const valid = await bcrypt_1.default.compare(data.password, user.passwordHash);
    if (!valid)
        throw new Error("Senha inválida");
    // Exigir verificação de e-mail se habilitado por ambiente
    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.verified) {
        const err = new Error('E-mail não verificado');
        err.code = 'EMAIL_NOT_VERIFIED';
        throw err;
    }
    const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, config.jwtSecret, { expiresIn: "7d" });
    // Adicionar rota de redirecionamento baseada no role
    let dashboardRoute = '/dashboard';
    const userRole = user.role;
    switch (userRole) {
        case 'ADMIN':
            dashboardRoute = '/admin/dashboard';
            break;
        case 'COLLABORATOR':
            dashboardRoute = '/collaborator/dashboard';
            break;
        case 'CLIENT':
            dashboardRoute = '/client/dashboard';
            break;
        // FREELANCER não está no enum UserRole, removido
        default:
            dashboardRoute = '/dashboard';
    }
    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        },
        token,
        redirectTo: dashboardRoute
    };
}
async function getProfile(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            createdAt: true,
        },
    });
    if (!user)
        throw new Error("Usuário não encontrado");
    return user;
}
async function updateProfile(userId, data, file) {
    const updateData = { ...data };
    // avatarUrl deve vir do middleware do Cloudinary
    if (data.avatarUrl) {
        updateData.avatarUrl = data.avatarUrl;
    }
    // Se o campo 'password' vier como extra, gerar hash e atribuir
    const password = data.password;
    if (password) {
        updateData.passwordHash = await bcrypt_1.default.hash(password, 10);
    }
    try {
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                createdAt: true,
            },
        });
        return user;
    }
    catch (error) {
        if (error.code === "P2002") {
            throw new Error("Email já está em uso.");
        }
        throw error;
    }
}
async function listUsers() {
    return prisma_1.prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
}
async function forgotPassword(email) {
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user)
        throw new Error("Usuário não encontrado");
    const token = crypto_1.default.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetToken: token,
            passwordResetTokenExpiry: expires,
        },
    });
    // Aqui você pode integrar com seu serviço de e-mail
    // await sendEmail(user.email, `Seu token de recuperação: ${token}`);
    return true;
}
async function resetPassword(token, newPassword) {
    const user = await prisma_1.prisma.user.findFirst({
        where: {
            passwordResetToken: token,
            passwordResetTokenExpiry: { gte: new Date() },
        },
    });
    if (!user)
        throw new Error("Token inválido ou expirado");
    const hash = await bcrypt_1.default.hash(newPassword, 10);
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash: hash,
            passwordResetToken: null,
            passwordResetTokenExpiry: null,
        },
    });
    return true;
}
async function getUserStats(userId) {
    try {
        const [bookingsCount, bookingsTotal, upcomingBookings, recentBookings] = await Promise.all([
            // Total de reservas do usuário
            prisma_1.prisma.booking.count({
                where: { clientId: userId }
            }),
            // Valor total das reservas
            prisma_1.prisma.booking.aggregate({
                where: { clientId: userId },
                _sum: { totalPrice: true }
            }),
            // Próximas reservas (próximos 30 dias)
            prisma_1.prisma.booking.count({
                where: {
                    clientId: userId,
                    eventDate: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    }
                }
            }),
            // Reservas recentes (últimos 30 dias)
            prisma_1.prisma.booking.count({
                where: {
                    clientId: userId,
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);
        return {
            totalBookings: bookingsCount,
            totalSpent: bookingsTotal._sum?.totalPrice || 0,
            upcomingBookings,
            recentBookings
        };
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas do usuário:', error);
        // Retornar valores padrão em caso de erro
        return {
            totalBookings: 0,
            totalSpent: 0,
            upcomingBookings: 0,
            recentBookings: 0
        };
    }
}

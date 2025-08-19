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
exports.register = register;
exports.login = login;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.listUsers = listUsers;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.getStats = getStats;
const client_1 = require("@prisma/client");
const userService = __importStar(require("../services/userService"));
const userSchema_1 = require("../validators/userSchema");
async function register(req, res) {
    const parse = userSchema_1.userRegisterSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ errors: parse.error.flatten() });
    }
    try {
        const user = await userService.register(parse.data);
        return res.status(201).json(user);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function login(req, res) {
    const parse = userSchema_1.userLoginSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ errors: parse.error.flatten() });
    }
    try {
        const result = await userService.login(parse.data);
        return res.json(result);
    }
    catch (error) {
        return res.status(401).json({ error: error.message });
    }
}
async function getProfile(req, res) {
    try {
        const user = await userService.getProfile(req.userId);
        return res.json(user);
    }
    catch (error) {
        return res.status(404).json({ error: error.message });
    }
}
async function updateProfile(req, res) {
    const parse = userSchema_1.profileUpdateSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ errors: parse.error.flatten() });
    }
    try {
        // Converter role de string para UserRole se fornecido
        const updateData = { ...parse.data };
        if (updateData.role && typeof updateData.role === 'string') {
            // Validar se é um valor válido do enum UserRole
            if (Object.values(client_1.UserRole).includes(updateData.role)) {
                updateData.role = updateData.role;
            }
            else {
                delete updateData.role; // Remove role inválido
            }
        }
        const user = await userService.updateProfile(req.userId, updateData, req.file);
        return res.json(user);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function listUsers(req, res) {
    try {
        const users = await userService.listUsers();
        return res.json(users);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function forgotPassword(req, res) {
    try {
        await userService.forgotPassword(req.body.email);
        return res.json({ message: "E-mail de recuperação enviado." });
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function resetPassword(req, res) {
    try {
        await userService.resetPassword(req.body.token, req.body.password);
        return res.json({ message: "Senha redefinida com sucesso." });
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function getStats(req, res) {
    try {
        const stats = await userService.getUserStats(req.userId);
        return res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

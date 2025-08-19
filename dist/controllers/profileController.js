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
exports.profileController = exports.ProfileController = void 0;
const zod_1 = require("zod");
// Esquema de validação para atualização de perfil de cliente
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
const clientService = __importStar(require("../services/clientService"));
const prisma_1 = require("../config/prisma");
class ProfileController {
    // Buscar perfil completo do usuário
    async getProfile(req, res) {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ message: "Usuário não autenticado" });
            }
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    clientProfile: {
                        include: {
                            favoriteEquipments: {
                                include: { equipment: true },
                            },
                        },
                    },
                    collaboratorProfile: {
                        include: {
                            // portfolioItems: true, // Comentado - modelo não existe no schema
                            reviews: true,
                            availabilities: true,
                        },
                    },
                },
            });
            if (!user) {
                return res.status(404).json({ message: "Usuário não encontrado" });
            }
            return res.json(user);
        }
        catch (error) {
            console.error("Erro ao buscar perfil:", error);
            return res.status(500).json({ message: "Erro interno do servidor" });
        }
    }
    // Atualizar perfil básico do usuário
    async updateProfile(req, res) {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ message: "Usuário não autenticado" });
            }
            const { name, bio, location, website, socialLinks } = req.body;
            const updatedUser = await prisma_1.prisma.user.update({
                where: { id: userId },
                data: {
                    name,
                    bio,
                    location,
                    website,
                    socialLinks,
                },
                include: {
                    clientProfile: true,
                    collaboratorProfile: true,
                },
            });
            return res.json(updatedUser);
        }
        catch (error) {
            console.error("Erro ao atualizar perfil:", error);
            return res.status(500).json({ message: "Erro interno do servidor" });
        }
    }
    // Buscar perfis de colaboradores com filtros
    async getCollaborators(req, res) {
        try {
            const { specialty, experience, location, minRate, maxRate, available } = req.query;
            const whereClause = {
                collaboratorProfile: {
                    isNot: null,
                    ...(specialty && { specialties: { has: specialty } }),
                    ...(experience && { experience: experience }),
                    ...(minRate && { hourlyRate: { gte: Number(minRate) } }),
                    ...(maxRate && { hourlyRate: { lte: Number(maxRate) } }),
                    ...(available && { availabilityStatus: "AVAILABLE" }),
                },
                ...(location && {
                    location: { contains: location, mode: "insensitive" },
                }),
            };
            const collaborators = await prisma_1.prisma.user.findMany({
                where: whereClause,
                include: {
                    collaboratorProfile: {
                        include: {
                            // portfolioItems: { // Comentado - modelo não existe no schema
                            //   take: 5,
                            //   orderBy: { createdAt: 'desc' }
                            // },
                            reviews: {
                                take: 3,
                                orderBy: { createdAt: "desc" },
                            },
                        },
                    },
                },
                orderBy: {
                    collaboratorProfile: { averageRating: "desc" },
                },
            });
            return res.json(collaborators);
        }
        catch (error) {
            console.error("Erro ao buscar colaboradores:", error);
            return res.status(500).json({ message: "Erro interno do servidor" });
        }
    }
    // Buscar detalhes de um colaborador específico
    async getCollaboratorDetails(req, res) {
        try {
            const { id } = req.params;
            const collaborator = await prisma_1.prisma.user.findUnique({
                where: { id },
                include: {
                    collaboratorProfile: {
                        include: {
                            // portfolioItems: { // Comentado - modelo não existe no schema
                            //   orderBy: { createdAt: 'desc' }
                            // },
                            reviews: {
                                orderBy: { createdAt: "desc" },
                            },
                            availabilities: {
                                where: {
                                    date: { gte: new Date() },
                                },
                                orderBy: { date: "asc" },
                            },
                            // eventCollaborators: { // Comentado - campo não existe no schema Collaborator
                            //   include: {
                            //     booking: {
                            //       select: { id: true, eventDate: true }
                            //     }
                            //   },
                            //   orderBy: { createdAt: 'desc' },
                            //   take: 10
                            // }
                        },
                    },
                },
            });
            if (!collaborator) {
                return res.status(404).json({ message: "Colaborador não encontrado" });
            }
            return res.json(collaborator);
        }
        catch (error) {
            console.error("Erro ao buscar detalhes do colaborador:", error);
            return res.status(500).json({ message: "Erro interno do servidor" });
        }
    }
    // Atualizar perfil de colaborador
    async updateCollaboratorProfile(req, res) {
        try {
            const userId = req.userId;
            if (!userId || typeof userId !== "string") {
                return res.status(401).json({ message: "Usuário não autenticado" });
            }
            const collaboratorProfile = await prisma_1.prisma.collaborator.findUnique({
                where: { userId },
            });
            if (!collaboratorProfile) {
                return res
                    .status(404)
                    .json({ message: "Perfil de colaborador não encontrado" });
            }
            const { specialties, experience, hourlyRate, phone, equipment, certifications, } = req.body;
            const updatedProfile = await prisma_1.prisma.collaborator.update({
                where: { userId },
                data: {
                    specialties,
                    experience,
                    hourlyRate,
                    phone,
                    equipment: equipment || [],
                    certifications: certifications || [],
                },
            });
            return res.json(updatedProfile);
        }
        catch (error) {
            console.error("Erro ao atualizar perfil de colaborador:", error);
            return res.status(500).json({ message: "Erro interno do servidor" });
        }
    }
    // Atualizar perfil de cliente (centralizado via clientService)
    async updateClientProfile(req, res) {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ message: "Usuário não autenticado" });
            }
            const parsed = clientProfileSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ error: "Dados inválidos", details: parsed.error.issues });
            }
            const updatedProfile = await clientService.updateClientProfileByUserId(userId, parsed.data);
            return res.json(updatedProfile);
        }
        catch (error) {
            console.error("Erro ao atualizar perfil de cliente:", error);
            return res.status(500).json({ message: "Erro interno do servidor" });
        }
    }
    // Adicionar item ao portfolio
    async addPortfolioItem(req, res) {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ message: "Usuário não autenticado" });
            }
            const collaborator = await prisma_1.prisma.collaborator.findUnique({
                where: { userId },
            });
            if (!collaborator) {
                return res
                    .status(404)
                    .json({ message: "Perfil de colaborador não encontrado" });
            }
            // Os campos do req.body não são usados pois a funcionalidade não está implementada
            // TODO: Implementar quando PortfolioItem for adicionado ao schema
            throw new Error("Portfolio functionality not implemented - PortfolioItem model missing from schema");
        }
        catch (error) {
            console.error("Erro ao adicionar item ao portfolio:", error);
            return res.status(500).json({ message: "Erro interno do servidor" });
        }
    }
    // Buscar clientes com filtros (centralizado via clientService)
    async getClients(req, res) {
        try {
            const { industry, companySize, location } = req.query;
            const clients = await clientService.listClientsWithProfiles({ industry, companySize, location });
            return res.json(clients);
        }
        catch (error) {
            console.error("Erro ao buscar clientes:", error);
            return res.status(500).json({ message: "Erro interno do servidor" });
        }
    }
}
exports.ProfileController = ProfileController;
exports.profileController = new ProfileController();

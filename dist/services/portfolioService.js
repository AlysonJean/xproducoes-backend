"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePortfolio = updatePortfolio;
exports.create = create;
exports.findAll = findAll;
exports.deletePortfolio = deletePortfolio;
const prisma_1 = require("../config/prisma");
async function updatePortfolio(id, data) {
    const updateData = {};
    if (data.title)
        updateData.title = data.title.trim();
    if (data.description)
        updateData.description = data.description.trim();
    if (data.eventDate) {
        const eventDate = typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate;
        if (!isNaN(eventDate.getTime()))
            updateData.eventDate = eventDate;
    }
    if (data.imageUrl)
        updateData.imageUrl = data.imageUrl;
    return prisma_1.prisma.portfolio.update({ where: { id }, data: updateData });
}
async function create(data) {
    // Validação dos dados
    if (!data.title || !data.description || !data.eventDate) {
        throw new Error('Dados obrigatórios não fornecidos: title, description, eventDate');
    }
    // Validar se imageUrl está presente (vindo do middleware do Cloudinary)
    if (!data.imageUrl) {
        throw new Error('Imagem é obrigatória');
    }
    let eventDate;
    try {
        eventDate = typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate;
        if (isNaN(eventDate.getTime())) {
            throw new Error('Data inválida fornecida');
        }
    }
    catch (error) {
        throw new Error('Erro ao processar data do evento');
    }
    const portfolioData = {
        title: data.title.trim(),
        description: data.description.trim(),
        eventDate: eventDate,
        imageUrl: data.imageUrl, // URL do Cloudinary
    };
    try {
        return await prisma_1.prisma.portfolio.create({ data: portfolioData });
    }
    catch (error) {
        console.error('Erro ao criar portfólio no banco de dados:', error);
        throw new Error('Erro interno ao salvar portfólio');
    }
}
async function findAll() {
    return prisma_1.prisma.portfolio.findMany({ orderBy: { eventDate: "desc" } });
}
async function deletePortfolio(id) {
    return prisma_1.prisma.portfolio.delete({ where: { id } });
}

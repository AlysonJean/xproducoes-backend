"use strict";
// src/services/geminiService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const prisma_1 = require("../config/prisma");
// Carrega a chave da API do seu arquivo .env
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
class GeminiService {
    async suggestEventTheme() {
        try {
            // 1. Buscar alguns equipamentos e kits do seu banco de dados para dar contexto à IA
            const equipments = await prisma_1.prisma.equipment.findMany({
                take: 15, // Pega uma amostra de 15 equipamentos
                select: { name: true, description: true },
            });
            const kits = await prisma_1.prisma.kit.findMany({
                take: 5, // Pega uma amostra de 5 kits
                select: { name: true, description: true },
            });
            // 2. Montar um "prompt" inteligente e detalhado
            const equipmentList = equipments
                .map((e) => `- ${e.name}: ${e.description}`)
                .join("\n");
            const kitList = kits
                .map((k) => `- ${k.name}: ${k.description}`)
                .join("\n");
            const prompt = `
        Você é um organizador de eventos criativo e especialista em marketing para uma empresa de aluguel de equipamentos de som e luz.
        Sua tarefa é criar uma sugestão curta e empolgante para um tema de festa que um cliente poderia organizar usando nossos equipamentos.

        Baseie-se na lista de equipamentos e kits disponíveis abaixo. A resposta deve ser em Português do Brasil.

        A resposta deve ser um único parágrafo, direto ao ponto, e muito convidativo.
        Exemplo de formato: "Que tal uma 'Festa Neon Retrô'? Ilumine a noite com nossas luzes negras, strobes e máquina de fumaça para uma viagem inesquecível aos anos 80! Combine com nosso Kit de DJ Básico para o som perfeito."

        Equipamentos Disponíveis:
        ${equipmentList}

        Kits Disponíveis:
        ${kitList}

        Agora, crie uma nova e diferente sugestão de tema de evento:
      `;
            // 3. Chamar a API Gemini
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return text;
        }
        catch (error) {
            console.error("Erro ao comunicar com a API Gemini:", error);
            // Lançar um erro que nosso middleware de erro global pode pegar
            throw new Error("Não foi possível gerar a sugestão no momento.");
        }
    }
}
exports.GeminiService = GeminiService;

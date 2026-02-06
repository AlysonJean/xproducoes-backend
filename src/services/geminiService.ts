// src/services/geminiService.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../config/prisma";
import logger from "../config/logger";


// Validate API key presence
const GEMINI_KEY = process.env.GEMINI_API_KEY;
// Default to true in development if not explicitly disabled
const IS_DEV = process.env.NODE_ENV !== 'production';
const USE_MOCK_FALLBACK = process.env.GEMINI_MOCK_FALLBACK 
  ? String(process.env.GEMINI_MOCK_FALLBACK).toLowerCase() === 'true'
  : IS_DEV; // Auto-enable mock in dev if variable is unset

let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_KEY);
  } catch (e) {
    logger.error({obj:e}, 'Falha ao inicializar Gemini client:');
    genAI = null;
  }
} else {
  logger.warn('GEMINI_API_KEY não configurada. Gemini estará desativado. Para habilitar, configure GEMINI_API_KEY no ambiente.');
}

const MOCK_SUGGESTIONS = [
  "Que tal uma 'Festa Acústica ao Entardecer'? Use nosso kit acústico, iluminação suave e um pequeno palco para criar um clima intimista e inesquecível.",
  "Experimente uma 'Noite de Cinema ao Ar Livre'! Com nosso projetor de alta definição e sistema de som surround, crie uma experiência mágica sob as estrelas.",
  "Organize uma 'Balada Neon'! Nossos kits de iluminação UV, strobos e lasers vão transformar seu espaço em uma pista de dança vibrante e cheia de energia.",
  "Sugerimos um 'Lounge Corporativo Premium'. Utilize nossa iluminação arquitetural e som ambiente de alta fidelidade para criar um networking elegante e produtivo."
];

function getMockSuggestion() {
  const randomIndex = Math.floor(Math.random() * MOCK_SUGGESTIONS.length);
  return MOCK_SUGGESTIONS[randomIndex];
}

export class GeminiService {
  async suggestEventTheme(): Promise<string> {
    // If no key and mock fallback enabled, return a safe mocked suggestion for local dev
    if (!genAI) {
      if (USE_MOCK_FALLBACK) {
        logger.info('GEMINI chave ausente: usando fallback mock auto-habilitado em DEV');
        return getMockSuggestion();
      }
      // Otherwise throw a clear error for operators/developers
      throw new Error('GEMINI_API_KEY não configurada e fallback desativado.');
    }

    try {
      // 1. Buscar alguns equipamentos e kits do seu banco de dados para dar contexto à IA
      const equipments = await prisma.equipment.findMany({
        take: 15, // Pega uma amostra de 15 equipamentos
        select: { name: true, description: true },
      });

      const kits = await prisma.kit.findMany({
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
      const model = genAI!.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return text;
    } catch (error: unknown) {
      // Detect common API errors to provide actionable logs
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({obj: errMsg}, 'Erro ao comunicar com a API Gemini:');

      // Fallback on API error if we are in DEV or configured to do so
      if (USE_MOCK_FALLBACK) {
        logger.warn('Falha na API Gemini, retornando sugestão mockada como fallback.');
        return getMockSuggestion();
      }

      // If the underlying error from Google contains structured details, try to surface a friendly message
      try {
        const errorObj = error as Record<string, unknown>;
        const details = errorObj?.errorDetails || 
          (errorObj?.response as Record<string, unknown>)?.data || null;
        if (details) {
          // If the error indicates invalid API key, log a clear instruction
          const isApiKeyInvalid = JSON.stringify(details).includes('API_KEY_INVALID');
          if (isApiKeyInvalid) {
            logger.error('Gemini API retornou API_KEY_INVALID. Verifique se GEMINI_API_KEY está correta e ativa no console do Google Cloud.');
          }
        }
      } catch {
        // ignore parsing errors
      }

      // Lançar um erro para o middleware global sem vazar a chave
      throw new Error('Não foi possível gerar a sugestão no momento. Verifique as configurações do provedor de IA.');
    }
  }
}

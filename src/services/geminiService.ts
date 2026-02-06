// src/services/geminiService.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../config/prisma";
import logger from "../config/logger";


// Validate API key presence
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const HF_KEY = process.env.HF_API_KEY;
// Default to true in development if not explicitly disabled
const IS_DEV = process.env.NODE_ENV !== 'production';
const USE_MOCK_FALLBACK = process.env.GEMINI_MOCK_FALLBACK 
  ? String(process.env.GEMINI_MOCK_FALLBACK).toLowerCase() === 'true'
  : IS_DEV; // Auto-enable mock in dev if variable is unset

let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_KEY && !GEMINI_KEY.startsWith('REDACTED_GEMINI_KEY_ROTATE_IF_STILL_ACTIVE')) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_KEY);
    logger.info('Gemini AI inicializado com sucesso.');
  } catch (e) {
    logger.error({obj:e}, 'Falha ao inicializar Gemini client:');
    genAI = null;
  }
} else if (HF_KEY) {
    logger.info('Usando Hugging Face como provedor de IA.');
} else {
  logger.warn('Nenhuma chave de API de IA (Gemini ou Hugging Face) configurada. Usando Mocks.');
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
  private async callHuggingFace(prompt: string): Promise<string> {
    if (!HF_KEY) throw new Error("Chave HF ausente");

    try {
        const response = await fetch(
            "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3",
            {
                headers: {
                    Authorization: `Bearer ${HF_KEY}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({
                    inputs: `<s>[INST] ${prompt} [/INST]`,
                    parameters: {
                        max_new_tokens: 200,
                        return_full_text: false,
                        temperature: 0.7
                    }
                }),
            }
        );

        if (!response.ok) {
           const errText = await response.text();
           throw new Error(`HF API Error: ${response.status} - ${errText}`);
        }

        const result = await response.json();
        // Hugging Face inference API returns array of object with 'generated_text'
        if (Array.isArray(result) && result.length > 0 && result[0].generated_text) {
             return result[0].generated_text.trim();
        }
        return "Sugestão gerada com sucesso!";

    } catch (err: any) {
        logger.error({err}, "Erro na chamada Hugging Face");
        throw err;
    }
  }

  async suggestEventTheme(): Promise<string> {
    // Se não houver nenhum provedor configurado, tenta mock
    if (!genAI && !HF_KEY) {
      if (USE_MOCK_FALLBACK) {
        logger.info('IA indisponível: usando fallback mock auto-habilitado em DEV');
        return getMockSuggestion();
      }
      throw new Error('Nenhuma chave de IA configurada e fallback desativado.');
    }

    try {
      // 1. Buscar contexto do banco de dados
      const equipments = await prisma.equipment.findMany({
        take: 15,
        select: { name: true, description: true },
      });

      const kits = await prisma.kit.findMany({
        take: 5,
        select: { name: true, description: true },
      });

      const equipmentList = equipments.map((e) => `- ${e.name}: ${e.description}`).join("\n");
      const kitList = kits.map((k) => `- ${k.name}: ${k.description}`).join("\n");

      const promptContext = `
        Você é um organizador de eventos criativo da empresa X-Produções.
        Com base nestes equipamentos:
        ${equipmentList}
        
        E nestes kits:
        ${kitList}
        
        Crie uma sugestão curta (máximo 3 frases) e empolgante de tema para uma festa.
        Use Português do Brasil.
        Exemplo: "Que tal uma Festa Neon? Use nossos canhões de luz..."
        
        Sugestão:
      `;

      // 2. Decidir qual provedor chamar
      if (HF_KEY) {
          // Prioridade para HF se configurado (já que o usuário pediu a troca)
          return await this.callHuggingFace(promptContext);
      } else if (genAI) {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const result = await model.generateContent(promptContext);
          const response = await result.response;
          return response.text();
      }
      
      return getMockSuggestion();

    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({obj: errMsg}, 'Erro ao comunicar com a API de IA:');

      if (USE_MOCK_FALLBACK) {
        logger.warn('Falha na API de IA, retornando sugestão valida via mock.');
        return getMockSuggestion();
      }

      throw new Error('Não foi possível gerar a sugestão no momento.');
    }
  }
}

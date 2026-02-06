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

// Importação dinâmica ou require para evitar falhas se a lib não estiver presente em builds legados
// Mas como já instalamos, vamos usar import direto se possível, ou require dentro do método para segurança
import { HfInference } from "@huggingface/inference";

// ... (código existente)

export class GeminiService {
  private async callHuggingFace(prompt: string): Promise<string> {
    if (!HF_KEY) throw new Error("Chave HF ausente");

    try {
        const hf = new HfInference(HF_KEY);
        // Usar Meta-Llama-3-8B-Instruct que validamos funcionar bem
        const response = await hf.chatCompletion({
            model: 'meta-llama/Meta-Llama-3-8B-Instruct',
            messages: [
                { role: "user", content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.7
        });

        if (response.choices && response.choices.length > 0 && response.choices[0].message.content) {
             return response.choices[0].message.content.trim();
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

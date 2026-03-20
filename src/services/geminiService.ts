// src/services/geminiService.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../config/prisma";
import logger from "../config/logger";
import { HfInference } from "@huggingface/inference";
import { AppError } from "../utils/errors";

/**
 * ✅ IA SERVICE (GEMINI & HUGGING FACE)
 * Fornece sugestões criativas de eventos baseadas no catálogo real de produtos.
 */

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const HF_KEY = process.env.HF_API_KEY;
const IS_DEV = process.env.NODE_ENV !== 'production';

// Fallback logic
const USE_MOCK_FALLBACK = process.env.GEMINI_MOCK_FALLBACK 
  ? String(process.env.GEMINI_MOCK_FALLBACK).toLowerCase() === 'true'
  : IS_DEV;

let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_KEY && !GEMINI_KEY.startsWith('AIzaSy')) { // Simplified check
  try {
    genAI = new GoogleGenerativeAI(GEMINI_KEY);
    logger.info('Gemini AI inicializado com sucesso.');
  } catch (e) {
    logger.error({obj:e}, 'Falha ao inicializar Gemini client:');
    genAI = null;
  }
}

const MOCK_SUGGESTIONS = [
  "Que tal uma 'Festa Acústica ao Entardecer'? Use nossos equipamentos de som de alta fidelidade e iluminação decorativa para criar um clima íntimo e acolhedor.",
  "Experimente uma 'Cinema Garden Night'! Com nossos projetores 4K e kits de sonorização externa, leve a magia das telas para o seu jardim.",
  "Transforme seu espaço com uma 'Balada Neon Experience'! Nossos lasers, máquinas de fumaça e painéis de LED criam uma atmosfera futurista inigualável.",
  "Para eventos corporativos, sugerimos o 'Lounge Networking Premium'. Som ambiente cristalino e iluminação cênica para impressionar seus parceiros.",
  "Crie um 'Mini Festival em Casa'! Combine nossos kits de palco, PA potente e iluminação de pista para uma experiência de show real."
];

function getMockSuggestion() {
  const randomIndex = Math.floor(Math.random() * MOCK_SUGGESTIONS.length);
  return MOCK_SUGGESTIONS[randomIndex];
}

export class GeminiService {
  private async callHuggingFace(prompt: string): Promise<string> {
    if (!HF_KEY) throw new AppError("Chave Hugging Face ausente", 503, true, "AI_PROVIDER_NOT_CONFIGURED");

    try {
        const hf = new HfInference(HF_KEY);
        // Meta-Llama-3-8B-Instruct é excelente para criatividade em português
        const response = await hf.chatCompletion({
            model: 'meta-llama/Meta-Llama-3-8B-Instruct',
            messages: [
                { 
                  role: "system", 
                  content: "Você é um consultor criativo de eventos da X-Produções. Seu objetivo é sugerir festas incríveis e detalhadas usando produtos específicos do catálogo." 
                },
                { role: "user", content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.85
        });

        if (response.choices && response.choices.length > 0 && response.choices[0].message.content) {
             return response.choices[0].message.content.trim();
        }
        return getMockSuggestion();

    } catch (err: any) {
        logger.error({err}, "Erro na chamada Hugging Face");
        throw err;
    }
  }

  async suggestEventTheme(): Promise<string> {
    // Se nenhum provedor configurado, mas mock ativo
    if (!genAI && !HF_KEY) {
      if (USE_MOCK_FALLBACK) return getMockSuggestion();
      throw new AppError('Serviço de IA não configurado no ambiente.', 503, true, "AI_PROVIDER_NOT_CONFIGURED");
    }

    try {
      // 1. Coletar inteligência real do catálogo (Equipamentos, Kits e Serviços)
      const [equipments, kits, services] = await Promise.all([
        prisma.equipment.findMany({ 
          where: { status: 'ACTIVE' },
          take: 10, 
          select: { name: true, description: true } 
        }),
        prisma.kit.findMany({ 
          where: { status: 'ACTIVE' },
          take: 5, 
          select: { name: true, description: true } 
        }),
        prisma.service.findMany({ 
          where: { status: 'ACTIVE' },
          take: 5, 
          select: { name: true, description: true } 
        })
      ]);

      const itemsDescription = [
        ...equipments.map(i => `Equipamento: ${i.name} (${i.description})`),
        ...kits.map(i => `Kit Combo: ${i.name} (${i.description})`),
        ...services.map(i => `Serviço Profissional: ${i.name} (${i.description})`)
      ].join("\n");

      const promptContext = `
        Você é o Especialista Chefe de Produção da X-Produções. Sua missão é encantar o cliente com uma ideia de evento IRRESISTÍVEL.

        CATÁLOGO DISPONÍVEL:
        ${itemsDescription}

        REQUISITOS DA RESPOSTA:
        1. Crie um nome chamativo para o evento (Ex: "Neon Sunset Rave").
        2. Explique o conceito brevemente (2 frases).
        3. Liste 3 itens específicos do catálogo acima que serão essenciais.
        4. Use um tom entusiasmado, profissional e persuasivo.
        5. Máximo 150 palavras.
        6. Idioma: Português do Brasil.

        SUGESTÃO CRIATIVA:
      `;

      // 2. Execução (Hugging Face tem prioridade se configurado)
      if (HF_KEY) {
          return await this.callHuggingFace(promptContext);
      } else if (genAI) {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const result = await model.generateContent(promptContext);
          return result.response.text();
      }
      
      return getMockSuggestion();

    } catch (error: any) {
      logger.error('IA Sugestão falhou:', error?.message || error);
      if (USE_MOCK_FALLBACK) return getMockSuggestion();
      throw new AppError('Não foi possível gerar a sugestão agora.', 502, true, "AI_SUGGESTION_FAILED");
    }
  }
}

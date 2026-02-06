import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import logger from "../config/logger";


export const getAppSettings = async (req: Request, res: Response) => {
  try {
    // Buscar as configurações mais recentes
    const settings = await prisma.appSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    if (!settings) {
      // Se não existir configurações, retornar valores padrão sem tentar criar
      // (pode falhar se a tabela não existir ou não houver permissões)
      logger.warn('WARN: Configurações de app não encontradas, retornando valores padrão');
      return res.json({
        id: 'default',
        logoUrl: null,
        companyName: 'X Produçoes e Eventos',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    res.json(settings);
  } catch (error) {
    logger.error({obj:error}, 'Erro ao buscar configurações:');
    // Retornar valores padrão em caso de erro
    res.json({
      id: 'default',
      logoUrl: null,
      companyName: 'X Produçoes e Eventos',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
};

export const updateAppSettings = async (req: Request, res: Response) => {
  try {
    const { logoUrl, companyName } = req.body;

    // Buscar configurações existentes ou criar novas
    const existingSettings = await prisma.appSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    const updatedSettings = await prisma.appSettings.upsert({
      where: { id: existingSettings?.id || 'default' },
      update: {
        logoUrl,
        companyName,
        updatedAt: new Date()
      },
      create: {
        logoUrl,
        companyName: companyName || 'X Produçoes e Eventos'
      }
    });

    res.json(updatedSettings);
  } catch (error) {
    logger.error({obj:error}, 'Erro ao atualizar configurações:');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

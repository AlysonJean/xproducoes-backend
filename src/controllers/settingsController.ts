import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const getAppSettings = async (req: Request, res: Response) => {
  try {
    // Buscar as configurações mais recentes
    const settings = await prisma.appSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    if (!settings) {
      // Se não existir configurações, criar com valores padrão
      const defaultSettings = await prisma.appSettings.create({
        data: {
          logoUrl: null,
          companyName: 'X Produçoes e Eventos'
        }
      });
      return res.json(defaultSettings);
    }

    res.json(settings);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
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
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
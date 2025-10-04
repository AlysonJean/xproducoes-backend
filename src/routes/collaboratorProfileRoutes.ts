import { Router } from 'express';
import { prisma } from '../config/prisma';
import { authenticate } from '../middlewares/auth';
import { requireCollaborator } from '../middlewares/auth';

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(authenticate);
router.use(requireCollaborator);

// ================================
// ROTAS DE PERFIL DO COLABORADOR
// ================================

// Obter perfil do colaborador atual
router.get('/me/profile', async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const collaborator = await prisma.collaborator.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            bio: true,
            location: true,
            website: true,
            socialLinks: true,
          }
        }
      }
    });

    if (!collaborator) {
      return res.status(404).json({ error: 'Perfil de colaborador não encontrado' });
    }

    res.json(collaborator);
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar perfil do colaborador
router.put('/me/profile', async (req, res) => {
  try {
    const userId = req.userId;
    const {
      phone,
      experience,
      hourlyRate,
      workingRadius,
      languages,
      specialties,
      equipment,
      certifications,
      bio,
      location,
      website,
      socialLinks
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Atualizar dados do usuário
    await prisma.user.update({
      where: { id: userId },
      data: {
        bio,
        location,
        website,
        socialLinks,
      }
    });

    // Atualizar dados do colaborador
    const collaborator = await prisma.collaborator.update({
      where: { userId },
      data: {
        phone,
        experience,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        workingRadius: workingRadius ? parseInt(workingRadius) : undefined,
        languages: languages || [],
        specialties: specialties || [],
        equipment: equipment || [],
        certifications: certifications || [],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            bio: true,
            location: true,
            website: true,
            socialLinks: true,
          }
        }
      }
    });

    res.json(collaborator);
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload de avatar
router.post('/me/avatar', async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // TODO: Implementar upload de avatar com Cloudinary
    // Por enquanto, apenas retorna sucesso
    res.json({ message: 'Avatar atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao fazer upload do avatar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ================================
// ROTAS DE PORTFÓLIO
// ================================

// Obter portfólio do colaborador
router.get('/me/portfolio', async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // TODO: Implementar modelo PortfolioItem no schema
    // Por enquanto, retorna array vazio
    res.json([]);
  } catch (error) {
    console.error('Erro ao obter portfólio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar item ao portfólio
router.post('/me/portfolio', async (req, res) => {
  try {
    const userId = req.userId;
    const { title, description, eventDate, tags, isPublic } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // TODO: Implementar criação de item do portfólio
    res.status(201).json({ message: 'Item adicionado ao portfólio' });
  } catch (error) {
    console.error('Erro ao adicionar item ao portfólio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar item do portfólio
router.put('/me/portfolio/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, description, eventDate, tags, isPublic } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // TODO: Implementar atualização de item do portfólio
    res.json({ message: 'Item do portfólio atualizado' });
  } catch (error) {
    console.error('Erro ao atualizar item do portfólio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover item do portfólio
router.delete('/me/portfolio/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // TODO: Implementar remoção de item do portfólio
    res.json({ message: 'Item removido do portfólio' });
  } catch (error) {
    console.error('Erro ao remover item do portfólio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ================================
// ROTAS DE CONFIGURAÇÕES
// ================================

// Obter configurações do colaborador
router.get('/me/settings', async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // TODO: Implementar configurações do colaborador
    res.json({
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      privacy: {
        profileVisibility: 'public',
        contactInfoVisibility: 'collaborators',
      },
      preferences: {
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
      }
    });
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configurações
router.put('/me/settings', async (req, res) => {
  try {
    const userId = req.userId;
    const { notifications, privacy, preferences } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // TODO: Implementar atualização de configurações
    res.json({ message: 'Configurações atualizadas' });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ================================
// ROTAS DE ESTATÍSTICAS
// ================================

// Obter estatísticas do colaborador
router.get('/me/stats', async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const collaborator = await prisma.collaborator.findUnique({
      where: { userId },
      include: {
        reviews: true,
        payments: true,
        eventAssignments: {
          include: {
            booking: true
          }
        }
      }
    });

    if (!collaborator) {
      return res.status(404).json({ error: 'Colaborador não encontrado' });
    }

    // Calcular estatísticas
    const stats = {
      totalEvents: collaborator.totalEvents,
      completedEvents: collaborator.completedEvents,
      totalEarnings: collaborator.totalEarnings,
      averageRating: collaborator.averageRating,
      totalReviews: collaborator.reviews.length,
      monthlyEarnings: 0, // TODO: Calcular baseado nos pagamentos do mês
      upcomingEvents: 0, // TODO: Calcular baseado em eventos futuros
      responseRate: 0, // TODO: Calcular baseado em respostas a convites
    };

    res.json(stats);
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ================================
// ROTAS DE DISPONIBILIDADE
// ================================

// Obter disponibilidade do colaborador
router.get('/me/availability', async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const collaborator = await prisma.collaborator.findUnique({
      where: { userId },
      include: {
        availabilities: true
      }
    });

    if (!collaborator) {
      return res.status(404).json({ error: 'Colaborador não encontrado' });
    }

    res.json(collaborator.availabilities);
  } catch (error) {
    console.error('Erro ao obter disponibilidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar disponibilidade
router.put('/me/availability', async (req, res) => {
  try {
    const userId = req.userId;
    const { availabilities } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // TODO: Implementar atualização de disponibilidade
    res.json({ message: 'Disponibilidade atualizada' });
  } catch (error) {
    console.error('Erro ao atualizar disponibilidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ================================
// ROTAS DE AVALIAÇÕES
// ================================

// Obter avaliações recebidas
router.get('/me/reviews', async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const collaborator = await prisma.collaborator.findUnique({
      where: { userId }
    });

    if (!collaborator) {
      return res.status(404).json({ error: 'Colaborador não encontrado' });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const reviews = await prisma.review.findMany({
      where: { collaboratorId: collaborator.id },
      include: {
        reviewer: {
          select: {
            name: true,
            avatarUrl: true
          }
        },
        booking: {
          select: {
            eventTitle: true,
            eventDate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    });

    const total = await prisma.review.count({
      where: { collaboratorId: collaborator.id }
    });

    res.json({
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        hasMore: skip + reviews.length < total
      }
    });
  } catch (error) {
    console.error('Erro ao obter avaliações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Responder a uma avaliação
router.post('/me/reviews/:reviewId/respond', async (req, res) => {
  try {
    const userId = req.userId;
    const { reviewId } = req.params;
    const { response } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // TODO: Implementar resposta a avaliação
    res.json({ message: 'Resposta enviada' });
  } catch (error) {
    console.error('Erro ao responder avaliação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
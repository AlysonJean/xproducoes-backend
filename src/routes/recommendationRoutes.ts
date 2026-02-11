// src/routes/recommendationRoutes.ts

import { createSafeRouter } from '../middlewares/safeRouter';
import {
  getPersonalizedRecommendations,
  getSimilarRecommendations,
  getFrequentlyBoughtTogether,
  getTrendingRecommendations,
  getNewRecommendations,
  getSeasonalRecommendations,
  getRecommendationsBasedOnFavorites,
  getRecommendationsByCategory,
  getRecommendationsByBudget
} from '../controllers/recommendationController';
import { optionalAuth } from '../middlewares/unifiedAuth';

const router = createSafeRouter();

/**
 * Rotas de Recomendações
 * Todas aceitam autenticação opcional (melhores resultados quando autenticado)
 */

// GET /api/v1/recommendations/personalized - Recomendações personalizadas
router.get('/personalized', optionalAuth, getPersonalizedRecommendations);

// GET /api/v1/recommendations/similar/:type/:id - Itens similares
router.get('/similar/:type/:id', optionalAuth, getSimilarRecommendations);

// GET /api/v1/recommendations/frequently-bought/:type/:id - Frequentemente comprados juntos
router.get('/frequently-bought/:type/:id', optionalAuth, getFrequentlyBoughtTogether);

// GET /api/v1/recommendations/trending - Em alta / trending
router.get('/trending', optionalAuth, getTrendingRecommendations);

// GET /api/v1/recommendations/new - Novidades
router.get('/new', optionalAuth, getNewRecommendations);

// GET /api/v1/recommendations/seasonal - Sazonais
router.get('/seasonal', optionalAuth, getSeasonalRecommendations);

// GET /api/v1/recommendations/based-on-favorites - Baseado em favoritos (requer auth)
router.get('/based-on-favorites', optionalAuth, getRecommendationsBasedOnFavorites);

// GET /api/v1/recommendations/category/:categoryId - Por categoria
router.get('/category/:categoryId', optionalAuth, getRecommendationsByCategory);

// GET /api/v1/recommendations/budget - Por faixa de preço
router.get('/budget', optionalAuth, getRecommendationsByBudget);

export default router;

# 🚀 Cache Implementation - X-Produções Backend

## Visão Geral

Este projeto implementa um sistema de cache híbrido robusto usando **Redis + Memory Cache** como fallback, seguindo as melhores práticas dos grandes players como Netflix, Uber e Amazon.

## Arquitetura do Cache

### 🏗️ Sistema Híbrido
- **Redis**: Cache distribuído para produção
- **Memory Cache**: Fallback automático quando Redis não está disponível
- **Cache-aside Pattern**: Estratégia de carregamento sob demanda

### 📊 Funcionalidades
- ✅ Cache automático em endpoints de leitura
- ✅ Invalidação inteligente de cache
- ✅ Health checks e métricas
- ✅ Configuração flexível de TTL
- ✅ Logging detalhado de hits/misses
- ✅ Fallback gracioso

## Configuração

### 1. Redis Local (Desenvolvimento)
```bash
# Instalar Redis
# Windows (via Chocolatey)
choco install redis-64

# Linux/Mac
# brew install redis

# Iniciar Redis
redis-server

# Configurar no .env
REDIS_URL=redis://localhost:6379
```

### 2. Upstash Redis (Produção Recomendada)
```bash
# 1. Criar conta em https://upstash.com
# 2. Criar um banco Redis
# 3. Copiar a URL de conexão
# 4. Configurar no .env ou variáveis de ambiente

UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
```

### 3. Variáveis de Ambiente
```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io

# Cache TTL Configuration
CACHE_TTL_SHORT=60      # 1 minuto
CACHE_TTL_MEDIUM=300    # 5 minutos
CACHE_TTL_LONG=1800     # 30 minutos
```

## Endpoints com Cache

### Equipamentos
- `GET /api/equipment` - Lista todos os equipamentos (TTL: 5min)
- `GET /api/equipment/:id` - Detalhes do equipamento (TTL: 5min)
- `GET /api/equipment/search` - Busca de equipamentos (TTL: 2min)

### Categorias
- `GET /api/category` - Lista todas as categorias (TTL: 5min)
- `GET /api/category/with-counts` - Categorias com contagem (TTL: 5min)
- `GET /api/category/featured` - Categorias em destaque (TTL: 10min)

### Kits
- `GET /api/kit` - Lista todos os kits (TTL: 5min)
- `GET /api/kit/:id` - Detalhes do kit (TTL: 5min)

### Portfolio
- `GET /api/portfolio` - Itens do portfolio (TTL: 10min)

### Reviews
- `GET /api/review` - Lista de reviews (TTL: 2min)
- `GET /api/review/stats` - Estatísticas de reviews (TTL: 5min)

## Health Check do Cache

### Endpoint
```
GET /api/health/cache
```

### Resposta de Exemplo
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "cache": {
    "status": "healthy",
    "redisConnected": true,
    "memoryConnected": true,
    "redisItemCount": 45,
    "memoryItemCount": 12,
    "stats": {
      "redis": {
        "size": 45,
        "keys": ["equipment:all", "category:withCounts", ...]
      },
      "memory": {
        "size": 12,
        "keys": ["user:123", "booking:active", ...]
      }
    }
  }
}
```

## Estratégias de Cache

### TTL (Time To Live)
- **SHORT (60s)**: Dados que mudam frequentemente
- **MEDIUM (300s)**: Dados moderadamente dinâmicos
- **LONG (1800s)**: Dados relativamente estáticos
- **VERY_LONG (3600s)**: Dados quase estáticos

### Invalidação
- **Automática**: Após operações CREATE/UPDATE/DELETE
- **Pattern-based**: Invalidação por padrões de chave
- **Namespace-based**: Invalidação por namespaces

### Padrões de Chave
```
equipment:all              # Lista de equipamentos
equipment:byId:123         # Equipamento específico
category:withCounts        # Categorias com contagem
user:bookings:123:1        # Bookings do usuário (paginado)
booking:456                # Booking específico
```

## Monitoramento

### Logs
O sistema gera logs detalhados para:
- ✅ Cache hits/misses
- ✅ Conexões Redis
- ✅ Invalidações de cache
- ✅ Erros de cache

### Métricas
- **Hit Rate**: Taxa de acertos do cache
- **Miss Rate**: Taxa de falhas do cache
- **Memory Usage**: Uso de memória
- **Redis Connections**: Status das conexões

## Boas Práticas

### 1. Cache-aside Pattern
```typescript
const data = await cacheService.getOrSet(
  cacheKey,
  () => fetchFromDatabase(),
  CacheService.TTL.MEDIUM
);
```

### 2. Invalidação Adequada
```typescript
// Após criar/atualizar
await cacheService.invalidateEquipmentCaches();

// Após deletar
await cacheService.invalidateEquipmentCaches(equipmentId);
```

### 3. Chaves Consistentes
```typescript
const cacheKey = `equipment:${equipmentId}`;
const listKey = `equipment:all`;
```

### 4. TTL Apropriado
- **Dados estáticos**: LONG (30min+)
- **Dados dinâmicos**: SHORT (1-5min)
- **Dados críticos**: SHORT (30s-1min)

## Troubleshooting

### Redis Não Conectado
- ✅ Verificar URL do Redis
- ✅ Verificar credenciais
- ✅ Verificar conectividade de rede
- ✅ Sistema usa cache em memória como fallback

### Cache Não Invalida
- ✅ Verificar se `invalidateEquipmentCaches()` foi chamado
- ✅ Verificar padrões de chave
- ✅ Verificar logs de invalidação

### Performance Baixa
- ✅ Verificar hit rate (>80% ideal)
- ✅ Ajustar TTLs
- ✅ Considerar mais instâncias Redis
- ✅ Verificar uso de memória

## Próximos Passos

### Melhorias Planejadas
- [ ] Cache de queries complexas
- [ ] Cache de sessões de usuário
- [ ] Cache distribuído com Redis Cluster
- [ ] Métricas avançadas com Prometheus
- [ ] Cache de arquivos estáticos

### Monitoramento Avançado
- [ ] Alertas de cache miss rate alta
- [ ] Dashboards de performance
- [ ] Análise de padrões de acesso
- [ ] Otimização automática de TTL

---

## 🎯 Resultado

Com esta implementação, esperamos:
- **80%+ hit rate** em produção
- **50%+ redução** no tempo de resposta
- **70%+ redução** na carga do banco de dados
- **99.9% uptime** com fallback gracioso

Seguindo as melhores práticas dos grandes players! 🚀</content>
<parameter name="filePath">d:\agora vai\backend\CACHE_README.md

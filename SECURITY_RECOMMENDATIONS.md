# 🔐 Recomendações de Segurança

Este documento descreve melhorias de segurança recomendadas para implementação futura.

---

## 1. Rate Limiting com Redis

### Problema Atual
O rate limiting por usuário usa `Map` em memória:

```typescript
// middlewares/unifiedAuth.ts
const userRequests = new Map<string, { count: number; resetTime: number }>();
```

**Limitação:** Em ambiente com múltiplas instâncias (Kubernetes, Docker Swarm, múltiplos processos PM2), cada instância tem seu próprio Map, permitindo que um atacante exceda o limite fazendo requests distribuídos entre instâncias.

### Solução Recomendada

Usar Redis como store compartilhado:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export function rateLimitByUser(maxRequests: number, windowMs: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.userId) return next();

    const key = `ratelimit:${req.userId}`;
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.pexpire(key, windowMs);
    }
    
    if (current > maxRequests) {
      const ttl = await redis.pttl(key);
      return res.status(429).json({
        success: false,
        message: "Limite de requisições excedido",
        retryAfter: Math.ceil(ttl / 1000)
      });
    }
    
    next();
  };
}
```

**Dependência:** `ioredis` já está instalado no projeto.

---

## 2. Refresh Tokens em httpOnly Cookies

### Problema Atual
Refresh tokens são armazenados no frontend via `secureStorage`:

```typescript
// frontend/src/contexts/AuthContext.tsx
secureStorage.set('refreshToken', data.refreshToken);
```

**Risco:** Se a aplicação for vulnerável a XSS, um atacante pode roubar o refresh token e manter acesso persistente.

### Solução Recomendada

**Backend:**

```typescript
// authController.ts - No login
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  path: '/api/v1/auth/refresh'  // Só enviado para este endpoint
});

// Retorna apenas accessToken no body
res.json({ accessToken, user });
```

**Backend - Refresh endpoint:**

```typescript
// authController.ts - No refresh
const refreshToken = req.cookies.refreshToken;
if (!refreshToken) {
  return res.status(401).json({ message: 'Refresh token not found' });
}
// ... validação e geração de novo token
```

**Frontend:**

```typescript
// Não armazena mais refreshToken
// Apenas o accessToken é armazenado localmente
const response = await fetch('/api/v1/auth/refresh', {
  method: 'POST',
  credentials: 'include'  // Envia cookies automaticamente
});
```

---

## 3. Rotação de Refresh Tokens

Implementar rotação de refresh tokens para detectar uso indevido:

```typescript
// Ao usar um refresh token, gerar um novo e invalidar o antigo
const newRefreshToken = generateRefreshToken();
await prisma.user.update({
  where: { id: user.id },
  data: { 
    refreshTokenHash: hashToken(newRefreshToken),
    refreshTokenVersion: { increment: 1 }
  }
});
```

---

## Prioridade de Implementação

| Melhoria | Impacto | Esforço | Prioridade |
|----------|---------|---------|------------|
| httpOnly Cookies | Alto | Médio | 🔴 Alta |
| Redis Rate Limiting | Médio | Baixo | 🟠 Média |
| Rotação de Tokens | Médio | Médio | 🟡 Baixa |

---

## Referências

- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Redis Rate Limiting](https://redis.io/commands/incr/#pattern-rate-limiter)

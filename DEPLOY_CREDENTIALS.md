# 🚀 DEPLOY - CONFIGURAÇÃO DE CREDENCIAIS

## 📋 VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS

### 🔐 Credenciais Essenciais
- `DATABASE_URL` - URL do banco PostgreSQL
- `JWT_SECRET` - Chave secreta para JWT
- `JWT_REFRESH_SECRET` - Chave secreta para refresh token

### 💳 Stripe (Pagamentos)
- `STRIPE_SECRET_KEY` - Chave secreta do Stripe
- `STRIPE_PUBLISHABLE_KEY` - Chave pública do Stripe

### 📧 Email (SMTP)
- `SMTP_HOST` - Servidor SMTP
- `SMTP_PORT` - Porta SMTP (587)
- `SMTP_USER` - Usuário SMTP
- `SMTP_PASS` - Senha SMTP

### ☁️ Cloudinary (Imagens)
- `CLOUDINARY_CLOUD_NAME` - Nome do cloud
- `CLOUDINARY_API_KEY` - Chave da API
- `CLOUDINARY_API_SECRET` - Segredo da API

### ⚡ Redis Cache (IMPORTANTE!)
- `UPSTASH_REDIS_REST_URL` - URL do Redis Upstash
- `UPSTASH_REDIS_REST_TOKEN` - Token de autenticação

---

## 🏭 RENDER.COM

### Método 1: Via Dashboard
1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Selecione seu serviço web
3. Vá em **Environment**
4. Adicione cada variável:
   ```
   UPSTASH_REDIS_REST_URL=https://internal-lab-40877.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AZ-tAAIncDE1ZGRjY2E4ZTI0ODg0N2ViOWUwOWIyMTc1NDU5Yzk5ZXAxNDA4Nzc
   NODE_ENV=production
   FRONTEND_URL=https://seu-frontend.vercel.app
   ```

### Método 2: Via render.yaml
Use o arquivo `render.yaml` atualizado neste repositório.

---

## ▲ VERCEL

### Método 1: Via Dashboard
1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione cada variável com escopo **Production**

### Método 2: Via CLI
```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add NODE_ENV
```

### Método 3: Via vercel.json
O arquivo `vercel.json` está configurado para variáveis básicas.

---

## 🔍 VERIFICAÇÃO

Após configurar, teste se o cache está funcionando:

```bash
# Em produção
curl https://sua-api.com/api/health/cache
```

### ✅ Resposta esperada:
```json
{
  "status": "ok",
  "cache": {
    "redis": "connected",
    "memory": "active"
  }
}
```

---

## ⚠️ ATENÇÃO

1. **Nunca commite** o arquivo `.env` no Git
2. **Use sempre HTTPS** para as URLs do Redis
3. **Configure NODE_ENV=production** em produção
4. **Teste a conexão** após deploy
5. **Monitore o Upstash** para uso de recursos

---

## 🔗 LINKS ÚTEIS

- [Render Docs](https://docs.render.com/configure-environment-variables)
- [Vercel Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Upstash Console](https://console.upstash.com/)
- [Redis Health Check](https://sua-api.com/api/health/cache)

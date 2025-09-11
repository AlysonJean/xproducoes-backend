# 🚀 GUIA RÁPIDO: CONFIGURAR CREDENCIAIS NO RENDER

## 📋 PASSO A PASSO

### 1. Acesse o Render Dashboard
🔗 [https://dashboard.render.com](https://dashboard.render.com)

### 2. Selecione seu serviço
- Clique no seu projeto backend
- Vá na aba **Environment**

### 3. Adicione cada variável (uma por vez):

#### 🔴 OBRIGATÓRIAS:

**Redis (Upstash) - IMPORTANTE:**
```
UPSTASH_REDIS_REST_URL = https://internal-lab-40877.upstash.io
UPSTASH_REDIS_REST_TOKEN = AZ-tAAIncDE1ZGRjY2E4ZTI0ODg0N2ViOWUwOWIyMTc1NDU5Yzk5ZXAxNDA4Nzc
```

**Banco de Dados:**
```
DATABASE_URL = postgresql://seu-usuario:senha@host:porta/database
```

**JWT:**
```
JWT_SECRET = _9maiII2UnHqrB8N3lhgerR1DElJ94{M8Vh2iudn3u0n7irP(bRw>Y!3H<S1}_hX
JWT_REFRESH_SECRET = Q9G9lXX94bDGM14z1vqFwcy4bUUBuy1Us$HYQA58Um7zz<?jyvwPb[@FvXopK2]^
```

**Stripe:**
```
STRIPE_SECRET_KEY = sk_test_51RgrjSR23qJwicsvy7LTgUVvwvInVsekn2fNrWggK9KDoYE6gyNmF7k9aNUJYWsX40R9PunYdIKhqJUnKMDmzTCH0093nEBDyC
STRIPE_PUBLISHABLE_KEY = pk_test_51RgrjSR23qJwicsvToq8Qpw6ke9LwMICyXQHlHHl3Q1cp7EN7UsaXEBiFXZFSm8UV8xKEa5xD1WeefXlIWt4HYij00kiQ1P3Yw
```

**Cloudinary:**
```
CLOUDINARY_CLOUD_NAME = dlbw9kmhr
CLOUDINARY_API_KEY = 975272921689112
CLOUDINARY_API_SECRET = uRsef9eth7ThSerRYvLViNi3dN8
```

#### 🟡 OPCIONAIS:

**Email (SMTP):**
```
SMTP_HOST = live.smtp.mailtrap.io
SMTP_PORT = 587
SMTP_USER = 8b4e9abc191419
SMTP_PASS = 65abc969f66361
```

**Ambiente:**
```
NODE_ENV = production
FRONTEND_URL = https://seu-frontend.vercel.app
```

### 4. Salve e faça o deploy
- Clique em **Save Changes**
- O Render irá fazer o redeploy automaticamente

### 5. Verifique se funcionou
```bash
curl https://sua-api-render.com/api/health/cache
```

### ✅ RESPOSTA ESPERADA:
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

## 🔍 DICAS IMPORTANTES

1. **Copie exatamente** os valores do seu `.env`
2. **Não adicione aspas** nos valores
3. **Todas as variáveis são case-sensitive**
4. **O Redis só funciona em produção** (desenvolvimento usa cache em memória)
5. **Teste a conexão** após o deploy

---

## 🚨 PROBLEMAS COMUNS

### ❌ "Redis connection failed"
- Verifique se a URL e token estão corretos
- Certifique-se que está em produção (`NODE_ENV=production`)

### ❌ "Database connection failed"
- Verifique a URL do PostgreSQL
- Certifique-se que o banco está acessível

### ❌ "Stripe payment failed"
- Verifique as chaves do Stripe
- Use chaves de teste para desenvolvimento

---

## 📞 SUPORTE

Se tiver problemas:
1. Execute `npm run check-env` localmente
2. Verifique os logs no Render Dashboard
3. Teste a conexão Redis no [Upstash Console](https://console.upstash.com)

**Suas credenciais do Upstash já estão prontas para uso!** 🎉

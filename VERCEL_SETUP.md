# 🚀 GUIA RÁPIDO: CONFIGURAR CREDENCIAIS NA VERCEL

## 📋 PASSO A PASSO

### 1. Acesse o Vercel Dashboard
🔗 [https://vercel.com/dashboard](https://vercel.com/dashboard)

### 2. Selecione seu projeto
- Clique no seu projeto backend
- Vá em **Settings** → **Environment Variables**

### 3. Adicione cada variável (uma por vez):

#### 🔴 OBRIGATÓRIAS:

**Redis (Upstash) - IMPORTANTE:**
```
Name: UPSTASH_REDIS_REST_URL
Value: https://internal-lab-40877.upstash.io
Environment: Production
```

```
Name: UPSTASH_REDIS_REST_TOKEN
Value: AZ-tAAIncDE1ZGRjY2E4ZTI0ODg0N2ViOWUwOWIyMTc1NDU5Yzk5ZXAxNDA4Nzc
Environment: Production
```

**Banco de Dados:**
```
Name: DATABASE_URL
Value: postgresql://seu-usuario:senha@host:porta/database
Environment: Production
```

**JWT:**
```
Name: JWT_SECRET
Value: _9maiII2UnHqrB8N3lhgerR1DElJ94{M8Vh2iudn3u0n7irP(bRw>Y!3H<S1}_hX
Environment: Production
```

```
Name: JWT_REFRESH_SECRET
Value: Q9G9lXX94bDGM14z1vqFwcy4bUUBuy1Us$HYQA58Um7zz<?jyvwPb[@FvXopK2]^
Environment: Production
```

**Stripe:**
```
Name: STRIPE_SECRET_KEY
Value: sk_test_51RgrjSR23qJwicsvy7LTgUVvwvInVsekn2fNrWggK9KDoYE6gyNmF7k9aNUJYWsX40R9PunYdIKhqJUnKMDmzTCH0093nEBDyC
Environment: Production
```

```
Name: STRIPE_PUBLISHABLE_KEY
Value: pk_test_51RgrjSR23qJwicsvToq8Qpw6ke9LwMICyXQHlHHl3Q1cp7EN7UsaXEBiFXZFSm8UV8xKEa5xD1WeefXlIWt4HYij00kiQ1P3Yw
Environment: Production
```

**Cloudinary:**
```
Name: CLOUDINARY_CLOUD_NAME
Value: dlbw9kmhr
Environment: Production
```

```
Name: CLOUDINARY_API_KEY
Value: 975272921689112
Environment: Production
```

```
Name: CLOUDINARY_API_SECRET
Value: uRsef9eth7ThSerRYvLViNi3dN8
Environment: Production
```

#### 🟡 OPCIONAIS:

**Email (SMTP):**
```
Name: SMTP_HOST
Value: live.smtp.mailtrap.io
Environment: Production
```

```
Name: SMTP_PORT
Value: 587
Environment: Production
```

```
Name: SMTP_USER
Value: 8b4e9abc191419
Environment: Production
```

```
Name: SMTP_PASS
Value: 65abc969f66361
Environment: Production
```

### 4. Ambiente
```
Name: NODE_ENV
Value: production
Environment: Production
```

```
Name: FRONTEND_URL
Value: https://seu-frontend.vercel.app
Environment: Production
```

### 5. Salve e faça o deploy
- Clique em **Save**
- Faça um novo deploy ou push para o repositório

### 6. Verifique se funcionou
```bash
curl https://sua-api.vercel.app/api/health/cache
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

## 🔍 DIFERENÇAS DA VERCEL PARA O RENDER

### Vercel:
- ✅ **Interface visual** para adicionar variáveis
- ✅ **Escopo por ambiente** (Production, Preview, Development)
- ✅ **Deploy automático** após salvar
- ✅ **Histórico de mudanças**

### Render:
- ✅ **Interface similar**
- ✅ **Deploy manual** necessário
- ✅ **Suporte a `render.yaml`**

---

## 🚨 DICAS IMPORTANTES

1. **Sempre use** `Environment: Production` para produção
2. **Copie exatamente** os valores do seu `.env`
3. **Não adicione aspas** nos valores
4. **Todas as variáveis são case-sensitive**
5. **O Redis só funciona em produção**

---

## 📞 SUPORTE

Se tiver problemas:
1. Execute `npm run check-env` localmente
2. Verifique os logs na Vercel
3. Teste a conexão Redis no [Upstash Console](https://console.upstash.com)

**Suas credenciais do Upstash estão prontas para ambos!** 🎉

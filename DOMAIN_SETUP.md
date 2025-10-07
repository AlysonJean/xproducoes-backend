# Configuração do Domínio xproducoeseeventos.com.br

Guia completo para configurar seu domínio personalizado no Vercel (frontend) e Render (backend).

## 📋 Estrutura Recomendada

```
xproducoeseeventos.com.br          → Frontend (Vercel)
www.xproducoeseeventos.com.br      → Redirect para raiz (Vercel)
api.xproducoeseeventos.com.br      → Backend (Render)
```

---

## 🎨 FRONTEND - Vercel

### Passo 1: Adicionar Domínio no Vercel

1. Acesse: https://vercel.com/alyson-jeans-projects/frontend/settings/domains
2. Na seção "Domains", adicione:
   - `xproducoeseeventos.com.br`
   - `www.xproducoeseeventos.com.br`
3. Clique em "Add"

### Passo 2: Configurar DNS (no seu provedor de domínio)

O Vercel vai mostrar os registros DNS necessários. Configure no painel do seu provedor (Registro.br, GoDaddy, etc.):

#### Para domínio raiz (xproducoeseeventos.com.br):
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

#### Para www:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**OU (alternativa usando apenas CNAME):**

Se seu provedor suportar CNAME na raiz (ALIAS/ANAME):
```
Type: CNAME (ou ALIAS)
Name: @
Value: cname.vercel-dns.com
TTL: 3600
```

### Passo 3: Verificação

- Aguarde propagação DNS (5 minutos a 48 horas)
- O Vercel vai detectar automaticamente quando estiver configurado
- Certificado SSL será emitido automaticamente (Let's Encrypt)

---

## 🔧 BACKEND - Render

### Passo 1: Adicionar Custom Domain no Render

1. Acesse: https://dashboard.render.com/
2. Clique no seu serviço backend
3. Vá em **"Settings"** → **"Custom Domain"**
4. Clique em **"Add Custom Domain"**
5. Digite: `api.xproducoeseeventos.com.br`
6. Clique em "Save"

### Passo 2: Configurar DNS (subdomínio api)

O Render vai fornecer um endereço CNAME. Configure no seu provedor de domínio:

```
Type: CNAME
Name: api
Value: <seu-servico>.onrender.com (fornecido pelo Render)
TTL: 3600
```

**Exemplo:**
```
Type: CNAME
Name: api
Value: xproducoes-backend.onrender.com
TTL: 3600
```

### Passo 3: Verificação

- Aguarde propagação DNS
- O Render vai verificar e emitir certificado SSL automaticamente
- Teste: https://api.xproducoeseeventos.com.br/health (ou sua rota de health check)

---

## 🌐 CONFIGURAÇÃO DNS COMPLETA

No painel do seu provedor de domínio (Registro.br, etc.), adicione TODOS estes registros:

### Registros DNS:

```dns
# Frontend (Vercel)
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600

# Backend (Render)
Type: CNAME
Name: api
Value: xproducoes-backend.onrender.com
TTL: 3600
```

---

## 🔐 SSL/HTTPS (Automático)

### Vercel:
- ✅ SSL automático via Let's Encrypt
- ✅ Renovação automática
- ✅ HTTP → HTTPS redirect automático

### Render:
- ✅ SSL automático via Let's Encrypt
- ✅ Renovação automática
- ✅ HTTP → HTTPS redirect automático

**Você não precisa fazer nada!** Ambos configuram SSL automaticamente.

---

## 🔄 Atualizar Configurações da Aplicação

### Frontend: Atualizar API Base URL

Edite o arquivo de ambiente do frontend:

**`.env` ou `.env.production`:**
```env
VITE_API_URL=https://api.xproducoeseeventos.com.br
VITE_API_BASE_URL=https://api.xproducoeseeventos.com.br/api
```

### Backend: Atualizar CORS e Environment

No Render, adicione/atualize variáveis de ambiente:

```env
FRONTEND_URL=https://xproducoeseeventos.com.br
ALLOWED_ORIGINS=https://xproducoeseeventos.com.br,https://www.xproducoeseeventos.com.br
NODE_ENV=production
```

Atualize o CORS no código (se necessário):
```javascript
// backend/src/config/cors.ts
const allowedOrigins = [
  'https://xproducoeseeventos.com.br',
  'https://www.xproducoeseeventos.com.br',
  process.env.FRONTEND_URL
].filter(Boolean);
```

---

## ✅ Checklist de Validação

Após configurar tudo, teste:

### Frontend:
- [ ] https://xproducoeseeventos.com.br está acessível
- [ ] https://www.xproducoeseeventos.com.br redireciona ou funciona
- [ ] Certificado SSL válido (cadeado verde)
- [ ] Console do navegador sem erros de CORS

### Backend:
- [ ] https://api.xproducoeseeventos.com.br/health responde
- [ ] Certificado SSL válido
- [ ] CORS permite requisições do frontend

### DNS:
```powershell
# Testar resolução DNS
nslookup xproducoeseeventos.com.br
nslookup www.xproducoeseeventos.com.br
nslookup api.xproducoeseeventos.com.br
```

---

## 🚨 Troubleshooting

### DNS não resolve
- Aguarde até 48h para propagação completa
- Verifique se os registros estão corretos no painel do provedor
- Use: https://dnschecker.org/ para verificar propagação global

### SSL não funciona
- Aguarde alguns minutos após DNS propagar
- Vercel/Render emitem certificado automaticamente após verificar DNS
- Verifique se não há CDN/proxy conflitante

### CORS errors
- Certifique-se que `ALLOWED_ORIGINS` no backend inclui seu domínio
- Rebuild/redeploy o backend após alterar variáveis
- Limpe cache do navegador

### Frontend não conecta ao backend
- Verifique se `VITE_API_URL` está correto
- Rebuild/redeploy o frontend após alterar `.env`
- Teste o backend diretamente: `curl https://api.xproducoeseeventos.com.br/health`

---

## 📞 Onde Configurar DNS

Depende de onde você comprou/gerencia o domínio:

### Registro.br:
1. https://registro.br/
2. Login → Meus Domínios
3. Clique no domínio → DNS → Modo Avançado
4. Adicione os registros

### GoDaddy:
1. https://dcc.godaddy.com/
2. Meus Produtos → Domínios
3. DNS → Gerenciar Zonas DNS

### Hostinger:
1. hPanel → Domínios
2. Gerenciar → DNS / Registros DNS

### Cloudflare (se usar):
1. Dashboard → seu domínio
2. DNS → Records
3. Adicione os registros
4. **Importante:** Desative proxy (nuvem cinza) para registros Vercel/Render inicialmente

---

## 🎯 Resultado Final

Após tudo configurado:

- **Frontend:** https://xproducoeseeventos.com.br
- **API:** https://api.xproducoeseeventos.com.br
- **SSL:** ✅ Automático em ambos
- **Deploy:** ✅ Automático via GitHub Actions

---

## 📝 Próximos Passos

1. Configure DNS no seu provedor
2. Adicione domínios no Vercel e Render
3. Aguarde propagação (teste com `nslookup`)
4. Atualize variáveis de ambiente (API URLs, CORS)
5. Faça novo deploy do frontend e backend
6. Teste tudo!

**Tempo estimado:** 10-30 minutos + tempo de propagação DNS

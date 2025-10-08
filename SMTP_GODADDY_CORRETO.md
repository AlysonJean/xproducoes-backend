# 📧 Configuração SMTP GoDaddy - ATUALIZADO

## ✅ Servidor Correto Identificado

### **Configuração Oficial GoDaddy:**

```
Servidor SMTP: smtpout.secureserver.net
Porta: 465 (SSL) ou 587 (TLS)
Autenticação: Necessária
Usuário: seu-email-completo@dominio.com
Senha: sua-senha-do-email
```

---

## 🔧 O Que Foi Atualizado

### **1. Arquivo `.env` (Backend)**

**ANTES (INCORRETO):**
```env
SMTP_HOST=smtp.titan.email
SMTP_PORT=587
```

**DEPOIS (CORRETO):**
```env
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=suporte@xproducoeseeventos.com.br
SMTP_PASS=Gu.34186624
EMAIL_FROM=X Produções e Eventos <suporte@xproducoeseeventos.com.br>
```

### **2. EmailService (Backend)**

**Atualização:**
- Adicionada variável `SMTP_SECURE` para SSL
- Porta 465 usa SSL (`secure: true`)
- Porta 587 usa TLS (`secure: false`)

**Código:**
```typescript
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;

this.transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, // true para 465, false para 587
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});
```

---

## 🧪 Testar SMTP Agora

### **Opção 1: Script de Teste Completo**

```powershell
cd "d:\agora vai\backend"
npx ts-node test-smtp-godaddy.ts
```

**O que o script faz:**
- ✅ Verifica conexão com SMTP
- ✅ Envia email de teste profissional
- ✅ Mostra logs detalhados
- ✅ Email com design bonito (HTML)

### **Opção 2: Testar via API (depois do backend rodar)**

```powershell
# 1. Inicie o backend
npm run dev

# 2. Teste reset de senha
curl -X POST http://localhost:4000/api/v1/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"suporte@xproducoeseeventos.com.br"}'
```

---

## 📊 Diferenças Entre Servidores

| Característica | smtp.titan.email | smtpout.secureserver.net |
|----------------|------------------|--------------------------|
| **Tipo** | Titan Email (novo) | Workspace Email (clássico) |
| **Funciona?** | ❌ Não | ✅ Sim |
| **Porta SSL** | 465 | 465 |
| **Porta TLS** | 587 | 587 |
| **GoDaddy oficial** | Sim | Sim |

**Conclusão:** `smtpout.secureserver.net` é o servidor **CORRETO** para GoDaddy Workspace Email!

---

## 🔐 Portas SMTP

### **Porta 465 (SSL) - RECOMENDADA**

```env
SMTP_PORT=465
SMTP_SECURE=true
```

**Características:**
- ✅ Conexão criptografada desde o início
- ✅ Mais segura
- ✅ Menos problemas com firewalls
- ✅ Recomendada pela GoDaddy

### **Porta 587 (TLS/STARTTLS) - ALTERNATIVA**

```env
SMTP_PORT=587
SMTP_SECURE=false
```

**Características:**
- ✅ Inicia sem criptografia e depois ativa
- ✅ Compatível com mais servidores
- ⚠️ Pode ser bloqueada por alguns firewalls

---

## 🚀 Próximos Passos

### **1. Testar Conexão**

```powershell
npx ts-node test-smtp-godaddy.ts
```

**Resultado esperado:**
```
✅ CONEXÃO SMTP BEM-SUCEDIDA!
✅ EMAIL ENVIADO COM SUCESSO!
📬 Verifique sua caixa de entrada: suporte@xproducoeseeventos.com.br
```

### **2. Verificar Email**

- Acesse: https://login.secureserver.net
- Login: suporte@xproducoeseeventos.com.br
- Senha: Gu.34186624
- Verifique: Caixa de entrada

### **3. Testar Reset de Senha**

1. Acesse: https://xproducoeseeventos.com.br/forgot-password
2. Digite: seu-email@example.com
3. Clique: "Enviar Link de Recuperação"
4. Verifique: Caixa de entrada do email

---

## 🐛 Troubleshooting

### **Erro: EAUTH (Autenticação Falhou)**

**Soluções:**
1. Verifique se está usando email completo: `suporte@xproducoeseeventos.com.br`
2. Verifique se a senha está correta
3. Tente resetar a senha do email no painel GoDaddy
4. Verifique se SMTP está habilitado no painel

### **Erro: ECONNECTION (Não Conecta)**

**Soluções:**
1. Verifique se o host está correto: `smtpout.secureserver.net`
2. Tente trocar porta: 465 → 587 ou 587 → 465
3. Verifique firewall do Windows
4. Verifique conexão com internet

### **Erro: ETIMEDOUT (Timeout)**

**Soluções:**
1. Tente usar porta 587 (TLS) ao invés de 465 (SSL)
2. Verifique se não há proxy/VPN bloqueando
3. Tente em outra rede (ex: hotspot do celular)

---

## 📝 Atualizar Produção (Render)

Depois de testar localmente e confirmar que funciona:

### **1. Variáveis de Ambiente no Render**

Acesse: https://dashboard.render.com → xproducoes-backend → Environment

**Adicione/Atualize:**
```
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=suporte@xproducoeseeventos.com.br
SMTP_PASS=Gu.34186624
EMAIL_FROM=X Produções e Eventos <suporte@xproducoeseeventos.com.br>
```

### **2. Faça Deploy**

```powershell
cd "d:\agora vai\backend"
git add .
git commit -m "fix: atualiza SMTP para servidor correto da GoDaddy"
git push
```

O Render fará deploy automaticamente.

---

## 🎯 Checklist Final

- [ ] `.env` atualizado com servidor correto
- [ ] `emailService.ts` atualizado com SSL
- [ ] Script de teste criado (`test-smtp-godaddy.ts`)
- [ ] Teste local executado com sucesso
- [ ] Email de teste recebido
- [ ] Variáveis no Render atualizadas
- [ ] Deploy em produção feito
- [ ] Teste de reset de senha em produção

---

## 📞 Suporte GoDaddy

Se ainda tiver problemas:

**Telefone:** 0800 892 0254  
**Site:** https://br.godaddy.com/help  
**Webmail:** https://login.secureserver.net

---

## ✅ Resumo

**Problema:** Estava usando servidor SMTP errado (`smtp.titan.email`)  
**Solução:** Atualizado para servidor correto (`smtpout.secureserver.net`)  
**Status:** ✅ Configurado e pronto para testar  
**Próximo passo:** Executar `npx ts-node test-smtp-godaddy.ts`

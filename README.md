# X-Produções Backend - Deploy Render + Neon

## Deploy no Render

1. **Crie um novo serviço Web no Render**
   - Conecte este repositório.
   - Defina o build command: `npm run build`
   - Defina o start command: `npm run start`
   - Node version: 18+

2. **Variáveis de ambiente obrigatórias**
   - `DATABASE_URL` = string de conexão do Neon (ex: `postgresql://user:pass@ep-xxxx.neon.tech/db?sslmode=require`)
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` = segredos fortes
   - `FRONTEND_URL` = URL do frontend na Vercel (ex: `https://xproducoes-frontend.vercel.app`)
   - Outras: Stripe, Cloudinary, etc, conforme `.env.example`

3. **Banco de dados**
   - Use Neon (Postgres). Configure a string no Render.
   - Rode as migrations automaticamente: Render executa `npm run build` (que já roda `prisma generate`).
   - Se necessário, rode `npx prisma migrate deploy` manualmente pelo shell do Render.

4. **Healthcheck**
   - O endpoint `/` responde 200 OK.

5. **CORS**
   - O backend já permite múltiplos domínios em `FRONTEND_URL` (separados por vírgula).

6. **Logs**
   - Logs são enviados para o console (Render captura automaticamente).

## Deploy Local

```sh
cp .env.example .env
npm install
npm run build
npm start
```

---

## Dicas
- Nunca comite `.env` com segredos reais.
- Sempre use variáveis de ambiente no Render para segredos.
- Para debug, use o shell do Render para rodar comandos Prisma.

Guia de Deploy — Produção (Supabase + Render + Vercel)

Resumo

Este documento descreve um caminho recomendado para colocar a aplicação em produção usando:
- Supabase (Postgres gerenciado) para banco de dados
- Render para hospedar o backend Node/Express (alternativa: Fly / Heroku)
- Vercel para hospedar frontend (build estático + Playwright E2E)

Pré-requisitos

- Conta no Supabase, Render e Vercel
- Acesso ao repositório (push/PR) e ability to add repository secrets
- Cloudinary (ou S3) para uploads/armazenamento de imagens
- SMTP configurado para envio de emails (ou provedor como Mailgun/Sendgrid)
- JWT secret, keys e quaisquer credenciais usadas em production

Passos gerais

1) Banco de dados (Supabase)
- Crie um novo projeto no Supabase.
- Na seção `Database > Settings`, anote a connection string (DATABASE_URL) e o host.
- Configure roles/pg extensions conforme necessário (uuid-ossp, pgcrypto, etc.)
- Execute migrations localmente com `prisma migrate deploy` (ver detalhes abaixo) ou use o CLI do Supabase para aplicar SQL.

2) Aplicar migrations
- No seu ambiente local (ou em CI):

```bash
# Exemplo (use a variável DATABASE_URL apontando para Supabase)
cd backend
DATABASE_URL="postgresql://..." npx prisma migrate deploy
npx prisma db seed --preview-feature
```

3) Render — Backend
- Crie um novo Web Service no Render.
  - Runtime: Node 18
  - Build Command: npm ci && npm run build
  - Start Command: npm run start:prod (ou node dist/index.js, conforme package.json)
  - Environment: configure secrets a partir desta lista (JWT_SECRET, DATABASE_URL, CLOUDINARY_URL, SMTP_*, SENTRY_DSN, SVG_PROXY_TOKEN, etc.)
  - Health check path: /healthz (implemente se necessário)
- Configure auto-deploy a partir do branch `main` ou `feat/security-hardening`.

4) Vercel — Frontend
- Conecte o repositório ao Vercel.
- Configure projeto para apontar ao diretório `frontend`.
- Build Command: `npm ci && npm run build` (ou `npm run build` no package.json)
- Output Directory: `dist`
- Configure as Environment Variables no painel do Vercel (por exemplo: REACT_APP_API_URL apontando para backend public URL, CLOUDINARY_* se necessário).
- Deploy e verifique o site.

5) Variáveis de ambiente essenciais
- DATABASE_URL
- JWT_SECRET
- CLOUDINARY_URL (ou S3 creds)
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- SVG_PROXY_TOKEN
- SENTRY_DSN (opcional)
- NODE_ENV=production

6) Jobs e CI
- Configure uma pipeline de CI para aplicar migrations e seeds (opcional) antes do deploy do backend.
- A workflow de exemplo `.github/workflows/deploy-on-main.yml` pode executar `prisma migrate deploy` usando secrets.

7) Observabilidade e segurança
- Configure Sentry/Logs do Render para capturar erros.
- Habilite HTTPS e force HTTPS no Vercel.
- Configure CORS e CSP adicionais (já aplicados no backend) e verifique CSP no frontend se necessário.

Comandos rápidos úteis

- Rodar migrations localmente (apontando para Supabase):

```bash
cd backend
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy
npx prisma db seed --preview-feature
```

- Build & start backend localmente (produção-like):

```bash
cd backend
npm ci
npm run build
NODE_ENV=production DATABASE_URL="postgresql://..." npm run start:prod
```

Observações finais

- Se preferir Render para o banco de dados, você pode usar Managed Postgres do Render, mas Supabase oferece mais recursos (auth, storage) fora da caixa.
- A CI/infra acima assume que as chaves e variáveis sensíveis são configuradas via secrets no Render/Vercel.


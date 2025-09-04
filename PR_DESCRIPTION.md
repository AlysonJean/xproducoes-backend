Resumo das mudanças — feat/security-hardening

Objetivo

Melhorias de segurança focadas em mitigações SSRF, DOM XSS e medidas gerais (headers, cookies, rate-limits, sanitização SVG), além de testes automatizados.

Principais alterações

- Introduzido `safeFetch` central com validação DNS, bloqueio de IPs privados, validação de redirecionamentos e whitelist de hosts.
- Atualizado serviços que fazem chamadas externas para usar `safeFetch` (ex.: Facebook OAuth, ViaCEP, webhooks).
- Aplicado rate-limits a endpoints sensíveis (uploads, proxies e criação de reservas) usando middlewares centralizados em `src/middlewares/rateLimitMiddleware.ts`.
- Proteção e sanitização server-side para SVGs em `src/routes/logoRoutes.ts` (DOMPurify + JSDOM), CSP e limites de tamanho.
- Adicionado teste Playwright básico para `frontend/public/debug.html` e testes Jest para `safeFetch` (unit e integração) para validar bloqueios SSRF.
- Ajustes na configuração de segurança (helmet e headers) e helper para cookies seguras.
- Workflow GitHub Actions (`.github/workflows/playwright-and-snyk.yml`) que executa: backend tests, frontend Playwright E2E e Snyk scan (usa `SNYK_TOKEN` no secrets).

Como testar localmente

- Backend:
  cd backend
  npm ci
  npm test

- Frontend E2E (Playwright):
  cd frontend
  npm ci
  npx playwright install
  npm run build
  npx http-server -p 5173 -c-1 dist
  npx playwright test

Notas

- Push/PR remoto não foi realizado aqui porque a tentativa de push falhou por falta de acesso ao repositório remoto no ambiente: "Repository not found". Recomendado: configurar remote corretamente e push a branch `feat/security-hardening` para revisão.
- CI Snyk: configure `SNYK_TOKEN` no secrets do repositório para executar o scanner.

Checklist

- [x] safeFetch unit tests
- [x] safeFetch integration test
- [x] Playwright debug test (frontend)
- [x] rate-limits aplicados nas rotas principais (uploads, svg-proxy, booking create)
- [ ] Push/PR remoto
- [ ] CI Snyk token configurado

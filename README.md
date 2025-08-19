# Backend - instruções

Instalação de produção (sem devDependencies):

```powershell
cd "d:\agora vai\backend"
npm ci --omit=dev
```

Verificação de presença de `inflight` após instalação:

```powershell
npm ls inflight --all
```

CI: o workflow do GitHub Actions (`.github/workflows/snyk-code.yml`) foi atualizado para instalar com `--omit=dev` e falhar se `inflight` for encontrado nos pacotes instalados.

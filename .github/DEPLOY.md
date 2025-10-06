# Backend deploy (Render)

This repository contains a GitHub Actions workflow that can trigger a deploy on Render.

Required secrets:

- `RENDER_API_KEY` — your Render API key (add in Settings → Secrets → Actions).
- `RENDER_SERVICE_ID` — the service ID for the Render service you want to deploy.

How it runs:

- On `push` to `main`: triggers a deploy on Render (production).
- On `workflow_dispatch`: triggers a deploy.

Manual (local):

```powershell
#$env:RENDER_API_KEY = '<your-key>'
#curl -X POST "https://api.render.com/v1/services/<SERVICE_ID>/deploys" -H "Authorization: Bearer $env:RENDER_API_KEY" -H "Content-Type: application/json" -d '{}'
```
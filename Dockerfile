# Dockerfile para Render (Node 18+)
# Use apenas se quiser build customizado. Render já suporta Node direto.

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm", "run", "start"]

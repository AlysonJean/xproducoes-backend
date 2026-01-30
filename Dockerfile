# Stage 1: Builder
# Usando Node 20 Alpine para garantir compatibilidade e segurança (LTS)
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências completas (incluindo devDependencies para build)
COPY package*.json ./
# prisma gera cliente na postinstall
RUN npm ci

# Copiar código fonte e arquivos de configuração Prisma
COPY prisma ./prisma/
COPY tsconfig*.json ./
COPY src ./src/

# Gerar Prisma Client e Compilar TypeScript
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copiar package lock para instalação limpa
COPY package*.json ./

# Instalar APENAS dependências de produção
# --ignore-scripts previne execução arbitrária, mas precisamos do prisma generate.
# Então rodamos npm ci --omit=dev normalmente e depois geramos o client explicitamente.
RUN npm ci --omit=dev && npm cache clean --force

# Copiar Prisma Schema e gerar client
COPY --from=builder /app/prisma ./prisma
# Gera o cliente prisma para o ambiente de produção (necessário pois node_modules foi limpo)
RUN npx prisma generate

# Copiar código compilado
COPY --from=builder /app/dist ./dist

# Ajustar permissões
RUN chown -R nodejs:nodejs /app

# Switch para usuário não-root
USER nodejs

EXPOSE 4000

CMD ["node", "dist/index.js"]

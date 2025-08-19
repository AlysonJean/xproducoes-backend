## Multi-stage Dockerfile for production
# Builder stage: install deps (including dev), generate Prisma client and build TS
FROM node:20-alpine AS builder
WORKDIR /app

# Install build tools
COPY package*.json ./
RUN npm ci

# Copy source and generate Prisma client + build
COPY . .
RUN npx prisma generate
RUN npm run build

# Remove dev deps to keep final image small
RUN npm prune --production


## Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy production node_modules and built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "dist/index.js"]

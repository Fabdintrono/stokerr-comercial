FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --include=dev: Coolify inyecta NODE_ENV=production en el build, que si no haría
# que npm ci omita devDependencies (typescript, tailwind, prisma CLI) y rompa next build
RUN npm ci --include=dev

FROM node:20-alpine AS builder
WORKDIR /app
# openssl requerido para que Prisma detecte v3 y genere el engine correcto
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# openssl (libssl.so.3) requerido en runtime por el query engine de Prisma
RUN apk add --no-cache openssl libc6-compat
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["node", "server.js"]

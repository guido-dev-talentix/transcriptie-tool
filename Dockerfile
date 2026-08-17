# Debian-slim i.p.v. Alpine: Prisma heeft glibc + OpenSSL 3 nodig en levert
# daar de standaard query-engine voor (debian-openssl-3.0.x).

# Stage 1: dependencies
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# --ignore-scripts: postinstall draait `prisma generate`, maar het schema is hier
# nog niet gekopieerd; generate gebeurt in de build-stage.
RUN npm ci --ignore-scripts

# Stage 2: build
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* worden bij de build in de client-bundle gebakken en moeten dus
# als build-arg mee (docker-compose geeft ze door uit .env.production)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_BASE_URL
RUN npx prisma generate
RUN npm run build

# Stage 3: runner
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*
# Build-metadata voor /api/version (deploy-pipeline vergelijkt met main)
ARG GIT_SHA=unknown
ARG BUILT_AT=unknown
ENV GIT_SHA=$GIT_SHA
ENV BUILT_AT=$BUILT_AT
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Tijdelijke opslag voor uploads in stukken (zie src/lib/uploads.ts)
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
ENV UPLOAD_TMP_DIR=/app/uploads
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

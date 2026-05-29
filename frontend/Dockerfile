FROM node:24-slim AS deps

RUN apt-get update && apt-get install -y libc6-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./frontend/package.json ./frontend/package-lock.json ./

RUN npm install

FROM deps AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY ./frontend .
COPY ./packages/shared-types /packages/shared-types
COPY ./data/manifests /data/manifests

ARG STRAPI_URL
ARG NEXT_PUBLIC_SITE_URL
ARG STRAPI_TOKEN
ENV STRAPI_URL=$STRAPI_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV STRAPI_TOKEN=$STRAPI_TOKEN
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# TEMP DEBUG: confirm whether Railway passes build args (revert after one deploy)
RUN echo "BUILD_DEBUG STRAPI_URL=[${STRAPI_URL}]" && \
    echo "BUILD_DEBUG NEXT_PUBLIC_SITE_URL=[${NEXT_PUBLIC_SITE_URL}]" && \
    echo "BUILD_DEBUG STRAPI_TOKEN_LEN=[${#STRAPI_TOKEN}]"

RUN npm run build

FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

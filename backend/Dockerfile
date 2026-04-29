FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY patches ./patches

RUN npm ci

FROM deps AS build

COPY tsconfig.json ./
COPY config ./config
COPY src ./src
COPY database ./database

ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=deps /app/package.json ./
COPY --from=deps /app/patches ./patches
COPY config ./config
COPY src ./src
COPY database ./database
COPY favicon.png ./
COPY public/robots.txt ./public/

EXPOSE 1337

CMD ["npm", "run", "start"]

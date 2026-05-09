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
COPY tsconfig.json ./
COPY src ./src
COPY database ./database
COPY favicon.png ./
COPY public/robots.txt ./public/
RUN mkdir -p public/uploads

# Copy compiled config files so Strapi can load them (symlinks don't work with fs.isFile())
RUN mkdir -p config && cp -r dist/config/* config/

EXPOSE 1337

CMD ["npm", "run", "start"]

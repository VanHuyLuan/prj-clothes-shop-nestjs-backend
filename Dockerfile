FROM node:18-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma ./prisma

RUN npx prisma generate

COPY . .

RUN npm run build

RUN ls -la dist/src

RUN npm prune --production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:3000 || exit 1

CMD ["node", "dist/src/main.js"]

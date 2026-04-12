FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate

COPY . .

EXPOSE 3001
CMD ["npx", "tsx", "src/index.ts"]

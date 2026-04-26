FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.build.json ./
COPY src/ ./src/
RUN npx tsc --project tsconfig.build.json

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist/ ./dist/

EXPOSE 3300
CMD ["node", "dist/index.js"]

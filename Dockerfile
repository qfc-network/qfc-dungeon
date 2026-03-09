FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/contracts/deployment.json ./contracts/deployment.json
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 3240
CMD ["npx", "tsx", "server/index.ts"]

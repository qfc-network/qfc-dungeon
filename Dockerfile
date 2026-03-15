FROM node:22-slim AS builder
WORKDIR /app
COPY qfc-chain-sdk/ ./qfc-chain-sdk/
RUN cd qfc-chain-sdk && npm install && npm run build
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/contracts/deployment.json ./contracts/deployment.json
COPY qfc-chain-sdk/ ./qfc-chain-sdk/
RUN cd qfc-chain-sdk && npm install && npm run build
COPY package*.json ./
RUN npm install --omit=dev
EXPOSE 3240
CMD ["npx", "tsx", "server/index.ts"]

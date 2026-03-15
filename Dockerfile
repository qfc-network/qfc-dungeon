FROM node:22-alpine AS sdk
WORKDIR /sdk
COPY qfc-chain-sdk/package.json qfc-chain-sdk/tsconfig.json ./
COPY qfc-chain-sdk/src/ ./src/
RUN npm install && ./node_modules/.bin/tsc

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=sdk /sdk /app/qfc-chain-sdk
COPY package*.json ./
RUN sed -i 's|"file:../qfc-chain-sdk"|"file:./qfc-chain-sdk"|' package.json
RUN npm install
COPY . .
COPY --from=sdk /sdk /app/qfc-chain-sdk
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/contracts/deployment.json ./contracts/deployment.json
COPY --from=sdk /sdk /app/qfc-chain-sdk
COPY --from=builder /app/package*.json ./
RUN sed -i 's|"file:../qfc-chain-sdk"|"file:./qfc-chain-sdk"|' package.json && npm install --omit=dev
EXPOSE 3240
CMD ["node", "dist-server/index.js"]

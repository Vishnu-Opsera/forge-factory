FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser
COPY --from=builder /app/package*.json ./
RUN npm install --legacy-peer-deps --omit=dev
COPY --from=builder /app/server.js ./
COPY --from=builder /app/dist ./dist
USER 1001
EXPOSE 3001
CMD ["node", "server.js"]

# Backend: Node.js + Socket.IO server
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only (skips nodemon etc.).
COPY package*.json ./
RUN npm ci --omit=dev

# Application source.
COPY src ./src

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Container-level health check hits the app's /health endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "src/index.js"]

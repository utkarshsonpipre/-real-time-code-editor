# Single-service image: builds the React frontend and serves it from the
# Node + Socket.IO backend, so the whole app runs at one URL.
# Used by the Render single-service deployment (build context = repo root).

# --- Stage 1: build the frontend ---
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: backend that also serves the built frontend ---
FROM node:20-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src

# The backend serves ../../frontend/dist relative to backend/src,
# which resolves to /app/frontend/dist.
COPY --from=frontend /app/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

CMD ["node", "src/index.js"]

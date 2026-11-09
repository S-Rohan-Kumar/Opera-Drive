# Stage 1: Build Backend & Frontend
FROM node:20-alpine AS builder
WORKDIR /app

# Build backend
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build
RUN node -e "import('fs').then(fs => fs.copyFileSync('src/db/schema.sql', 'dist/db/schema.sql'))"

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Runtime with Redis and MinIO embedded
FROM node:20-alpine AS runner
WORKDIR /app

# Copy native Alpine MinIO binary directly from official image
COPY --from=alpine/minio:latest-release /usr/local/bin/minio /usr/local/bin/minio
RUN apk add --no-cache redis curl

ENV NODE_ENV=production
ENV MINIO_ROOT_USER=minioadmin
ENV MINIO_ROOT_PASSWORD=minioadmin

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend-dist
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["./start.sh"]

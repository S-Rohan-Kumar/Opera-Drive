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

# Install Redis, curl, and MinIO binary
RUN apk add --no-cache redis curl \
    && curl -O https://dl.min.io/server/minio/release/linux-amd64/minio \
    && chmod +x minio \
    && mv minio /usr/local/bin/

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
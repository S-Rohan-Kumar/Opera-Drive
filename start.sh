#!/bin/sh

echo "🚀 Booting Opera Drive All-In-One Container..."

# 1. Start Redis in background
echo "⚡ Starting internal Redis..."
redis-server --daemonize yes

# 2. Start MinIO in background
echo "🪣 Starting internal MinIO storage..."
mkdir -p /data/opera-drive-blobs
export MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
export MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"
minio server /data --address "127.0.0.1:9000" --console-address "127.0.0.1:9001" > /tmp/minio.log 2>&1 &

echo "⏳ Waiting for MinIO to initialize..."
for i in $(seq 1 10); do
  if curl -sf http://127.0.0.1:9000/minio/health/live >/dev/null 2>&1; then
    echo "✅ MinIO is ready and listening on 127.0.0.1:9000!"
    break
  fi
  sleep 1
done

if ! curl -sf http://127.0.0.1:9000/minio/health/live >/dev/null 2>&1; then
  echo "⚠️ MinIO failed to initialize. Displaying /tmp/minio.log:"
  cat /tmp/minio.log
fi

# 3. Start Fastify backend server (automatically runs migrations on startup)
echo "📡 Launching Opera Drive Server..."
node dist/index.js

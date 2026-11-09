#!/bin/sh

echo "🚀 Booting Opera Drive All-In-One Container..."

# 1. Start Redis in background
echo "⚡ Starting internal Redis..."
redis-server --daemonize yes

# 2. Start MinIO in background
echo "🪣 Starting internal MinIO storage..."
mkdir -p /data/opera-drive-blobs
minio server /data --address "127.0.0.1:9000" --console-address "127.0.0.1:9001" > /tmp/minio.log 2>&1 &

# 3. Wait 2 seconds for services to come online
sleep 2

# 4. Start Fastify backend server
echo "📡 Launching Opera Drive Server..."
node dist/index.js
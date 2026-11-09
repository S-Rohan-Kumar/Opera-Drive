# Opera Drive

Opera Drive is a full-stack cloud storage platform inspired by Google Drive, built for secure file management, collaboration, and scalable object storage. It combines a Fastify API, PostgreSQL metadata layer, MinIO object storage, Redis-powered background workers, and a React front end in a single, deployable solution.

## Highlights

- Cloud-style file and folder hierarchy with nested organization
- Secure authentication and JWT-based session management
- File uploads with multipart support and resumable session-based uploads
- Versioned file history with rollback support
- Shared access control with viewer/editor permissions
- Soft-delete workflow with trash recovery and cleanup workers
- Full-text and fuzzy file/folder search
- Live synchronization via WebSockets
- Storage quota tracking and usage monitoring
- Docker-ready deployment for local development and production

## Architecture

Opera Drive is structured as a modern storage application with a clear separation between metadata, storage, and presentation layers:

- Frontend: React + TypeScript + Vite
- Backend API: Fastify + TypeScript
- Metadata database: PostgreSQL
- Object storage: MinIO
- Cache / background coordination: Redis
- Real-time updates: Fastify WebSockets

## Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Lucide React icons

### Backend
- Node.js
- Fastify
- TypeScript
- PostgreSQL with pg
- Redis with ioredis
- MinIO SDK
- JWT authentication
- Zod validation
- BullMQ queues

### Infrastructure
- Docker
- Docker Compose
- nginx for production frontend serving

## Project Structure

```text
Opera Drive/
├── src/
│   ├── config/
│   ├── db/
│   ├── modules/
│   ├── queue/
│   ├── storage/
│   ├── index.ts
│   └── server.ts
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── test/
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Features

### File Management
- Upload files into a folder hierarchy
- Download files directly from the API
- Track file metadata, timestamps, and ownership
- Manage file deletions through soft-delete workflows
- Maintain immutable versions for historical snapshots

### Folder Management
- Create nested folders
- Navigate folder contents by parent relationship
- Search within folder structures
- Apply soft-delete semantics for content cleanup

### Sharing & Access Control
- Share files and folders with other users
- Enforce viewer/editor roles
- Restrict actions based on permissions

### Search & Discovery
- Search file names and folder names using trigram-based indexing
- Discover recent or relevant content quickly
- Improve UX for large storage repositories

### Resumable Uploads
- Track upload sessions and chunk metadata
- Assemble chunked uploads into final files
- Enforce session expiry and cleanup

### Background Processing
- Purge expired uploads
- Remove orphaned resources
- Cleanup soft-deleted content
- Keep storage consistent over time

### Real-Time Sync
- Broadcast user-specific events over WebSockets
- Refresh the UI when uploads, deletions, or version changes occur
- Support collaborative storage experiences

## Prerequisites

Before starting the project, make sure you have the following installed:

- Node.js 20+
- npm 10+
- Docker and Docker Compose
- PostgreSQL client tools (optional, for debugging)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/S-Rohan-Kumar/Opera-Drive.git
cd Opera-Drive
```

### 2. Install dependencies

```bash
npm install
npm --prefix frontend install
```

### 3. Start infrastructure services

The project includes a local Docker Compose setup for PostgreSQL, MinIO, and Redis:

```bash
docker compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- MinIO on `localhost:9000` and console `localhost:9001`
- Redis on `localhost:6379`

### 4. Configure environment variables

Create a `.env` file in the project root using the sample below:

```env
PORT=4000
HOST=0.0.0.0
NODE_ENV=development
DATABASE_URL=postgresql://operadrive:operadrive_secret@localhost:5432/operadrive_db
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=opera-drive-blobs
JWT_SECRET=change_this_to_a_strong_secret_key
JWT_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 5. Run database migrations

```bash
npm run migrate
```

### 6. Start the backend

```bash
npm run dev
```

The backend should start on:
- API: `http://localhost:4000`
- Health check: `http://localhost:4000/health`

### 7. Start the frontend

In a separate terminal:

```bash
npm --prefix frontend run dev
```

The frontend is typically available at:
- `http://localhost:5173`

## Production Deployment

A production-ready Compose setup is included in `docker-compose.prod.yml`.

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

This starts:
- PostgreSQL
- MinIO
- Redis
- Backend service on port `4000`
- Frontend service served via nginx on port `80`

## Available Scripts

### Root Project

```bash
npm run dev          # Start the backend in development mode
npm run build        # Compile TypeScript
npm run start        # Run the compiled backend
npm run migrate      # Run DB migrations and schema setup
npm test             # Run unit/integration tests
```

### Frontend

```bash
npm --prefix frontend run dev      # Start the Vite dev server
npm --prefix frontend run build    # Build the production frontend
npm --prefix frontend run preview  # Preview the built app
```

## API Overview

The backend exposes a structured REST API under `/api/v1`.

### Authentication
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/me/storage`

### Folders
- `POST /api/v1/folders`
- `GET /api/v1/folders/:id`
- `GET /api/v1/folders/root/contents`
- `GET /api/v1/folders/:id/contents`
- `DELETE /api/v1/folders/:id`

### Files
- `POST /api/v1/files/upload`
- `GET /api/v1/files/:id`
- `GET /api/v1/files/:id/download`
- `DELETE /api/v1/files/:id`
- `GET /api/v1/files/:id/versions`
- `POST /api/v1/files/:id/versions/:vId/rollback`

### Permissions
- Share and manage file/folder access permissions

### Search
- Search files and folders by name and metadata

### Sync
- `GET /api/v1/sync/ws` for realtime event streaming

### Trash
- Restore or permanently remove soft-deleted resources

## Testing

The repository includes integration and API tests under the `test/` directory.

```bash
npm test
```

These tests validate core file operations, folder behavior, permissions, resumable uploads, quota enforcement, and real-time sync flow.

## Security Considerations

This project is designed for learning, prototyping, and internal deployment scenarios. For production use, you should:

- replace default credentials and secrets
- enable secure TLS and reverse proxy termination
- restrict CORS to trusted origins
- enforce strong password policies
- apply infrastructure-level monitoring and backups
- review access control rules before exposing the app publicly

## License

This project is licensed under the ISC License.

## Contributing

Contributions are welcome. If you plan to improve the codebase, please:

1. Fork the repository
2. Create a feature branch
3. Add or update tests for changes
4. Submit a pull request with a clear summary

## Support

For setup help, runtime issues, or feature requests, open an issue on the repository or contact the project maintainers.

## Summary

Opera Drive is a complete, production-minded cloud storage MVP that demonstrates how a file-sharing platform can be built with modern backend tooling, object storage, and a responsive front end. It is suitable as a foundation for a SaaS file platform, internal document workspace, or further extension into collaborative enterprise storage.

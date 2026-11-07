import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.js';
import { pool } from '../src/db/client.js';
import { FastifyInstance } from 'fastify';

describe('Folder Management API Tests', () => {
  let app: FastifyInstance;
  let authToken: string;
  let rootFolderId: string;
  let subFolderId: string;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();

    // Register a test user
    const randomEmail = `test_${Date.now()}@example.com`;
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: randomEmail,
        password: 'password123',
        fullName: 'Folder Test User',
      },
    });

    const regData = JSON.parse(regRes.body);
    authToken = regData.data.token;
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('1. should reject unauthenticated request to /api/v1/folders', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/folders',
      payload: { name: 'Secret Folder' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('2. should create a root-level folder', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/folders',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: 'Documents' },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.folder.name).toBe('Documents');
    expect(body.data.folder.parent_id).toBeNull();
    rootFolderId = body.data.folder.id;
  });

  it('3. should reject duplicate folder name at root level with 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/folders',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: 'Documents' },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('FOLDER_NAME_CONFLICT');
  });

  it('4. should create a nested subfolder inside root folder', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/folders',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: 'Projects', parentId: rootFolderId },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.folder.name).toBe('Projects');
    expect(body.data.folder.parent_id).toBe(rootFolderId);
    subFolderId = body.data.folder.id;
  });

  it('5. should list contents of root folder', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/folders/root/contents',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    const names = body.data.folders.map((f: any) => f.name);
    expect(names).toContain('Documents');
  });

  it('6. should list contents of subfolder', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/folders/${rootFolderId}/contents`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const names = body.data.folders.map((f: any) => f.name);
    expect(names).toContain('Projects');
  });

  it('7. should prevent circular folder moves with 400', async () => {
    // Attempting to move Documents inside its own subfolder Projects
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/folders/${rootFolderId}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { parentId: subFolderId },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('CIRCULAR_FOLDER_MOVE');
  });

  it('8. should rename a folder', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/folders/${subFolderId}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: 'Active Projects' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.folder.name).toBe('Active Projects');
  });

  it('9. should soft-delete a folder and exclude it from listings', async () => {
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/folders/${subFolderId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(delRes.statusCode).toBe(204);

    // Verify it no longer appears in root's contents
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/folders/${rootFolderId}/contents`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = JSON.parse(listRes.body);
    const names = body.data.folders.map((f: any) => f.name);
    expect(names).not.toContain('Active Projects');
  });
});

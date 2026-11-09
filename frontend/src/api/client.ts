import type { FileVersion, Permission, SharedWithMeData } from '../types/index.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status: number = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('opera_drive_token');

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !(options.body instanceof Blob) && !(options.body instanceof ArrayBuffer) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const errorMsg = data.error?.message || 'An unexpected error occurred';
    const errorCode = data.error?.code || 'API_ERROR';
    throw new ApiError(errorMsg, errorCode, response.status);
  }

  return data.data !== undefined ? data.data : data;
}

export async function downloadFile(fileId: string, filename: string): Promise<void> {
  const token = localStorage.getItem('opera_drive_token');
  
  const response = await fetch(`${BASE_URL}/files/${fileId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to download file');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function downloadFileVersion(fileId: string, versionId: string, filename: string): Promise<void> {
  const token = localStorage.getItem('opera_drive_token');
  
  const response = await fetch(`${BASE_URL}/files/${fileId}/versions/${versionId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to download file version');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function calculateSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadResumableFile(
  file: File,
  parentId: string | null,
  onProgress?: (progress: number, currentChunk: number, totalChunks: number) => void,
  fileId?: string | null
): Promise<any> {
  const sha256 = await calculateSha256(file);
  const chunkSize = 5 * 1024 * 1024;
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

  const initData = await apiRequest<{ session: { id: string } }>('/files/resumable/initiate', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      expectedSizeBytes: file.size,
      expectedSha256: sha256,
      parentId: parentId || null,
      fileId: fileId || null,
    }),
  });

  const sessionId = initData.session.id;

  for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
    const start = (partNumber - 1) * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    await apiRequest(`/files/resumable/${sessionId}/parts/${partNumber}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: chunk,
    });

    if (onProgress) {
      const progress = Math.round((partNumber / totalChunks) * 100);
      onProgress(progress, partNumber, totalChunks);
    }
  }

  return await apiRequest(`/files/resumable/${sessionId}/complete`, {
    method: 'POST',
  });
}

export async function listFileVersions(fileId: string): Promise<{ file: any; versions: FileVersion[] }> {
  return await apiRequest<{ file: any; versions: FileVersion[] }>(`/files/${fileId}/versions`);
}

export async function rollbackFileVersion(fileId: string, versionId: string): Promise<any> {
  return await apiRequest(`/files/${fileId}/versions/${versionId}/rollback`, {
    method: 'POST',
  });
}

export async function shareResource(
  resourceType: 'file' | 'folder',
  resourceId: string,
  email: string,
  role: 'viewer' | 'editor'
): Promise<any> {
  return await apiRequest('/permissions/share', {
    method: 'POST',
    body: JSON.stringify({ resourceType, resourceId, email, role }),
  });
}

export async function getSharedWithMe(): Promise<SharedWithMeData> {
  return await apiRequest<SharedWithMeData>('/permissions/shared-with-me');
}

export async function listResourcePermissions(
  resourceType: 'file' | 'folder',
  resourceId: string
): Promise<Permission[]> {
  const data = await apiRequest<{ permissions: Permission[] }>(`/permissions/${resourceType}/${resourceId}`);
  return data.permissions;
}

export async function revokeResourcePermission(permissionId: string): Promise<void> {
  await apiRequest(`/permissions/${permissionId}`, {
    method: 'DELETE',
  });
}

export interface StorageUsageData {
  quotaBytes: number;
  usedBytes: number;
  usagePercentage: number;
}

export async function getStorageUsage(): Promise<StorageUsageData> {
  return await apiRequest<StorageUsageData>('/auth/me/storage');
}


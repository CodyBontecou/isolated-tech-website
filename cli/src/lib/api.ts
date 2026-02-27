import { API_URL, getToken } from './config.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface App {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  icon_url?: string;
  platforms: string;
  is_published: boolean;
}

export interface Version {
  id: string;
  app_id: string;
  version: string;
  build_number: number;
  release_notes?: string;
  min_os_version?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface DeviceAuthInit {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
}

export interface DeviceAuthPoll {
  status: 'pending' | 'complete' | 'expired';
  token?: string;
  user?: User;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: { requireAuth?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.requireAuth !== false) {
      const token = getToken();
      if (token) {
        headers['X-API-Key'] = token;
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json() as T & { error?: string };

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          message: data.error || response.statusText,
        };
      }

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: 'network_error', message };
    }
  }

  // Auth endpoints
  async initiateDeviceAuth(): Promise<ApiResponse<DeviceAuthInit>> {
    return this.request('POST', '/api/cli/auth/initiate', {}, { requireAuth: false });
  }

  async pollDeviceAuth(deviceCode: string, userCode: string): Promise<ApiResponse<DeviceAuthPoll>> {
    return this.request('POST', '/api/cli/auth/verify', { deviceCode, userCode }, { requireAuth: false });
  }

  async whoami(): Promise<ApiResponse<User>> {
    return this.request('GET', '/api/cli/whoami');
  }

  // App endpoints
  async listApps(): Promise<ApiResponse<App[]>> {
    return this.request('GET', '/api/cli/apps');
  }

  async getApp(slug: string): Promise<ApiResponse<App>> {
    return this.request('GET', `/api/cli/apps/${slug}`);
  }

  async registerApp(data: {
    bundleId: string;
    name: string;
    slug?: string;
  }): Promise<ApiResponse<App>> {
    return this.request('POST', '/api/cli/apps', data);
  }

  // Version endpoints
  async listVersions(appSlug: string): Promise<ApiResponse<Version[]>> {
    return this.request('GET', `/api/cli/apps/${appSlug}/versions`);
  }

  async createVersion(appSlug: string, data: {
    version: string;
    buildNumber: number;
    releaseNotes?: string;
    minOsVersion?: string;
    fileSize: number;
    signature: string;
  }): Promise<ApiResponse<Version>> {
    return this.request('POST', `/api/cli/apps/${appSlug}/versions`, data);
  }

  async getPresignedUploadUrl(appSlug: string, version: string, filename: string): Promise<ApiResponse<{
    uploadUrl: string;
    r2Key: string;
    appId: string;
  }>> {
    return this.request('POST', `/api/cli/apps/${appSlug}/versions/presign`, {
      version,
      filename,
    });
  }

  async uploadFile(appSlug: string, r2Key: string, file: ArrayBuffer, filename: string): Promise<ApiResponse<{
    r2Key: string;
    size: number;
  }>> {
    const url = `${this.baseUrl}/api/cli/apps/${appSlug}/versions/upload`;
    const token = getToken();
    
    // Create form data
    const formData = new FormData();
    formData.append('file', new Blob([file]), filename);
    formData.append('r2Key', r2Key);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token && { 'X-API-Key': token }),
        },
        body: formData,
      });
      
      const data = await response.json() as { r2Key?: string; size?: number; error?: string };
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          message: data.error || response.statusText,
        };
      }
      
      return { success: true, data: data as { r2Key: string; size: number } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: 'network_error', message };
    }
  }

  async confirmUpload(appSlug: string, data: {
    version: string;
    buildNumber: number;
    r2Key: string;
    fileSize: number;
    signature: string;
    releaseNotes?: string;
    minOsVersion?: string;
  }): Promise<ApiResponse<Version>> {
    return this.request('POST', `/api/cli/apps/${appSlug}/versions/confirm`, data);
  }

  // Media endpoints
  async uploadMedia(
    appId: string,
    filePath: string,
    title: string,
    sortOrder: number = 0
  ): Promise<ApiResponse<{ id: string; url: string }>> {
    const url = `${this.baseUrl}/api/cli/apps/${appId}/media`;
    const token = getToken();
    
    // Read file
    const fs = await import('fs');
    const path = await import('path');
    const fileBuffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), filename);
    formData.append('title', title);
    formData.append('type', 'image');
    formData.append('sort_order', sortOrder.toString());
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token && { 'X-API-Key': token }),
        },
        body: formData,
      });
      
      const data = await response.json() as { id?: string; url?: string; error?: string };
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          message: data.error || response.statusText,
        };
      }
      
      return { success: true, data: data as { id: string; url: string } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: 'network_error', message };
    }
  }
}

export const api = new ApiClient();
export { ApiClient };

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
  github_url?: string | null;
  custom_page_config?: string | null;
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

export interface BlogPost {
  id: string;
  app_id: string;
  app_slug?: string;
  app_name?: string;
  slug: string;
  title: string;
  excerpt?: string;
  body: string;
  cover_image_url?: string;
  author_name?: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBlogPostData {
  appSlug: string;
  title: string;
  slug?: string;
  excerpt?: string;
  body: string;
  coverImageUrl?: string;
  authorName?: string;
  isPublished?: boolean;
  publishedAt?: string;
}

export interface UpdateBlogPostData {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  coverImageUrl?: string;
  authorName?: string;
  isPublished?: boolean;
  publishedAt?: string;
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

  async updateApp(slug: string, data: {
    name?: string;
    tagline?: string;
    description?: string;
    is_published?: boolean;
    platforms?: string[];
    privacy_policy?: string;
    terms_of_service?: string;
    page_config?: Record<string, unknown> | null;
    github_url?: string | null;
  }): Promise<ApiResponse<App>> {
    return this.request('PATCH', `/api/cli/apps/${slug}`, data);
  }

  async uploadIcon(slug: string, filePath: string): Promise<ApiResponse<{ icon_url: string; size: number }>> {
    const url = `${this.baseUrl}/api/cli/apps/${slug}/icon`;
    const token = getToken();
    
    // Read file
    const fs = await import('fs');
    const path = await import('path');
    const fileBuffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    
    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };
    const contentType = contentTypes[ext] || 'image/png';
    
    // Create form data
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer], { type: contentType }), filename);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token && { 'X-API-Key': token }),
        },
        body: formData,
      });
      
      const data = await response.json() as { icon_url?: string; size?: number; error?: string };
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          message: data.error || response.statusText,
        };
      }
      
      return { success: true, data: data as { icon_url: string; size: number } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: 'network_error', message };
    }
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

  async updateVersion(appSlug: string, version: string, data: {
    releaseNotes: string;
  }): Promise<ApiResponse<Version>> {
    return this.request('PATCH', `/api/cli/apps/${appSlug}/versions/${version}`, data);
  }

  // Media endpoints
  async uploadMedia(
    slug: string,
    filePath: string,
    title: string,
    sortOrder: number = 0
  ): Promise<ApiResponse<{ id: string; url: string; title: string | null; sort_order: number; size: number }>> {
    const url = `${this.baseUrl}/api/cli/apps/${slug}/media`;
    const token = getToken();

    const fs = await import('fs');
    const path = await import('path');
    const fileBuffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };
    const contentType = contentTypes[ext] || 'image/png';

    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer], { type: contentType }), filename);
    if (title) formData.append('title', title);
    formData.append('sort_order', sortOrder.toString());

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token && { 'X-API-Key': token }),
        },
        body: formData,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: 'network_error', message };
    }

    // Parse body once as text, then attempt JSON. Servers that return HTML 404s
    // would otherwise blow up response.json() and look like a network error.
    const bodyText = await response.text();
    let parsed: { id?: string; url?: string; error?: string; title?: string | null; sort_order?: number; size?: number } = {};
    try {
      parsed = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      // Non-JSON body — fall through with parsed = {}
    }

    if (!response.ok) {
      return {
        success: false,
        error: parsed.error || `HTTP ${response.status}`,
        message: parsed.error || `${response.status} ${response.statusText}`.trim(),
      };
    }

    return { success: true, data: parsed as { id: string; url: string; title: string | null; sort_order: number; size: number } };
  }

  // Blog endpoints
  async listBlogPosts(appSlug?: string): Promise<ApiResponse<BlogPost[]>> {
    const path = appSlug ? `/api/cli/blog?app=${appSlug}` : '/api/cli/blog';
    return this.request('GET', path);
  }

  async getBlogPost(id: string): Promise<ApiResponse<BlogPost>> {
    return this.request('GET', `/api/cli/blog/${id}`);
  }

  async createBlogPost(data: CreateBlogPostData): Promise<ApiResponse<BlogPost>> {
    return this.request('POST', '/api/cli/blog', data);
  }

  async updateBlogPost(id: string, data: UpdateBlogPostData): Promise<ApiResponse<BlogPost>> {
    return this.request('PATCH', `/api/cli/blog/${id}`, data);
  }

  async deleteBlogPost(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request('DELETE', `/api/cli/blog/${id}`);
  }

  async publishBlogPost(id: string): Promise<ApiResponse<BlogPost>> {
    return this.request('POST', `/api/cli/blog/${id}/publish`);
  }

  async unpublishBlogPost(id: string): Promise<ApiResponse<BlogPost>> {
    return this.request('POST', `/api/cli/blog/${id}/unpublish`);
  }
}

export const api = new ApiClient();
export { ApiClient };

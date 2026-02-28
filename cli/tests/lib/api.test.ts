import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockFetch, createMockFS, mockEnv, fixtures } from '../mocks/index.js';

// Mock fs for config module
const mockFS = createMockFS();
vi.mock('fs', () => ({
  readFileSync: mockFS.readFileSync,
  writeFileSync: mockFS.writeFileSync,
  mkdirSync: mockFS.mkdirSync,
  existsSync: mockFS.existsSync,
}));

vi.mock('os', () => ({
  homedir: () => '/home/testuser',
}));

// Mock fetch
const mockFetchHelper = createMockFetch();
const originalFetch = global.fetch;

describe('ApiClient', () => {
  let restoreEnv: () => void;
  
  beforeEach(() => {
    vi.resetModules();
    mockFS.reset();
    mockFetchHelper.reset();
    global.fetch = mockFetchHelper.fetch;
    restoreEnv = mockEnv({
      ISOLATED_API_URL: 'https://test.isolated.tech',
      ISOLATED_API_KEY: undefined,
    });
  });
  
  afterEach(() => {
    global.fetch = originalFetch;
    restoreEnv();
  });

  describe('request', () => {
    it('should make GET requests', async () => {
      mockFetchHelper.addResponse(200, { id: 'user_123', email: 'test@example.com' });
      
      const { api } = await import('../../src/lib/api.js');
      const response = await api.whoami();
      
      expect(response.success).toBe(true);
      expect(response.data?.email).toBe('test@example.com');
      expect(mockFetchHelper.calls[0].options.method).toBe('GET');
    });

    it('should make POST requests with body', async () => {
      mockFetchHelper.addResponse(200, { deviceCode: 'abc', userCode: '123456' });
      
      const { api } = await import('../../src/lib/api.js');
      const response = await api.initiateDeviceAuth();
      
      expect(response.success).toBe(true);
      expect(mockFetchHelper.calls[0].options.method).toBe('POST');
    });

    it('should include API key header when authenticated', async () => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'my_api_key_123',
      }));
      mockFetchHelper.addResponse(200, fixtures.user);
      
      const { api } = await import('../../src/lib/api.js');
      await api.whoami();
      
      const headers = mockFetchHelper.calls[0].options.headers as Record<string, string>;
      expect(headers['X-API-Key']).toBe('my_api_key_123');
    });

    it('should handle HTTP errors', async () => {
      mockFetchHelper.addResponse(401, { error: 'Unauthorized' });
      
      const { api } = await import('../../src/lib/api.js');
      const response = await api.whoami();
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('Unauthorized');
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));
      
      const { api } = await import('../../src/lib/api.js');
      const response = await api.whoami();
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('network_error');
      expect(response.message).toBe('Network failure');
    });
  });

  describe('Auth endpoints', () => {
    describe('initiateDeviceAuth', () => {
      it('should return device code and user code', async () => {
        mockFetchHelper.addResponse(200, {
          deviceCode: 'device_abc123',
          userCode: 'ABCD-1234',
          verificationUrl: 'https://isolated.tech/auth/device',
          expiresIn: 300,
        });
        
        const { api } = await import('../../src/lib/api.js');
        const response = await api.initiateDeviceAuth();
        
        expect(response.success).toBe(true);
        expect(response.data?.deviceCode).toBe('device_abc123');
        expect(response.data?.userCode).toBe('ABCD-1234');
        expect(response.data?.verificationUrl).toBe('https://isolated.tech/auth/device');
      });

      it('should not require auth', async () => {
        mockFetchHelper.addResponse(200, { deviceCode: 'abc', userCode: '123' });
        
        const { api } = await import('../../src/lib/api.js');
        await api.initiateDeviceAuth();
        
        const headers = mockFetchHelper.calls[0].options.headers as Record<string, string>;
        expect(headers['X-API-Key']).toBeUndefined();
      });
    });

    describe('pollDeviceAuth', () => {
      it('should poll with device and user codes', async () => {
        mockFetchHelper.addResponse(200, {
          status: 'pending',
        });
        
        const { api } = await import('../../src/lib/api.js');
        const response = await api.pollDeviceAuth('device_abc', 'ABCD-1234');
        
        expect(response.success).toBe(true);
        expect(response.data?.status).toBe('pending');
        
        const body = JSON.parse(mockFetchHelper.calls[0].options.body as string);
        expect(body.deviceCode).toBe('device_abc');
        expect(body.userCode).toBe('ABCD-1234');
      });

      it('should return complete with token', async () => {
        mockFetchHelper.addResponse(200, {
          status: 'complete',
          token: 'new_auth_token',
          user: fixtures.user,
        });
        
        const { api } = await import('../../src/lib/api.js');
        const response = await api.pollDeviceAuth('device_abc', 'ABCD-1234');
        
        expect(response.data?.status).toBe('complete');
        expect(response.data?.token).toBe('new_auth_token');
        expect(response.data?.user?.email).toBe('test@example.com');
      });
    });
  });

  describe('App endpoints', () => {
    beforeEach(() => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'test_api_key',
      }));
    });

    describe('listApps', () => {
      it('should return list of apps', async () => {
        mockFetchHelper.addResponse(200, [fixtures.app]);
        
        const { api } = await import('../../src/lib/api.js');
        const response = await api.listApps();
        
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(1);
        expect(response.data?.[0].slug).toBe('my-app');
      });
    });

    describe('getApp', () => {
      it('should return app by slug', async () => {
        mockFetchHelper.addResponse(200, fixtures.app);
        
        const { api } = await import('../../src/lib/api.js');
        const response = await api.getApp('my-app');
        
        expect(response.success).toBe(true);
        expect(response.data?.name).toBe('My App');
        expect(mockFetchHelper.calls[0].url).toContain('/api/cli/apps/my-app');
      });

      it('should handle not found', async () => {
        mockFetchHelper.addResponse(404, { error: 'App not found' });
        
        const { api } = await import('../../src/lib/api.js');
        const response = await api.getApp('nonexistent');
        
        expect(response.success).toBe(false);
        expect(response.error).toBe('App not found');
      });
    });

    describe('registerApp', () => {
      it('should create new app', async () => {
        mockFetchHelper.addResponse(201, {
          ...fixtures.app,
          id: 'new_app_id',
        });
        
        const { api } = await import('../../src/lib/api.js');
        const response = await api.registerApp({
          bundleId: 'com.example.NewApp',
          name: 'New App',
          slug: 'new-app',
        });
        
        expect(response.success).toBe(true);
        expect(response.data?.id).toBe('new_app_id');
        
        const body = JSON.parse(mockFetchHelper.calls[0].options.body as string);
        expect(body.bundleId).toBe('com.example.NewApp');
        expect(body.name).toBe('New App');
      });
    });
  });

  describe('Version endpoints', () => {
    beforeEach(() => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'test_api_key',
      }));
    });

    describe('listVersions', () => {
      it('should return versions for app', async () => {
        mockFetchHelper.addResponse(200, [
          { id: 'v1', version: '1.0.0', build_number: 1 },
          { id: 'v2', version: '1.1.0', build_number: 2 },
        ]);
        
        const { api } = await import('../../src/lib/api.js');
        const response = await api.listVersions('my-app');
        
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(2);
        expect(mockFetchHelper.calls[0].url).toContain('/api/cli/apps/my-app/versions');
      });
    });

    describe('getPresignedUploadUrl', () => {
      it('should return upload URL and R2 key', async () => {
        mockFetchHelper.addResponse(200, {
          uploadUrl: 'https://r2.example.com/upload',
          r2Key: 'apps/my-app/1.0.0/MyApp.zip',
          appId: 'app_123',
        });
        
        const { api } = await import('../../src/lib/api.js');
        const response = await api.getPresignedUploadUrl('my-app', '1.0.0', 'MyApp.zip');
        
        expect(response.success).toBe(true);
        expect(response.data?.r2Key).toBe('apps/my-app/1.0.0/MyApp.zip');
        expect(response.data?.appId).toBe('app_123');
      });
    });

    describe('confirmUpload', () => {
      it('should create version after upload', async () => {
        mockFetchHelper.addResponse(201, {
          id: 'version_123',
          version: '1.0.0',
          build_number: 42,
        });
        
        const { api } = await import('../../src/lib/api.js');
        const response = await api.confirmUpload('my-app', {
          version: '1.0.0',
          buildNumber: 42,
          r2Key: 'apps/my-app/1.0.0/MyApp.zip',
          fileSize: 10485760,
          signature: 'base64signature==',
          releaseNotes: 'New features',
          minOsVersion: '14.0',
        });
        
        expect(response.success).toBe(true);
        expect(response.data?.version).toBe('1.0.0');
        
        const body = JSON.parse(mockFetchHelper.calls[0].options.body as string);
        expect(body.version).toBe('1.0.0');
        expect(body.buildNumber).toBe(42);
        expect(body.signature).toBe('base64signature==');
      });
    });
  });

  describe('URL construction', () => {
    it('should use API_URL from environment', async () => {
      mockFetchHelper.addResponse(200, {});
      
      const { api } = await import('../../src/lib/api.js');
      await api.whoami();
      
      expect(mockFetchHelper.calls[0].url).toStartWith('https://test.isolated.tech');
    });

    it('should construct correct paths', async () => {
      mockFetchHelper.addResponse(200, {});
      
      const { api } = await import('../../src/lib/api.js');
      await api.getApp('test-app');
      
      expect(mockFetchHelper.calls[0].url).toBe('https://test.isolated.tech/api/cli/apps/test-app');
    });
  });
});

// Custom matcher
expect.extend({
  toStartWith(received: string, expected: string) {
    const pass = received.startsWith(expected);
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to start with ${expected}`
        : `expected ${received} to start with ${expected}`,
    };
  },
});

declare module 'vitest' {
  interface Assertion<T = any> {
    toStartWith(expected: string): T;
  }
}

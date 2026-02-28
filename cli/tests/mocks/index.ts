import { vi } from 'vitest';

/**
 * Mock fetch for API tests
 */
export function createMockFetch() {
  const calls: Array<{ url: string; options: RequestInit }> = [];
  const responses: Array<{ status: number; body: unknown }> = [];
  
  const mockFetch = vi.fn(async (url: string, options: RequestInit = {}) => {
    calls.push({ url, options });
    
    const response = responses.shift() || { status: 404, body: { error: 'Not configured' } };
    
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: getStatusText(response.status),
      json: async () => response.body,
      text: async () => JSON.stringify(response.body),
    } as Response;
  });
  
  return {
    fetch: mockFetch,
    calls,
    addResponse: (status: number, body: unknown) => {
      responses.push({ status, body });
    },
    reset: () => {
      calls.length = 0;
      responses.length = 0;
      mockFetch.mockClear();
    },
  };
}

function getStatusText(status: number): string {
  const texts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
  };
  return texts[status] || 'Unknown';
}

/**
 * Mock filesystem for config tests
 */
export function createMockFS() {
  const files: Map<string, string> = new Map();
  const dirs: Set<string> = new Set();
  
  return {
    files,
    dirs,
    
    existsSync: vi.fn((path: string) => files.has(path) || dirs.has(path)),
    
    readFileSync: vi.fn((path: string, encoding?: string) => {
      if (!files.has(path)) {
        const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
        (error as any).code = 'ENOENT';
        throw error;
      }
      return files.get(path)!;
    }),
    
    writeFileSync: vi.fn((path: string, data: string, options?: any) => {
      files.set(path, data);
    }),
    
    mkdirSync: vi.fn((path: string, options?: any) => {
      dirs.add(path);
    }),
    
    readdirSync: vi.fn((path: string) => {
      const result: string[] = [];
      for (const [filePath] of files) {
        if (filePath.startsWith(path + '/')) {
          const relative = filePath.slice(path.length + 1);
          const firstPart = relative.split('/')[0];
          if (!result.includes(firstPart)) {
            result.push(firstPart);
          }
        }
      }
      return result;
    }),
    
    statSync: vi.fn((path: string) => {
      if (!files.has(path)) {
        const error = new Error(`ENOENT: no such file or directory, stat '${path}'`);
        (error as any).code = 'ENOENT';
        throw error;
      }
      return {
        size: files.get(path)!.length,
        mtime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
      };
    }),
    
    reset: () => {
      files.clear();
      dirs.clear();
    },
    
    setFile: (path: string, content: string) => {
      files.set(path, content);
    },
  };
}

/**
 * Mock child_process for Xcode/Sparkle tests
 */
export function createMockExec() {
  const commands: Map<string, string | Error> = new Map();
  const calls: string[] = [];
  
  return {
    commands,
    calls,
    
    execSync: vi.fn((command: string, options?: any) => {
      calls.push(command);
      
      for (const [pattern, result] of commands) {
        if (command.includes(pattern)) {
          if (result instanceof Error) throw result;
          return result;
        }
      }
      
      // Default: throw error
      const error = new Error(`Command not mocked: ${command}`);
      (error as any).status = 1;
      throw error;
    }),
    
    setOutput: (pattern: string, output: string) => {
      commands.set(pattern, output);
    },
    
    setError: (pattern: string, error?: Error) => {
      commands.set(pattern, error || new Error(`Command failed: ${pattern}`));
    },
    
    reset: () => {
      commands.clear();
      calls.length = 0;
    },
  };
}

/**
 * Mock environment variables
 */
export function mockEnv(vars: Record<string, string | undefined>) {
  const original: Record<string, string | undefined> = {};
  
  for (const [key, value] of Object.entries(vars)) {
    original[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  
  return () => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

/**
 * Test fixtures
 */
export const fixtures = {
  xcodeProject: {
    path: '/test/project/MyApp.xcodeproj',
    name: 'MyApp',
    type: 'xcodeproj' as const,
    schemes: ['MyApp'],
    bundleId: 'com.example.MyApp',
    marketingVersion: '1.2.3',
    buildNumber: '42',
  },
  
  user: {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
  },
  
  app: {
    id: 'app_123',
    slug: 'my-app',
    name: 'My App',
    tagline: 'A test app',
    platforms: 'macos',
    is_published: true,
  },
  
  credentials: {
    token: 'test_token_abc123',
    userId: 'user_123',
    email: 'test@example.com',
  },
  
  pbxprojContent: `
// !$*UTF8*$!
{
  archiveVersion = 1;
  buildConfigurationList = ABC123;
  compatibilityVersion = "Xcode 14.0";
  developmentRegion = en;
  buildSettings = {
    MARKETING_VERSION = 1.2.3;
    CURRENT_PROJECT_VERSION = 42;
    PRODUCT_BUNDLE_IDENTIFIER = com.example.MyApp;
  };
}
`,
};

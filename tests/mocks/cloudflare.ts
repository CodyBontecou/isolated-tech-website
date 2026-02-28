/**
 * Mock Cloudflare services for testing
 * Provides in-memory implementations of D1, R2, and KV
 */

import { vi } from "vitest";

// ============================================================================
// D1 Database Mock
// ============================================================================

type D1Row = Record<string, unknown>;

export interface MockD1State {
  tables: Map<string, D1Row[]>;
}

export function createMockD1(initialState?: MockD1State): D1Database {
  const state: MockD1State = initialState || { tables: new Map() };

  // Helper to parse simple SQL and return results
  function executeQuery(
    sql: string,
    params: unknown[]
  ): { rows: D1Row[]; changes: number } {
    const sqlLower = sql.toLowerCase().trim();
    let paramIndex = 0;
    const getParam = () => params[paramIndex++];

    // SELECT queries
    if (sqlLower.startsWith("select")) {
      // Handle multiple possible table names
      const tableMatch = sql.match(/from\s+["']?(\w+)["']?/i);
      if (!tableMatch) return { rows: [], changes: 0 };

      const tableName = tableMatch[1].toLowerCase();
      let rows = [...(state.tables.get(tableName) || [])];

      // WHERE clause - extract all conditions
      const whereMatch = sql.match(/where\s+(.+?)(?:\s+order|\s+group|\s+limit|$)/i);
      if (whereMatch) {
        const conditions = whereMatch[1];
        
        // Find all column = ? patterns
        const columnMatches = [...conditions.matchAll(/(\w+)\s*=\s*\?/g)];
        
        rows = rows.filter((row) => {
          for (let i = 0; i < columnMatches.length; i++) {
            const col = columnMatches[i][1];
            const val = params[i];
            if (row[col] !== val) return false;
          }
          return true;
        });
      }

      return { rows, changes: 0 };
    }

    // INSERT queries
    if (sqlLower.startsWith("insert")) {
      const tableMatch = sql.match(/into\s+["']?(\w+)["']?/i);
      if (!tableMatch) return { rows: [], changes: 0 };

      const tableName = tableMatch[1].toLowerCase();
      const columnsMatch = sql.match(/\(([^)]+)\)\s*values/i);
      if (!columnsMatch) return { rows: [], changes: 0 };

      const columns = columnsMatch[1].split(",").map((c) => c.trim());
      const row: D1Row = {};
      for (const col of columns) {
        row[col] = getParam();
      }

      if (!state.tables.has(tableName)) {
        state.tables.set(tableName, []);
      }
      state.tables.get(tableName)!.push(row);

      return { rows: [], changes: 1 };
    }

    // UPDATE queries
    if (sqlLower.startsWith("update")) {
      const tableMatch = sql.match(/update\s+["']?(\w+)["']?/i);
      if (!tableMatch) return { rows: [], changes: 0 };

      const tableName = tableMatch[1].toLowerCase();
      const rows = state.tables.get(tableName) || [];

      // Find rows to update based on WHERE
      const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);
      const setMatch = sql.match(/set\s+(\w+)\s*=\s*(\w+\s*\+\s*\d+|\?|[^,\s]+)/i);

      let changes = 0;
      if (whereMatch && setMatch) {
        const whereCol = whereMatch[1];
        const setCol = setMatch[1];
        let setValue = setMatch[2];

        // Handle increment syntax (e.g., times_used = times_used + 1)
        const incrementMatch = setValue.match(/(\w+)\s*\+\s*(\d+)/);

        rows.forEach((row) => {
          const whereVal = params[params.length - 1]; // WHERE param is last
          if (row[whereCol] === whereVal) {
            if (incrementMatch) {
              const currentVal = (row[incrementMatch[1]] as number) || 0;
              row[setCol] = currentVal + parseInt(incrementMatch[2]);
            } else if (setValue === "?") {
              row[setCol] = getParam();
            } else {
              row[setCol] = setValue;
            }
            changes++;
          }
        });
      }

      return { rows: [], changes };
    }

    return { rows: [], changes: 0 };
  }

  const mockDb: D1Database = {
    prepare: vi.fn((sql: string) => {
      let boundParams: unknown[] = [];

      const stmt = {
        bind: vi.fn((...params: unknown[]) => {
          boundParams = params;
          return stmt;
        }),
        first: vi.fn(async <T>(): Promise<T | null> => {
          const result = executeQuery(sql, boundParams);
          return (result.rows[0] as T) || null;
        }),
        all: vi.fn(async <T>(): Promise<D1Result<T>> => {
          const result = executeQuery(sql, boundParams);
          return {
            results: result.rows as T[],
            success: true,
            meta: { duration: 0, changes: result.changes },
          } as D1Result<T>;
        }),
        run: vi.fn(async (): Promise<D1Result> => {
          const result = executeQuery(sql, boundParams);
          return {
            results: [],
            success: true,
            meta: { duration: 0, changes: result.changes },
          };
        }),
        raw: vi.fn(),
      };

      return stmt;
    }),
    batch: vi.fn(),
    dump: vi.fn(),
    exec: vi.fn(),
  };

  return mockDb;
}

// ============================================================================
// R2 Bucket Mock
// ============================================================================

export interface MockR2State {
  objects: Map<string, { body: Uint8Array; metadata?: Record<string, string> }>;
}

export function createMockR2(initialState?: MockR2State): R2Bucket {
  const state: MockR2State = initialState || { objects: new Map() };

  return {
    get: vi.fn(async (key: string) => {
      const obj = state.objects.get(key);
      if (!obj) return null;

      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(obj.body);
            controller.close();
          },
        }),
        size: obj.body.length,
        httpMetadata: { contentType: "application/zip" },
        key,
        version: "1",
        etag: "mock-etag",
        uploaded: new Date(),
      } as R2ObjectBody;
    }),
    put: vi.fn(async (key: string, value: ReadableStream | ArrayBuffer | string) => {
      let body: Uint8Array;
      if (value instanceof ArrayBuffer) {
        body = new Uint8Array(value);
      } else if (typeof value === "string") {
        body = new TextEncoder().encode(value);
      } else {
        const reader = value.getReader();
        const chunks: Uint8Array[] = [];
        let done = false;
        while (!done) {
          const result = await reader.read();
          done = result.done;
          if (result.value) chunks.push(result.value);
        }
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        body = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          body.set(chunk, offset);
          offset += chunk.length;
        }
      }
      state.objects.set(key, { body });
      return { key, version: "1", etag: "mock-etag" } as R2Object;
    }),
    delete: vi.fn(async (key: string) => {
      state.objects.delete(key);
    }),
    head: vi.fn(),
    list: vi.fn(),
    createMultipartUpload: vi.fn(),
    resumeMultipartUpload: vi.fn(),
  } as unknown as R2Bucket;
}

// ============================================================================
// KV Namespace Mock
// ============================================================================

export interface MockKVState {
  data: Map<string, { value: string; metadata?: Record<string, unknown> }>;
}

export function createMockKV(initialState?: MockKVState): KVNamespace {
  const state: MockKVState = initialState || { data: new Map() };

  return {
    get: vi.fn(async (key: string, options?: { type?: string }) => {
      const entry = state.data.get(key);
      if (!entry) return null;
      if (options?.type === "json") {
        return JSON.parse(entry.value);
      }
      return entry.value;
    }),
    put: vi.fn(async (key: string, value: string, options?: { metadata?: Record<string, unknown> }) => {
      state.data.set(key, { value, metadata: options?.metadata });
    }),
    delete: vi.fn(async (key: string) => {
      state.data.delete(key);
    }),
    list: vi.fn(),
    getWithMetadata: vi.fn(async (key: string) => {
      const entry = state.data.get(key);
      if (!entry) return { value: null, metadata: null };
      return { value: entry.value, metadata: entry.metadata || null };
    }),
  } as unknown as KVNamespace;
}

// ============================================================================
// Complete Env Mock
// ============================================================================

export interface MockEnv {
  DB: D1Database;
  APPS_BUCKET: R2Bucket;
  AUTH_KV: KVNamespace;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}

export function createMockEnv(options?: {
  d1State?: MockD1State;
  r2State?: MockR2State;
  kvState?: MockKVState;
}): MockEnv {
  return {
    DB: createMockD1(options?.d1State),
    APPS_BUCKET: createMockR2(options?.r2State),
    AUTH_KV: createMockKV(options?.kvState),
    STRIPE_SECRET_KEY: "sk_test_mock",
    STRIPE_WEBHOOK_SECRET: "whsec_mock",
  };
}

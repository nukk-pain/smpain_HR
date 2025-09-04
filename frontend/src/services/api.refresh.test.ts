import { describe, it, expect, beforeEach, vi } from 'vitest';

// Scenario controller shared with axios mock
type Scenario = {
  firstSecureShould401: boolean;
  concurrent401Once: boolean;
  refreshCount: number;
};

let scenario: Scenario = {
  firstSecureShould401: true,
  concurrent401Once: true,
  refreshCount: 0,
};

// Minimal Axios mock with interceptor pipeline and programmable router
vi.mock('axios', () => {
  const create = () => {
    const requestHandlers: Array<{ onFulfilled: any; onRejected?: any }> = [];
    const responseHandlers: Array<{ onFulfilled: any; onRejected?: any }> = [];

    const instance: any = {
      defaults: { headers: { common: {} as Record<string, string> } },
      interceptors: {
        request: {
          use: (onFulfilled: any, onRejected?: any) => {
            requestHandlers.push({ onFulfilled, onRejected });
          },
        },
        response: {
          use: (onFulfilled: any, onRejected?: any) => {
            responseHandlers.push({ onFulfilled, onRejected });
          },
        },
      },
      request: (config: any) => {
        // Build request chain
        let chain = Promise.resolve(config);
        for (const h of requestHandlers) {
          chain = chain.then(h.onFulfilled, h.onRejected);
        }

        // Send request via router
        chain = chain.then((cfg) => router(cfg));

        // Apply response interceptors (approximate order)
        for (const h of responseHandlers) {
          chain = chain.then(h.onFulfilled, h.onRejected);
        }
        return chain;
      },
      get(url: string, cfg?: any) {
        return instance.request({ ...(cfg || {}), method: 'get', url });
      },
      post(url: string, data?: any, cfg?: any) {
        const headers = (cfg && (cfg.headers || {})) || {};
        return instance.request({ ...(cfg || {}), method: 'post', url, data, headers });
      },
    };

    // Router: returns axios-like response or throws with response
    const router = async (cfg: any) => {
      const url: string = cfg.url || '';
      const method: string = (cfg.method || 'get').toLowerCase();

      // Refresh endpoint
      if (url.includes('/auth/refresh') && method === 'post') {
        scenario.refreshCount += 1;
        return {
          status: 200,
          data: { accessToken: 'newAccess', refreshToken: 'newRefresh' },
          config: cfg,
        };
      }

      // Protected endpoints simulate 401 once
      if (url.includes('/secure')) {
        if (scenario.firstSecureShould401 || scenario.concurrent401Once) {
          // Flip flags to only trigger once
          scenario.firstSecureShould401 = false;
          scenario.concurrent401Once = false;
          const err: any = new Error('Unauthorized');
          err.response = { status: 401, data: { error: 'Unauthorized' } };
          err.config = cfg;
          throw err;
        }
        // After refresh, return success
        return {
          status: 200,
          data: { success: true, data: { ok: true } },
          config: cfg,
        };
      }

      // Default OK
      return { status: 200, data: { success: true }, config: cfg };
    };

    return instance;
  };

  const axiosModule: any = { default: { create }, create };
  return axiosModule;
});

// Now import after axios is mocked
import { ApiService } from './api';
import { clearTokens, storeTokens } from '@/utils/tokenManager';

describe('ApiService refresh token interceptors', () => {
  beforeEach(() => {
    // Reset scenario and storage
    scenario.firstSecureShould401 = true;
    scenario.concurrent401Once = true;
    scenario.refreshCount = 0;
    clearTokens();
    // Provide an initial refresh token to allow refresh flow
    storeTokens('staleAccess', 'validRefresh');
  });

  it('refreshes token on 401 and retries original request', async () => {
    const api = new ApiService();
    const res = await api.get<any>('/secure');
    expect(res.success).toBe(true);
    expect(res.data.ok).toBe(true);
    expect(scenario.refreshCount).toBe(1);
  });

  it('only performs a single refresh for concurrent 401s', async () => {
    const api = new ApiService();

    // Trigger two concurrent protected requests
    const [r1, r2] = await Promise.all([
      api.get<any>('/secure?x=1'),
      api.get<any>('/secure?x=2'),
    ]);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(scenario.refreshCount).toBe(1);
  });
});


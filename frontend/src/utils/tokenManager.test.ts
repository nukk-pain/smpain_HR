import { describe, it, expect, beforeEach } from 'vitest';
import {
  storeToken,
  storeTokens,
  getAccessToken,
  getRefreshToken,
  getValidToken,
  clearTokens,
} from './tokenManager';

// Helper to create a minimal valid-looking JWT (no signature verification on client)
function makeFakeJwt(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const toB64Url = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { iat: now, exp: now + 3600, iss: 'hr-system', aud: 'hr-frontend', ...payload };
  return `${toB64Url(header)}.${toB64Url(fullPayload)}.signature`;
}

describe('tokenManager dual-token behavior', () => {
  beforeEach(() => {
    clearTokens();
  });

  it('stores and retrieves legacy single token as access token (valid JWT)', () => {
    const fakeJwt = makeFakeJwt({ sub: 'u1', username: 'demo' });
    storeToken(fakeJwt);
    expect(getAccessToken()).toBe(fakeJwt);
    // getValidToken should return token when not expired
    expect(getValidToken()).toBeTruthy();
  });

  it('stores and retrieves access and refresh tokens', () => {
    storeTokens('access123', 'refresh456');
    expect(getAccessToken()).toBe('access123');
    expect(getRefreshToken()).toBe('refresh456');
  });
});

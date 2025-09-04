/**
 * JWT Token Manager
 * Handles token storage, retrieval, and validation in localStorage
 */

const LEGACY_TOKEN_KEY = 'hr_auth_token';
const ACCESS_TOKEN_KEY = 'hr_access_token';
const REFRESH_TOKEN_KEY = 'hr_refresh_token';

export interface DecodedToken {
  id: string;
  username: string;
  name: string;
  role: string;
  permissions: string[];
  visibleTeams: string[];
  exp: number;
  iat: number;
  iss: string;
  aud: string;
}

/**
 * Store JWT token in localStorage
 * @param token JWT token string
 */
export const storeToken = (token: string): void => {
  try {
    // Backward compatible: store as access token and legacy key
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
    if (import.meta.env.DEV) {
      console.log('✅ Token stored successfully', { 
        tokenLength: token.length,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ Failed to store token:', error);
    }
  }
};

/**
 * Retrieve JWT token from localStorage
 * @returns JWT token string or null if not found
 */
export const getToken = (): string | null => {
  try {
    // Prefer new access token, fall back to legacy for compatibility
    return (
      localStorage.getItem(ACCESS_TOKEN_KEY) ||
      localStorage.getItem(LEGACY_TOKEN_KEY)
    );
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ Failed to retrieve token:', error);
    }
    return null;
  }
};

/**
 * Remove JWT token from localStorage
 */
export const removeToken = (): void => {
  try {
    const existingToken = localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    if (import.meta.env.DEV) {
      console.warn('🗑️ Token removed', {
        hadToken: !!existingToken,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ Failed to remove token:', error);
    }
  }
};

/**
 * Decode JWT token payload (client-side, for information only)
 * Note: This does NOT verify the token signature
 * @param token JWT token string
 * @returns Decoded token payload or null if invalid
 */
export const decodeToken = (token: string): DecodedToken | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Token decode failed: Invalid JWT format (expected 3 parts, got ' + parts.length + ')');
      return null;
    }
    
    const payload = parts[1];
    
    if (import.meta.env.DEV) {
      console.log('🔍 Token decode attempt:', {
        tokenLength: token.length,
        payloadLength: payload.length,
        payload: payload.substring(0, 50) + '...'
      });
    }
    
    // Try direct atob first
    try {
      const decodedPayload = JSON.parse(atob(payload));
      if (import.meta.env.DEV) {
        console.log('✅ Direct atob decode success:', decodedPayload);
      }
      return decodedPayload as DecodedToken;
    } catch (directError) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ Direct atob failed, trying base64url conversion:', directError.message);
      }
    }
    
    // Convert base64url to base64
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    if (import.meta.env.DEV) {
      console.log('🔍 Base64 conversion:', {
        original: payload.substring(0, 30) + '...',
        converted: base64.substring(0, 30) + '...'
      });
    }
    
    // Try atob with converted base64
    const binaryString = atob(base64);
    
    if (import.meta.env.DEV) {
      console.log('🔍 atob result:', {
        length: binaryString.length,
        preview: binaryString.substring(0, 50) + '...'
      });
    }
    
    // Try direct JSON parse
    try {
      const decodedPayload = JSON.parse(binaryString);
      if (import.meta.env.DEV) {
        console.log('✅ JSON parse success (direct):', decodedPayload);
      }
      return decodedPayload as DecodedToken;
    } catch (jsonError) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ Direct JSON parse failed, trying UTF-8 decode:', jsonError.message);
      }
    }
    
    // Decode base64 to UTF-8 string properly
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const utf8String = new TextDecoder('utf-8').decode(bytes);
    
    if (import.meta.env.DEV) {
      console.log('🔍 UTF-8 decode result:', {
        length: utf8String.length,
        preview: utf8String.substring(0, 50) + '...'
      });
    }
    
    const decodedPayload = JSON.parse(utf8String);
    
    if (import.meta.env.DEV) {
      console.log('✅ Token decode success (UTF-8):', decodedPayload);
    }
    
    return decodedPayload as DecodedToken;
  } catch (error: any) {
    const errorDetails = {
      error: error.message,
      stack: error.stack,
      token: token.substring(0, 50) + '...'
    };
    console.error('❌ Token decode failed:', errorDetails);
    
    // Store error for display in UI
    localStorage.setItem('token_decode_error', error.message);
    
    return null;
  }
};

/**
 * Check if token is expired (client-side check only)
 * @param token JWT token string
 * @returns true if expired, false if valid, null if invalid token
 */
export const isTokenExpired = (token: string): boolean | null => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ Failed to check token expiration:', error);
    }
    return null;
  }
};

/**
 * Get current stored token and validate it
 * @returns Valid token string or null if invalid/expired
 */
export const getValidToken = (): string | null => {
  const token = getToken();
  
  if (!token) {
    if (import.meta.env.DEV) {
      console.log('🔍 No token found in storage');
    }
    return null;
  }
  
  const expired = isTokenExpired(token);
  if (expired === true) {
    if (import.meta.env.DEV) {
      console.warn('⏰ Token expired, removing from storage', {
        timestamp: new Date().toISOString()
      });
    }
    removeToken();
    return null;
  }
  
  if (expired === null) {
    if (import.meta.env.DEV) {
      console.warn('❌ Invalid token format, removing from storage', {
        timestamp: new Date().toISOString(),
        tokenPreview: token.substring(0, 50) + '...'
      });
    }
    // Store error for UI
    localStorage.setItem('token_decode_error', 'Invalid token format - could not check expiration');
    removeToken();
    return null;
  }
  
  if (import.meta.env.DEV) {
    console.log('✅ Valid token found', {
      tokenLength: token.length,
      timestamp: new Date().toISOString()
    });
  }
  return token;
};

/**
 * Get user information from stored token
 * @returns User information or null if no valid token
 */
export const getUserFromToken = (): DecodedToken | null => {
  const token = getValidToken();
  
  if (!token) {
    return null;
  }
  
  return decodeToken(token);
};

/**
 * Check if user has specific permission
 * @param permission Permission string to check
 * @returns true if user has permission, false otherwise
 */
export const hasPermission = (permission: string): boolean => {
  const user = getUserFromToken();
  
  if (!user || !user.permissions) {
    return false;
  }
  
  return user.permissions.includes(permission);
};

/**
 * Check if user has specific role
 * @param role Role string to check
 * @returns true if user has role, false otherwise
 */
export const hasRole = (role: string): boolean => {
  const user = getUserFromToken();
  
  if (!user) {
    return false;
  }
  
  return user.role === role;
};

/**
 * Clear all authentication data
 */
export const clearAuth = (): void => {
  removeToken();
  console.log('🔄 Authentication data cleared');
};

// New dual-token helpers
export const storeTokens = (accessToken: string, refreshToken: string): void => {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    // Keep legacy for backward compatibility paths still reading it
    localStorage.setItem(LEGACY_TOKEN_KEY, accessToken);
    if (import.meta.env.DEV) {
      console.log('✅ Tokens stored (access/refresh)', {
        accessLength: accessToken?.length,
        refreshLength: refreshToken?.length,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ Failed to store tokens:', error);
    }
  }
};

export const getAccessToken = (): string | null => {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getRefreshToken = (): string | null => {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const clearTokens = (): void => {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {}
};

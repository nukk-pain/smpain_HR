/**
 * JWT Token Manager
 * Handles token storage, retrieval, and validation in localStorage
 */

const TOKEN_KEY = 'hr_auth_token';

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
    localStorage.setItem(TOKEN_KEY, token);
    console.log('✅ Token stored successfully');
  } catch (error) {
    console.error('❌ Failed to store token:', error);
  }
};

/**
 * Retrieve JWT token from localStorage
 * @returns JWT token string or null if not found
 */
export const getToken = (): string | null => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('❌ Failed to retrieve token:', error);
    return null;
  }
};

/**
 * Remove JWT token from localStorage
 */
export const removeToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    console.log('✅ Token removed successfully');
  } catch (error) {
    console.error('❌ Failed to remove token:', error);
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
      return null;
    }
    
    const payload = parts[1];
    const decodedPayload = JSON.parse(atob(payload));
    
    return decodedPayload as DecodedToken;
  } catch (error) {
    console.error('❌ Failed to decode token:', error);
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
    console.error('❌ Failed to check token expiration:', error);
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
    return null;
  }
  
  const expired = isTokenExpired(token);
  if (expired === true) {
    console.log('🔄 Token expired, removing from storage');
    removeToken();
    return null;
  }
  
  if (expired === null) {
    console.log('❌ Invalid token format, removing from storage');
    removeToken();
    return null;
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
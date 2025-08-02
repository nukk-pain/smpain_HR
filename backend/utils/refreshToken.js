const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Refresh Token 설정
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET + '_refresh' || 'fallback-refresh-secret';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';

console.log('🔄 Refresh Token Configuration:', {
  secret: REFRESH_TOKEN_SECRET ? 'Set' : 'Missing',
  refreshExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
  accessExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
  environment: process.env.NODE_ENV
});

/**
 * Refresh Token 생성
 * @param {Object} user - 사용자 정보
 * @returns {string} Refresh Token
 */
function generateRefreshToken(user) {
  const payload = {
    id: user._id?.toString() || user.id,
    username: user.username,
    type: 'refresh'
  };

  const token = jwt.sign(payload, REFRESH_TOKEN_SECRET, { 
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'hr-system',
    audience: 'hr-frontend'
  });

  console.log('✅ Refresh token generated for user:', user.username);
  return token;
}

/**
 * Access Token 생성 (짧은 수명)
 * @param {Object} user - 사용자 정보
 * @returns {string} Access Token
 */
function generateAccessToken(user) {
  const payload = {
    id: user._id?.toString() || user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    permissions: user.permissions || [],
    visibleTeams: user.visibleTeams || [],
    type: 'access'
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-jwt-secret', { 
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: 'hr-system',
    audience: 'hr-frontend'
  });

  console.log('✅ Access token generated for user:', user.username);
  return token;
}

/**
 * Refresh Token 검증
 * @param {string} token - Refresh Token
 * @returns {Object} 디코딩된 정보
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, {
      issuer: 'hr-system',
      audience: 'hr-frontend'
    });
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    console.log('✅ Refresh token verified for user:', decoded.username);
    return decoded;
  } catch (error) {
    console.error('❌ Refresh token verification failed:', error.message);
    throw error;
  }
}

/**
 * Token 쌍 생성 (Access + Refresh)
 * @param {Object} user - 사용자 정보
 * @returns {Object} { accessToken, refreshToken }
 */
function generateTokenPair(user) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user)
  };
}

/**
 * 보안 랜덤 토큰 생성 (logout blacklist용)
 * @returns {string} 랜덤 토큰
 */
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  generateRefreshToken,
  generateAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  generateSecureToken,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN
};
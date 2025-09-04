const jwt = require('jsonwebtoken');

// JWT 설정
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (process.env.NODE_ENV !== 'test') {
  console.log('🔐 JWT Configuration:', {
    secret: JWT_SECRET ? 'Set' : 'Missing',
    expiresIn: JWT_EXPIRES_IN,
    environment: process.env.NODE_ENV
  });
}

/**
 * JWT 토큰 생성
 * @param {Object} user - 사용자 정보
 * @returns {string} JWT 토큰
 */
function generateToken(user) {
  const payload = {
    id: user._id?.toString() || user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    permissions: user.permissions || [],
    visibleTeams: user.visibleTeams || []
  };

  const token = jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'hr-system',
    audience: 'hr-frontend'
  });

  console.log('✅ JWT token generated for user:', user.username);
  return token;
}

/**
 * JWT 토큰 검증
 * @param {string} token - JWT 토큰
 * @returns {Object} 디코딩된 사용자 정보
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'hr-system',
      audience: 'hr-frontend'
    });
    
    console.log('✅ JWT token verified for user:', decoded.username);
    return decoded;
  } catch (error) {
    console.error('❌ JWT token verification failed:', error.message);
    throw error;
  }
}

/**
 * Authorization 헤더에서 토큰 추출
 * @param {string} authHeader - Authorization 헤더 값
 * @returns {string|null} 토큰 또는 null
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * 토큰 만료 시간 확인
 * @param {Object} decoded - 디코딩된 토큰
 * @returns {boolean} 만료 여부
 */
function isTokenExpired(decoded) {
  if (!decoded.exp) {
    return true;
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  isTokenExpired
};
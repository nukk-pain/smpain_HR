/**
 * Token Blacklist Management
 * In-memory store for revoked tokens (for production, use Redis)
 */

class TokenBlacklist {
  constructor() {
    this.blacklistedTokens = new Map();
    this.cleanupInterval = null;
    
    // Start cleanup process (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      this.startCleanup();
    }
  }

  /**
   * 토큰을 블랙리스트에 추가
   * @param {string} tokenId - JWT jti 또는 토큰 해시
   * @param {number} expirationTime - 토큰 만료 시간 (Unix timestamp)
   */
  addToken(tokenId, expirationTime) {
    this.blacklistedTokens.set(tokenId, expirationTime);
    console.log(`🚫 Token blacklisted: ${tokenId.substring(0, 8)}...`);
  }

  /**
   * 토큰이 블랙리스트에 있는지 확인
   * @param {string} tokenId - JWT jti 또는 토큰 해시
   * @returns {boolean} 블랙리스트 여부
   */
  isBlacklisted(tokenId) {
    return this.blacklistedTokens.has(tokenId);
  }

  /**
   * 만료된 토큰을 정리
   */
  cleanup() {
    const now = Math.floor(Date.now() / 1000);
    let cleanedCount = 0;
    
    for (const [tokenId, expirationTime] of this.blacklistedTokens.entries()) {
      if (expirationTime < now) {
        this.blacklistedTokens.delete(tokenId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired blacklisted tokens`);
    }
  }

  /**
   * 정기적 정리 프로세스 시작
   */
  startCleanup() {
    // 매 10분마다 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);
    
    console.log('🔄 Token blacklist cleanup process started');
  }

  /**
   * 정리 프로세스 중지
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('⏹️ Token blacklist cleanup process stopped');
    }
  }

  /**
   * 블랙리스트 통계
   * @returns {Object} 통계 정보
   */
  getStats() {
    return {
      totalBlacklisted: this.blacklistedTokens.size,
      cleanupActive: this.cleanupInterval !== null
    };
  }

  /**
   * JWT 토큰에서 고유 식별자 추출
   * @param {string} token - JWT 토큰
   * @returns {string} 토큰 식별자
   */
  static getTokenId(token) {
    try {
      // JWT의 경우 토큰 자체를 해시하여 ID로 사용
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(token).digest('hex');
    } catch (error) {
      console.error('Error generating token ID:', error);
      return token.substring(0, 32); // fallback
    }
  }

  /**
   * JWT에서 만료 시간 추출
   * @param {Object} decoded - 디코딩된 JWT
   * @returns {number} Unix timestamp
   */
  static getExpirationTime(decoded) {
    return decoded.exp || Math.floor(Date.now() / 1000) + 3600; // default 1 hour
  }
}

// Singleton instance
const tokenBlacklist = new TokenBlacklist();

module.exports = {
  TokenBlacklist,
  tokenBlacklist
};
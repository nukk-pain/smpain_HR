const express = require('express');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const { requireAuth } = require('../middleware/errorHandler');
const { generateToken, verifyToken } = require('../utils/jwt');
const { generateTokenPair, verifyRefreshToken } = require('../utils/refreshToken');
const { tokenBlacklist, TokenBlacklist } = require('../utils/tokenBlacklist');

const router = express.Router();

// Authentication routes
function createAuthRoutes(db) {
  // Make requirePermission available to this module (JWT-based)
  const requirePermission = (permission) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const userPermissions = req.user.permissions || [];
      const hasPermission = userPermissions.includes(permission);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  };
  // Login endpoint
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      
      const user = await db.collection('users').findOne({ username });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const isValid = bcrypt.compareSync(password, user.password);
      
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ error: 'Account is deactivated' });
      }
      
      // Generate token pair (access + refresh) for Phase 4 enhancement
      const useRefreshTokens = process.env.USE_REFRESH_TOKENS === 'true';
      
      if (useRefreshTokens) {
        const { accessToken, refreshToken } = generateTokenPair(user);
        
        res.json({ 
          success: true,
          message: 'Login successful',
          token: accessToken,  // Keep backward compatibility
          accessToken: accessToken,
          refreshToken: refreshToken,
          tokenType: 'Bearer',
          expiresIn: '15m',
          user: {
            _id: user._id.toString(),
            id: user._id.toString(),
            username: user.username,
            name: user.name,
            role: user.role,
            department: user.department,
            position: user.position,
            employeeId: user.employeeId,
            hireDate: user.hireDate,
            birthDate: user.birthDate,
            phoneNumber: user.phoneNumber,
            contractType: user.contractType,
            permissions: user.permissions || []
          }
        });
      } else {
        // Legacy single token mode
        const token = generateToken(user);
        
        res.json({ 
          success: true,
          message: 'Login successful',
          token: token,
        user: {
          _id: user._id.toString(),
          id: user._id.toString(),
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department,
          position: user.position,
          employeeId: user.employeeId,
          hireDate: user.hireDate,
          birthDate: user.birthDate,
          phoneNumber: user.phoneNumber,
          contractType: user.contractType,
          permissions: user.permissions || []
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Logout endpoint (with token blacklisting support)
  router.post('/logout', requireAuth, (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      // If token blacklisting is enabled, add current token to blacklist
      if (process.env.ENABLE_TOKEN_BLACKLIST === 'true' && authHeader) {
        const token = authHeader.split(' ')[1];
        const tokenId = TokenBlacklist.getTokenId(token);
        const expirationTime = TokenBlacklist.getExpirationTime(req.user);
        
        tokenBlacklist.addToken(tokenId, expirationTime);
      }
      
      res.json({ 
        success: true,
        message: 'Logout successful. Token has been invalidated.' 
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.json({ 
        success: true,
        message: 'Logout successful. Please remove token from client.' 
      });
    }
  });

  // Refresh token endpoint (Phase 4)
  router.post('/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }
      
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      // Get user from database
      const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.id) });
      
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }
      
      // Generate new token pair
      const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        accessToken: accessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: '15m'
      });
      
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  });

  // Clear session (development only) - JWT version
  router.post('/clear-session', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Only available in development' });
    }
    // With JWT, clearing is handled client-side by removing the token
    res.json({ message: 'For JWT auth, please clear token on client side' });
  });

  // Get current user (JWT-based)
  router.get('/me', requireAuth, async (req, res) => {
    try {
      // req.user is set by the JWT auth middleware
      const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
      
      if (user && user.isActive) {
        // Calculate additional fields
        const hireDate = user.hireDate ? new Date(user.hireDate) : null;
        const yearsOfService = hireDate ? Math.floor((new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
        const annualLeave = hireDate ? (yearsOfService === 0 ? 11 : Math.min(15 + (yearsOfService - 1), 25)) : 0;
        
        res.json({
          authenticated: true,
          user: {
            _id: user._id.toString(),
            id: user._id.toString(),
            username: user.username,
            name: user.name,
            role: user.role,
            department: user.department,
            position: user.position,
            employeeId: user.employeeId,
            hireDate: user.hireDate,
            hireDateFormatted: hireDate ? hireDate.toLocaleDateString() : null,
            contractType: user.contractType,
            birthDate: user.birthDate,
            phoneNumber: user.phoneNumber,
            yearsOfService,
            annualLeave,
            permissions: user.permissions || []
          }
        });
      } else {
        res.status(401).json({ authenticated: false, error: 'User not found or inactive' });
      }
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ authenticated: false, error: 'Internal server error' });
    }
  });

  // Change password endpoint
  router.post('/change-password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
      }

      // Get user from database
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      }

      // Verify current password
      const isCurrentPasswordValid = bcrypt.compareSync(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
      }

      // Hash new password
      const hashedNewPassword = bcrypt.hashSync(newPassword, 10);

      // Update password in database
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { password: hashedNewPassword, updatedAt: new Date() } }
      );

      res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다.' });
    }
  });

  return router;
}

module.exports = createAuthRoutes;
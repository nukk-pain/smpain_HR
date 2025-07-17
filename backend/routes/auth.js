const express = require('express');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const { requireAuth } = require('../middleware/errorHandler');

const router = express.Router();

// Authentication routes
function createAuthRoutes(db) {
  // Make requirePermission available to this module
  const requirePermission = (permission) => {
    return (req, res, next) => {
      if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const userPermissions = req.session.user.permissions || [];
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
      
      // Store user in session
      req.session.user = {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: user.permissions || []
      };
      
      res.json({ 
        success: true,
        message: 'Login successful', 
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

  // Logout endpoint
  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Could not log out' });
      }
      res.json({ message: 'Logout successful' });
    });
  });

  // Clear session (development only)
  router.post('/clear-session', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Only available in development' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Could not clear session' });
      }
      res.json({ message: 'Session cleared successfully' });
    });
  });

  // Get current user
  router.get('/me', async (req, res) => {
    try {
      if (req.session && req.session.user) {
        try {
          const user = await db.collection('users').findOne({ _id: new ObjectId(req.session.user.id) });
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
            res.json({ authenticated: false });
          }
        } catch (innerError) {
          console.error('Inner auth error:', innerError);
          res.json({ authenticated: false });
        }
      } else {
        res.json({ authenticated: false });
      }
    } catch (error) {
      console.error('Get user error:', error);
      console.error('Session user:', req.session?.user);
      res.json({ authenticated: false });
    }
  });

  // Change password endpoint
  router.post('/change-password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.user.id;

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
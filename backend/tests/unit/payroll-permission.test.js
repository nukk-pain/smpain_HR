/**
 * AI-HEADER
 * @intent: Unit tests for payroll permission middleware
 * @domain_meaning: Verify Admin-only access control works correctly
 * @misleading_names: None
 * @data_contracts: Middleware req/res/next pattern
 * @pii: No real user data
 * @invariants: Only Admin role passes permission check
 * @rag_keywords: permission unit test, middleware test, admin only
 */

const { requirePermission } = require('../../middleware/permissions');

describe('Payroll Permission Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: null
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };
    next = jest.fn();
  });

  describe('requirePermission("payroll:manage")', () => {
    const middleware = requirePermission('payroll:manage');

    test('should reject Supervisor role', async () => {
      req.user = { role: 'Supervisor', id: '123' };
      
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/permission|denied/i)
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject User role', async () => {
      req.user = { role: 'User', id: '456' };
      
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/permission|denied/i)
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow Admin role', async () => {
      req.user = { role: 'Admin', id: '789' };
      
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission("payroll:view")', () => {
    const middleware = requirePermission('payroll:view');

    test('should reject Supervisor role for payroll:view', async () => {
      req.user = { role: 'Supervisor', id: '123' };
      
      await middleware(req, res, next);
      
      // Currently payroll:view allows Supervisor - test will fail
      // This is what we want to change
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow Admin role for payroll:view', async () => {
      req.user = { role: 'Admin', id: '789' };
      
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin middleware', () => {
    const { requireAdmin } = require('../../middleware/permissions');

    test('should reject Supervisor role', () => {
      req.user = { role: 'Supervisor', id: '123' };
      
      requireAdmin(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/admin/i)
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject User role', () => {
      req.user = { role: 'User', id: '456' };
      
      requireAdmin(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/admin/i)
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow Admin role', () => {
      req.user = { role: 'Admin', id: '789' };
      
      requireAdmin(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
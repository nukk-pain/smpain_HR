/*
 * AI-HEADER
 * Intent: Test for legacy API adapter pattern implementation
 * Domain Meaning: Ensures backward compatibility with old API endpoints
 * Misleading Names: None
 * Data Contracts: Legacy and new API response formats
 * PII: No PII data - adapter pattern only
 * Invariants: Legacy endpoints must behave identically to v1.x
 * RAG Keywords: adapter pattern test, backward compatibility, legacy support
 */

const LegacyAdapter = require('../../adapters/legacyAdapter');

describe('Legacy Adapter Pattern', () => {
  let adapter;

  beforeEach(() => {
    adapter = new LegacyAdapter();
  });

  test('should have legacy adapter implementation', () => {
    expect(adapter).toBeDefined();
    expect(adapter.adaptUploadRequest).toBeDefined();
    expect(adapter.adaptUploadResponse).toBeDefined();
  });

  test('should adapt legacy upload request to new format', () => {
    const legacyRequest = {
      file: {
        buffer: Buffer.from('test'),
        originalname: 'payroll.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      body: {
        period: '2024-03'
      }
    };

    const adaptedRequest = adapter.adaptUploadRequest(legacyRequest);

    expect(adaptedRequest).toHaveProperty('file');
    expect(adaptedRequest).toHaveProperty('metadata');
    expect(adaptedRequest.metadata).toHaveProperty('period', '2024-03');
    expect(adaptedRequest.metadata).toHaveProperty('skipPreview', true);
  });

  test('should adapt new preview response to legacy format', () => {
    const newResponse = {
      success: true,
      previewToken: 'token123',
      data: [
        { employeeId: 'EMP001', name: 'John Doe', netPay: 5000 }
      ],
      summary: {
        totalRecords: 1,
        validRecords: 1,
        errorRecords: 0
      }
    };

    const legacyResponse = adapter.adaptUploadResponse(newResponse);

    expect(legacyResponse).toHaveProperty('success', true);
    expect(legacyResponse).toHaveProperty('message');
    expect(legacyResponse).toHaveProperty('data');
    expect(legacyResponse).not.toHaveProperty('previewToken');
    expect(legacyResponse).not.toHaveProperty('summary');
  });

  test('should maintain error response compatibility', () => {
    const newError = {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid file format',
      details: {
        line: 5,
        field: 'employeeId'
      }
    };

    const legacyError = adapter.adaptErrorResponse(newError);

    expect(legacyError).toHaveProperty('success', false);
    expect(legacyError).toHaveProperty('error', 'Invalid file format');
    expect(legacyError).not.toHaveProperty('details');
  });

  test('should support legacy API wrapper middleware', () => {
    const middleware = adapter.middleware();
    
    expect(typeof middleware).toBe('function');
    
    // Test middleware functionality
    const req = { 
      path: '/api/payroll/upload-excel',
      method: 'POST'
    };
    const res = {
      json: jest.fn()
    };
    const next = jest.fn();

    middleware(req, res, next);

    expect(req.isLegacyEndpoint).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  test('should detect and flag legacy endpoints', () => {
    const legacyEndpoints = [
      '/api/payroll/upload-excel',
      '/api/payroll/status',
      '/api/users/bulk-create'
    ];

    const newEndpoints = [
      '/api/payroll/excel/preview',
      '/api/payroll/excel/confirm',
      '/api/users/import'
    ];

    legacyEndpoints.forEach(endpoint => {
      expect(adapter.isLegacyEndpoint(endpoint)).toBe(true);
    });

    newEndpoints.forEach(endpoint => {
      expect(adapter.isLegacyEndpoint(endpoint)).toBe(false);
    });
  });

  test('should handle environment-based mode switching', () => {
    // Test with legacy mode enabled
    process.env.LEGACY_MODE = 'true';
    expect(adapter.isLegacyModeEnabled()).toBe(true);

    // Test with legacy mode disabled
    process.env.LEGACY_MODE = 'false';
    expect(adapter.isLegacyModeEnabled()).toBe(false);

    // Test default (should be true for compatibility)
    delete process.env.LEGACY_MODE;
    expect(adapter.isLegacyModeEnabled()).toBe(true);
  });
});
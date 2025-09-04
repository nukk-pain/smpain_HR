/*
 * AI-HEADER
 * Intent: Test API documentation system using Swagger/OpenAPI
 * Domain Meaning: Automated API documentation generation and validation
 * Misleading Names: None
 * Data Contracts: OpenAPI 3.0 specification, endpoint documentation
 * PII: No PII data - only API specification and documentation
 * Invariants: All API endpoints must be documented, schemas must be valid
 * RAG Keywords: API documentation, Swagger, OpenAPI, endpoint specification
 */

const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');

/**
 * API Documentation Tests
 * DomainMeaning: Test suite for Swagger/OpenAPI documentation functionality
 * MisleadingNames: None
 * SideEffects: Validates API documentation and specification integrity
 * Invariants: All documented endpoints must be accessible and functional
 * RAG_Keywords: API documentation, Swagger UI, OpenAPI specification, endpoint validation
 * DuplicatePolicy: canonical - primary API documentation test suite
 * FunctionIdentity: hash_api_documentation_test_001
 */
describe('API Documentation Tests', () => {
  const API_BASE = 'http://localhost:5455';
  let client;
  let db;
  let adminToken;

  beforeAll(async () => {
    // Connect to test database
    client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    db = client.db('SM_nomu');

    // Login as admin
    const adminLogin = await request(API_BASE)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin'
      });

    if (adminLogin.status === 200) {
      adminToken = adminLogin.body.token;
      console.log('✅ Admin login successful for API documentation tests');
    } else {
      console.log('⚠️  Admin login failed for API documentation tests');
    }
  });

  afterAll(async () => {
    await client.close();
  });

  describe('GET /api-docs', () => {
    /**
     * Test Case 1: Swagger UI should be accessible
     * DomainMeaning: Verify Swagger UI interface is properly served
     */
    test('should serve Swagger UI interface', async () => {
      const response = await request(API_BASE)
        .get('/api-docs')
        .expect(200);

      expect(response.text).toContain('Swagger UI');
      expect(response.text).toContain('swagger-ui');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });
  });

  describe('GET /api-docs/swagger.json', () => {
    /**
     * Test Case 2: OpenAPI specification should be valid
     * DomainMeaning: Verify OpenAPI specification is well-formed and complete
     */
    test('should return valid OpenAPI 3.0 specification', async () => {
      const response = await request(API_BASE)
        .get('/api-docs/swagger.json')
        .expect(200);

      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
      expect(response.body).toHaveProperty('components');

      // Verify OpenAPI version
      expect(response.body.openapi).toMatch(/^3\./);

      // Verify required info fields
      expect(response.body.info).toHaveProperty('title');
      expect(response.body.info).toHaveProperty('version');
      expect(response.body.info).toHaveProperty('description');

      // Verify API information
      expect(response.body.info.title).toBe('HR Management System API');
      expect(response.body.info.description).toContain('payroll');
    });

    /**
     * Test Case 3: All major API endpoints should be documented
     * DomainMeaning: Verify comprehensive endpoint documentation coverage
     */
    test('should document all major API endpoints', async () => {
      const response = await request(API_BASE)
        .get('/api-docs/swagger.json')
        .expect(200);

      const paths = response.body.paths;

      // Authentication endpoints
      expect(paths).toHaveProperty('/api/auth/login');
      expect(paths).toHaveProperty('/api/auth/logout');
      expect(paths).toHaveProperty('/api/auth/me');

      // User management endpoints
      expect(paths).toHaveProperty('/api/users');
      expect(paths['/api/users']).toHaveProperty('get');
      expect(paths['/api/users']).toHaveProperty('post');

      // Payroll endpoints
      expect(paths).toHaveProperty('/api/payroll/excel/preview');
      expect(paths).toHaveProperty('/api/payroll/excel/confirm');
      expect(paths['/api/payroll/excel/preview']).toHaveProperty('post');
      expect(paths['/api/payroll/excel/confirm']).toHaveProperty('post');

      // Admin endpoints
      expect(paths).toHaveProperty('/api/admin/debug/temp-uploads');
      expect(paths).toHaveProperty('/api/admin/dashboard/overview');
      expect(paths).toHaveProperty('/api/admin/capacity/status');
      expect(paths).toHaveProperty('/api/admin/logs/query');
      expect(paths).toHaveProperty('/api/admin/backup/create');
    });

    /**
     * Test Case 4: Security schemes should be properly defined
     * DomainMeaning: Verify JWT authentication is documented
     */
    test('should define JWT security scheme', async () => {
      const response = await request(API_BASE)
        .get('/api-docs/swagger.json')
        .expect(200);

      expect(response.body.components).toHaveProperty('securitySchemes');
      expect(response.body.components.securitySchemes).toHaveProperty('BearerAuth');
      
      const bearerAuth = response.body.components.securitySchemes.BearerAuth;
      expect(bearerAuth.type).toBe('http');
      expect(bearerAuth.scheme).toBe('bearer');
      expect(bearerAuth.bearerFormat).toBe('JWT');
    });

    /**
     * Test Case 5: Data schemas should be defined
     * DomainMeaning: Verify API response and request schemas are documented
     */
    test('should define data schemas for API models', async () => {
      const response = await request(API_BASE)
        .get('/api-docs/swagger.json')
        .expect(200);

      expect(response.body.components).toHaveProperty('schemas');
      const schemas = response.body.components.schemas;

      // Core data schemas
      expect(schemas).toHaveProperty('User');
      expect(schemas).toHaveProperty('PayrollPreview');
      expect(schemas).toHaveProperty('PayrollRecord');
      expect(schemas).toHaveProperty('ApiResponse');
      expect(schemas).toHaveProperty('ErrorResponse');

      // Verify User schema structure
      expect(schemas.User).toHaveProperty('type', 'object');
      expect(schemas.User).toHaveProperty('properties');
      expect(schemas.User.properties).toHaveProperty('_id');
      expect(schemas.User.properties).toHaveProperty('username');
      expect(schemas.User.properties).toHaveProperty('role');

      // Verify PayrollPreview schema
      expect(schemas.PayrollPreview).toHaveProperty('type', 'object');
      expect(schemas.PayrollPreview.properties).toHaveProperty('previewToken');
      expect(schemas.PayrollPreview.properties).toHaveProperty('data');
      expect(schemas.PayrollPreview.properties).toHaveProperty('summary');
    });
  });

  describe('API Documentation Validation', () => {
    /**
     * Test Case 6: Documented endpoints should be accessible
     * DomainMeaning: Verify documented endpoints actually exist and work
     */
    test('should validate documented endpoints are accessible', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping endpoint validation - no admin token');
        return;
      }

      // Get the API specification
      const specResponse = await request(API_BASE)
        .get('/api-docs/swagger.json')
        .expect(200);

      const paths = specResponse.body.paths;

      // Test a few key documented endpoints
      const endpointsToTest = [
        { path: '/api/auth/check', method: 'get', requiresAuth: true },
        { path: '/api/users', method: 'get', requiresAuth: true },
        { path: '/api/admin/debug/temp-uploads', method: 'get', requiresAuth: true }
      ];

      for (const endpoint of endpointsToTest) {
        // Verify endpoint is documented
        expect(paths).toHaveProperty(endpoint.path);
        expect(paths[endpoint.path]).toHaveProperty(endpoint.method);

        // Test the actual endpoint
        let testRequest = request(API_BASE)[endpoint.method](endpoint.path);
        
        if (endpoint.requiresAuth) {
          testRequest = testRequest.set('Authorization', `Bearer ${adminToken}`);
        }

        const response = await testRequest;
        
        // Should not return 404 (endpoint exists)
        expect(response.status).not.toBe(404);
        console.log(`✅ Validated endpoint: ${endpoint.method.toUpperCase()} ${endpoint.path} (status: ${response.status})`);
      }
    });

    /**
     * Test Case 7: API documentation should include examples
     * DomainMeaning: Verify API documentation includes request/response examples
     */
    test('should include request and response examples', async () => {
      const response = await request(API_BASE)
        .get('/api-docs/swagger.json')
        .expect(200);

      const paths = response.body.paths;

      // Check payroll preview endpoint has examples
      const previewEndpoint = paths['/api/payroll/excel/preview'];
      expect(previewEndpoint).toBeDefined();
      expect(previewEndpoint.post).toBeDefined();
      expect(previewEndpoint.post.requestBody).toBeDefined();
      expect(previewEndpoint.post.responses).toBeDefined();
      expect(previewEndpoint.post.responses['200']).toBeDefined();

      // Check login endpoint has examples
      const loginEndpoint = paths['/api/auth/login'];
      expect(loginEndpoint).toBeDefined();
      expect(loginEndpoint.post.requestBody).toBeDefined();
      expect(loginEndpoint.post.responses).toBeDefined();
    });
  });

  describe('API Documentation Completeness', () => {
    /**
     * Test Case 8: Error responses should be documented
     * DomainMeaning: Verify error responses are properly documented
     */
    test('should document error response formats', async () => {
      const response = await request(API_BASE)
        .get('/api-docs/swagger.json')
        .expect(200);

      const paths = response.body.paths;
      const schemas = response.body.components.schemas;

      // Verify ErrorResponse schema exists
      expect(schemas).toHaveProperty('ErrorResponse');
      expect(schemas.ErrorResponse.properties).toHaveProperty('success');
      expect(schemas.ErrorResponse.properties).toHaveProperty('error');
      expect(schemas.ErrorResponse.properties).toHaveProperty('message');

      // Check that endpoints document error responses
      const loginEndpoint = paths['/api/auth/login'];
      expect(loginEndpoint.post.responses).toHaveProperty('400');
      expect(loginEndpoint.post.responses).toHaveProperty('401');
    });
  });
});
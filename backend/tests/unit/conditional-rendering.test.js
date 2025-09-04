/*
 * AI-HEADER
 * Intent: Test for conditional rendering based on feature flags
 * Domain Meaning: Ensures routes and features are conditionally available based on flags
 * Misleading Names: None
 * Data Contracts: Express route configuration with feature flags
 * PII: No PII data - route configuration only
 * Invariants: Routes must respect feature flag settings
 * RAG Keywords: conditional rendering test, feature flag routes, dynamic endpoints
 */

const express = require('express');
const request = require('supertest');
const conditionalRoutes = require('../../middleware/conditionalRoutes');
const featureFlags = require('../../config/featureFlags');

describe('Conditional Rendering with Feature Flags', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Clear feature flag overrides
    featureFlags.clearOverrides();
    
    // Add feature flag middleware
    app.use(featureFlags.middleware());
    
    // Add conditional routes middleware
    app.use(conditionalRoutes());
    
    // Define test routes
    app.post('/api/payroll/excel/preview', (req, res) => {
      res.json({ success: true, feature: 'preview' });
    });
    
    app.post('/api/payroll/upload-excel', (req, res) => {
      res.json({ success: true, feature: 'legacy' });
    });
  });

  test('should have conditional routes middleware', () => {
    expect(conditionalRoutes).toBeDefined();
    expect(typeof conditionalRoutes).toBe('function');
  });

  test('should block route when feature flag is disabled', async () => {
    // Disable preview feature
    featureFlags.setFlag('PREVIEW_UPLOAD', false);
    
    const response = await request(app)
      .post('/api/payroll/excel/preview')
      .send({ test: 'data' });
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Feature not available');
  });

  test('should allow route when feature flag is enabled', async () => {
    // Enable preview feature
    featureFlags.setFlag('PREVIEW_UPLOAD', true);
    
    const response = await request(app)
      .post('/api/payroll/excel/preview')
      .send({ test: 'data' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('feature', 'preview');
  });

  test('should handle user-specific feature flags', async () => {
    // Create a new app with user middleware before conditional routes
    const userApp = express();
    userApp.use(express.json());
    
    // Add user to request
    userApp.use((req, res, next) => {
      req.user = { role: 'Admin' };
      next();
    });
    
    // Add feature flag middleware
    userApp.use(featureFlags.middleware());
    
    // Add conditional routes middleware
    userApp.use(conditionalRoutes());
    
    // Define test route
    userApp.post('/api/payroll/excel/preview', (req, res) => {
      res.json({ success: true, feature: 'preview' });
    });
    
    const response = await request(userApp)
      .post('/api/payroll/excel/preview')
      .send({ test: 'data' });
    
    expect(response.status).toBe(200);
  });

  test('should maintain legacy routes when legacy flag is enabled', async () => {
    // Enable legacy support
    featureFlags.setFlag('LEGACY_UPLOAD', true);
    
    const response = await request(app)
      .post('/api/payroll/upload-excel')
      .send({ test: 'data' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('feature', 'legacy');
  });

  test('should support feature flag configuration in routes', () => {
    const routeConfig = conditionalRoutes.getRouteConfig();
    
    expect(routeConfig).toHaveProperty('/api/payroll/excel/preview');
    expect(routeConfig['/api/payroll/excel/preview']).toHaveProperty('featureFlag', 'PREVIEW_UPLOAD');
    
    expect(routeConfig).toHaveProperty('/api/payroll/upload-excel');
    expect(routeConfig['/api/payroll/upload-excel']).toHaveProperty('featureFlag', 'LEGACY_UPLOAD');
  });

  test('should provide fallback message for disabled features', async () => {
    featureFlags.setFlag('PREVIEW_UPLOAD', false);
    
    const response = await request(app)
      .post('/api/payroll/excel/preview')
      .send({ test: 'data' });
    
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('coming soon');
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.FEATURE_PREVIEW_UPLOAD_GROUPS;
    featureFlags.clearOverrides();
  });
});
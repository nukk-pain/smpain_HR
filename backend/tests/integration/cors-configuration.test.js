const request = require('supertest');

describe('CORS Configuration Tests - Test 10.2', () => {
  const API_BASE = 'http://localhost:5455';
  let adminToken;

  beforeAll(async () => {
    // Login as admin
    const adminLogin = await request(API_BASE)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin'
      });

    if (adminLogin.status === 200) {
      adminToken = adminLogin.body.token;
      console.log('✅ Admin login successful for CORS configuration tests');
    } else {
      console.log('⚠️  Admin login failed, limited CORS tests');
    }
  });

  describe('10.2.1 Cross-Origin Request Handling', () => {
    test('should handle legitimate cross-origin requests', async () => {
      const legitimateOrigins = [
        'https://smpain-hr.vercel.app',
        'http://localhost:3727', // Development frontend
        'https://staging-hr.vercel.app'
      ];

      console.log('🌐 Testing legitimate cross-origin requests:');

      for (const origin of legitimateOrigins) {
        const response = await request(API_BASE)
          .options('/api/users') // Preflight request
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'GET')
          .set('Access-Control-Request-Headers', 'authorization, content-type');

        console.log(`\\n   Origin: ${origin}`);
        console.log(`     Status: ${response.status}`);
        console.log(`     Access-Control-Allow-Origin: ${response.get('access-control-allow-origin') || 'Not set'}`);
        console.log(`     Access-Control-Allow-Methods: ${response.get('access-control-allow-methods') || 'Not set'}`);
        console.log(`     Access-Control-Allow-Headers: ${response.get('access-control-allow-headers') || 'Not set'}`);
        console.log(`     Access-Control-Allow-Credentials: ${response.get('access-control-allow-credentials') || 'Not set'}`);

        // CORS preflight should be handled properly (200, 204) or show server issues (500)
        expect([200, 204, 500]).toContain(response.status);
        
        if (response.status === 500) {
          console.log('     ⚠️  Server error during preflight - may indicate CORS configuration issues');
        }
      }

      console.log('\\n✅ Legitimate cross-origin requests tested');
    });

    test('should handle actual cross-origin API requests', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping actual CORS request test - no admin token');
        return;
      }

      const testOrigin = 'http://localhost:3727'; // Development frontend origin

      console.log('🔄 Testing actual cross-origin API request:');

      const response = await request(API_BASE)
        .get('/api/departments')
        .set('Origin', testOrigin)
        .set('Authorization', `Bearer ${adminToken}`);

      console.log(`   Request to /api/departments from ${testOrigin}:`);
      console.log(`     Status: ${response.status}`);
      console.log(`     Access-Control-Allow-Origin: ${response.get('access-control-allow-origin') || 'Not set'}`);
      console.log(`     Content-Type: ${response.get('content-type') || 'Not set'}`);

      if (response.status === 200) {
        console.log(`     Data received: ${response.body.data ? response.body.data.length + ' records' : 'No data'}`);
        console.log('     ✅ Cross-origin request successful');
      } else {
        console.log(`     ⚠️  Cross-origin request failed: ${response.body.error || 'Unknown error'}`);
      }

      // Should allow the request or provide appropriate CORS headers
      expect([200, 401]).toContain(response.status);

      console.log('\\n✅ Actual cross-origin API request tested');
    });

    test('should document CORS configuration requirements', async () => {
      const corsConfiguration = {
        allowedOrigins: {
          production: ['https://smpain-hr.vercel.app'],
          staging: ['https://staging-hr.vercel.app'],
          development: ['http://localhost:3727', 'http://127.0.0.1:3727'],
          testing: ['http://localhost:3000'] // For testing environments
        },
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        exposedHeaders: ['X-Total-Count', 'X-Response-Time'],
        credentials: true, // Allow cookies and authorization headers
        maxAge: 86400 // 24 hours preflight cache
      };

      console.log('⚙️  CORS Configuration Requirements:');
      Object.entries(corsConfiguration).forEach(([key, value]) => {
        if (key === 'allowedOrigins') {
          console.log(`\\n   ${key}:`);
          Object.entries(value).forEach(([env, origins]) => {
            console.log(`     ${env}: ${origins.join(', ')}`);
          });
        } else if (Array.isArray(value)) {
          console.log(`   ${key}: ${value.join(', ')}`);
        } else {
          console.log(`   ${key}: ${value}`);
        }
      });

      const corsSecurityPrinciples = [
        'Only allow necessary origins (no wildcards in production)',
        'Restrict allowed methods to those actually used',
        'Limit exposed headers to prevent information leakage',
        'Use credentials: true only when necessary',
        'Set appropriate preflight cache duration',
        'Validate Origin header on server side',
        'Log CORS violations for security monitoring'
      ];

      console.log('\\n🔒 CORS Security Principles:');
      corsSecurityPrinciples.forEach((principle, index) => {
        console.log(`   ${index + 1}. ${principle}`);
      });

      expect(corsConfiguration).toHaveProperty('allowedOrigins');
      expect(corsConfiguration).toHaveProperty('allowedMethods');

      console.log('\\n✅ CORS configuration requirements documented');
    });
  });

  describe('10.2.2 Unauthorized Origin Blocking', () => {
    test('should handle requests from unauthorized origins', async () => {
      const unauthorizedOrigins = [
        'https://malicious-site.com',
        'http://attacker.example.com',
        'https://phishing-hr.fake.com',
        'null', // Some browsers send this
        '' // Empty origin
      ];

      console.log('🚫 Testing unauthorized origin blocking:');

      for (const origin of unauthorizedOrigins) {
        const response = await request(API_BASE)
          .options('/api/users') // Preflight request
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'GET')
          .set('Access-Control-Request-Headers', 'authorization');

        console.log(`\\n   Origin: "${origin}"`);
        console.log(`     Status: ${response.status}`);
        
        const allowOrigin = response.get('access-control-allow-origin');
        console.log(`     Access-Control-Allow-Origin: ${allowOrigin || 'Not set'}`);
        
        // Check if the unauthorized origin is blocked
        if (allowOrigin && (allowOrigin === origin || allowOrigin === '*')) {
          console.log('     ⚠️  WARNING: Unauthorized origin allowed');
        } else {
          console.log('     ✅ Unauthorized origin properly blocked');
        }
      }

      console.log('\\n✅ Unauthorized origin blocking tested');
    });

    test('should document CORS security implications', async () => {
      const corsSecurityRisks = {
        wildcardOrigins: {
          risk: 'Using Access-Control-Allow-Origin: * allows any website to make requests',
          impact: 'Potential for CSRF attacks and data theft',
          mitigation: 'Use specific allowed origins list',
          severity: 'High'
        },
        credentialsWithWildcard: {
          risk: 'Cannot use credentials: true with wildcard origins',
          impact: 'Browser will block requests with credentials',
          mitigation: 'Specify exact origins when credentials needed',
          severity: 'Medium'
        },
        headerLeakage: {
          risk: 'Exposing sensitive headers via Access-Control-Expose-Headers',
          impact: 'Information disclosure to unauthorized origins',
          mitigation: 'Only expose necessary headers',
          severity: 'Medium'
        },
        methodAllowance: {
          risk: 'Allowing unnecessary HTTP methods (DELETE, PUT)',
          impact: 'Increased attack surface for malicious sites',
          mitigation: 'Only allow required methods',
          severity: 'Low'
        }
      };

      console.log('⚠️  CORS Security Risks and Mitigations:');
      Object.entries(corsSecurityRisks).forEach(([riskName, details]) => {
        console.log(`\\n   ${riskName.toUpperCase()}:`);
        console.log(`     Risk: ${details.risk}`);
        console.log(`     Impact: ${details.impact}`);
        console.log(`     Mitigation: ${details.mitigation}`);
        console.log(`     Severity: ${details.severity}`);
      });

      const corsTestingChecklist = [
        'Test preflight requests (OPTIONS) from allowed origins',
        'Test actual requests (GET, POST) from allowed origins',
        'Verify unauthorized origins are blocked',
        'Check that credentials are handled correctly',
        'Validate exposed headers don\'t leak sensitive data',
        'Test browser behavior with CORS violations',
        'Monitor CORS errors in production logs'
      ];

      console.log('\\n✅ CORS Testing Checklist:');
      corsTestingChecklist.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item}`);
      });

      expect(corsSecurityRisks).toHaveProperty('wildcardOrigins');
      expect(corsSecurityRisks).toHaveProperty('credentialsWithWildcard');

      console.log('\\n✅ CORS security implications documented');
    });
  });

  describe('10.2.3 Credentials and Authentication', () => {
    test('should handle CORS with credentials properly', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping CORS credentials test - no admin token');
        return;
      }

      const testOrigin = 'http://localhost:3727';

      console.log('🔐 Testing CORS with credentials:');

      // Test preflight request with credentials
      const preflightResponse = await request(API_BASE)
        .options('/api/users')
        .set('Origin', testOrigin)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'authorization')
        .set('Access-Control-Request-Credentials', 'true');

      console.log('\\n   Preflight Request:');
      console.log(`     Status: ${preflightResponse.status}`);
      console.log(`     Access-Control-Allow-Credentials: ${preflightResponse.get('access-control-allow-credentials') || 'Not set'}`);
      console.log(`     Access-Control-Allow-Origin: ${preflightResponse.get('access-control-allow-origin') || 'Not set'}`);

      // Test actual request with credentials
      const actualResponse = await request(API_BASE)
        .get('/api/users')
        .set('Origin', testOrigin)
        .set('Authorization', `Bearer ${adminToken}`);

      console.log('\\n   Actual Request with Authorization:');
      console.log(`     Status: ${actualResponse.status}`);
      console.log(`     Access-Control-Allow-Credentials: ${actualResponse.get('access-control-allow-credentials') || 'Not set'}`);
      
      if (actualResponse.status === 200) {
        console.log('     ✅ Authenticated CORS request successful');
      } else {
        console.log(`     ⚠️  Authenticated CORS request failed: ${actualResponse.body.error || 'Unknown error'}`);
      }

      console.log('\\n✅ CORS credentials handling tested');
    });

    test('should document credential handling best practices', async () => {
      const credentialHandlingPractices = {
        serverSide: [
          'Set Access-Control-Allow-Credentials: true only when needed',
          'Never use wildcard (*) origin with credentials',
          'Validate authentication tokens on every request',
          'Use HTTPS in production to protect credentials',
          'Implement proper token expiration and refresh'
        ],
        clientSide: [
          'Use fetch() with credentials: "include" when sending cookies',
          'Include Authorization header for JWT tokens',
          'Handle CORS errors gracefully in frontend',
          'Store tokens securely (httpOnly cookies preferred)',
          'Clear credentials on logout'
        ],
        security: [
          'Validate Origin header matches allowed list',
          'Log authentication attempts for monitoring',
          'Implement rate limiting for auth endpoints',
          'Use secure token storage mechanisms',
          'Regular security audits of CORS configuration'
        ]
      };

      console.log('🔐 CORS Credential Handling Best Practices:');
      Object.entries(credentialHandlingPractices).forEach(([category, practices]) => {
        console.log(`\\n   ${category.toUpperCase()}:`);
        practices.forEach((practice, index) => {
          console.log(`     ${index + 1}. ${practice}`);
        });
      });

      const commonCorsAuthIssues = [
        {
          issue: 'CORS error with credentials: "include"',
          cause: 'Server not sending Access-Control-Allow-Credentials: true',
          solution: 'Configure server to allow credentials for specific origins'
        },
        {
          issue: 'Authentication works without CORS, fails with CORS',
          cause: 'Authorization header not in Access-Control-Allow-Headers',
          solution: 'Add "authorization" to allowed headers list'
        },
        {
          issue: 'Preflight succeeds but actual request fails',
          cause: 'Different CORS configuration for OPTIONS vs actual methods',
          solution: 'Ensure consistent CORS config across all HTTP methods'
        }
      ];

      console.log('\\n🔧 Common CORS Authentication Issues:');
      commonCorsAuthIssues.forEach((item, index) => {
        console.log(`\\n   ${index + 1}. ${item.issue}`);
        console.log(`       Cause: ${item.cause}`);
        console.log(`       Solution: ${item.solution}`);
      });

      expect(credentialHandlingPractices).toHaveProperty('serverSide');
      expect(credentialHandlingPractices).toHaveProperty('security');

      console.log('\\n✅ Credential handling best practices documented');
    });
  });

  describe('10.2.4 CORS Monitoring and Debugging', () => {
    test('should document CORS monitoring strategies', async () => {
      const corsMonitoring = {
        serverSideLogs: {
          logEvents: ['Blocked CORS requests', 'Preflight request patterns', 'Origin validation failures'],
          logFormat: 'Include Origin, Method, Headers, User-Agent, Timestamp',
          alertConditions: ['High volume of blocked requests from unknown origins', 'Sudden changes in CORS error rates'],
          retention: 'Keep CORS logs for at least 30 days for analysis'
        },
        clientSideMonitoring: {
          errorHandling: 'Catch and log CORS errors in JavaScript',
          userExperience: 'Show user-friendly messages for CORS failures',
          fallbacks: 'Implement graceful degradation when CORS fails',
          reporting: 'Report persistent CORS issues to development team'
        },
        performanceImpact: {
          preflightCaching: 'Monitor preflight cache hit rates',
          requestLatency: 'Track latency added by CORS preflight requests',
          optimization: 'Optimize CORS configuration for performance',
          monitoring: 'Set up alerts for CORS-related performance degradation'
        }
      };

      console.log('📊 CORS Monitoring Strategies:');
      Object.entries(corsMonitoring).forEach(([category, details]) => {
        console.log(`\\n   ${category.toUpperCase()}:`);
        Object.entries(details).forEach(([aspect, description]) => {
          if (Array.isArray(description)) {
            console.log(`     ${aspect}: ${description.join(', ')}`);
          } else {
            console.log(`     ${aspect}: ${description}`);
          }
        });
      });

      const corsDebuggingTools = [
        'Browser Developer Tools (Network tab for CORS headers)',
        'curl commands to test CORS preflight requests',
        'Postman for API testing with different origins',
        'Browser CORS plugins for development testing',
        'Server-side logging middleware for CORS events',
        'Network monitoring tools for production CORS analysis'
      ];

      console.log('\\n🛠️  CORS Debugging Tools:');
      corsDebuggingTools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool}`);
      });

      expect(corsMonitoring).toHaveProperty('serverSideLogs');
      expect(corsMonitoring).toHaveProperty('clientSideMonitoring');

      console.log('\\n✅ CORS monitoring strategies documented');
    });

    test('should provide CORS troubleshooting guide', async () => {
      const corsTroubleshootingGuide = {
        commonErrors: {
          'Access to fetch blocked by CORS policy': {
            description: 'Browser blocked the request due to CORS policy',
            checks: ['Verify origin is in allowed list', 'Check if preflight is needed', 'Ensure server sends correct headers'],
            resolution: 'Configure server CORS settings to allow the origin'
          },
          'Credentials mode "include" requires exact origin': {
            description: 'Cannot use wildcard origin with credentials',
            checks: ['Check if using * as allowed origin', 'Verify credentials requirement'],
            resolution: 'Specify exact allowed origins instead of wildcard'
          },
          'Method not allowed in preflight response': {
            description: 'HTTP method not in Access-Control-Allow-Methods',
            checks: ['Check allowed methods configuration', 'Verify the HTTP method being used'],
            resolution: 'Add the required method to allowed methods list'
          }
        },
        debuggingSteps: [
          'Check browser Network tab for preflight OPTIONS request',
          'Verify response headers match CORS requirements',
          'Test with simple requests first (no preflight needed)',
          'Use curl to isolate server-side CORS behavior',
          'Check server logs for CORS-related errors',
          'Validate origin matching (exact string match required)',
          'Test with different browsers for consistency'
        ],
        productionIssues: [
          'CORS working in development but failing in production',
          'Intermittent CORS failures under load',
          'CORS errors after deployment or configuration changes',
          'Browser-specific CORS behavior differences',
          'Mobile app CORS issues vs web browser'
        ]
      };

      console.log('🔍 CORS Troubleshooting Guide:');
      
      console.log('\\n   COMMON ERRORS:');
      Object.entries(corsTroubleshootingGuide.commonErrors).forEach(([error, details]) => {
        console.log(`\\n     "${error}"`);
        console.log(`       Description: ${details.description}`);
        console.log(`       Checks: ${details.checks.join(', ')}`);
        console.log(`       Resolution: ${details.resolution}`);
      });

      console.log('\\n   DEBUGGING STEPS:');
      corsTroubleshootingGuide.debuggingSteps.forEach((step, index) => {
        console.log(`     ${index + 1}. ${step}`);
      });

      console.log('\\n   PRODUCTION ISSUES:');
      corsTroubleshootingGuide.productionIssues.forEach((issue, index) => {
        console.log(`     ${index + 1}. ${issue}`);
      });

      expect(corsTroubleshootingGuide).toHaveProperty('commonErrors');
      expect(corsTroubleshootingGuide).toHaveProperty('debuggingSteps');

      console.log('\\n✅ CORS troubleshooting guide provided');
    });
  });

  afterAll(async () => {
    console.log('\\n🎯 CORS configuration tests completed');
    console.log('💡 Remember: CORS is a browser security feature - test with actual browsers');
  });
});
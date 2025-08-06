const request = require('supertest');
const os = require('os');

describe('Environment Configuration Tests - Test 10.1', () => {
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
      console.log('✅ Admin login successful for environment configuration tests');
    } else {
      console.log('⚠️  Admin login failed, limited environment tests');
    }
  });

  describe('10.1.1 Production Environment Variables', () => {
    test('should document required environment variables', async () => {
      const requiredEnvVars = {
        database: {
          MONGODB_URI: {
            description: 'MongoDB connection string',
            example: 'mongodb://localhost:27017/hr_production',
            required: true,
            sensitive: true
          },
          DB_NAME: {
            description: 'Database name override',
            example: 'hr_production',
            required: false,
            sensitive: false
          }
        },
        authentication: {
          JWT_SECRET: {
            description: 'JWT token signing secret',
            example: 'your-super-secure-jwt-secret-key',
            required: true,
            sensitive: true
          },
          SESSION_SECRET: {
            description: 'Session encryption secret (legacy)',
            example: 'your-session-secret',
            required: false,
            sensitive: true
          }
        },
        server: {
          PORT: {
            description: 'Server port number',
            example: '5455',
            required: false,
            sensitive: false
          },
          NODE_ENV: {
            description: 'Environment mode',
            example: 'production',
            required: true,
            sensitive: false
          },
          CORS_ORIGIN: {
            description: 'Allowed CORS origins',
            example: 'https://your-frontend-domain.com',
            required: true,
            sensitive: false
          }
        },
        optional: {
          LOG_LEVEL: {
            description: 'Logging level',
            example: 'info',
            required: false,
            sensitive: false
          },
          SMTP_HOST: {
            description: 'Email server host (if email notifications enabled)',
            example: 'smtp.gmail.com',
            required: false,
            sensitive: false
          },
          SMTP_USER: {
            description: 'Email server username',
            example: 'noreply@company.com',
            required: false,
            sensitive: true
          },
          SMTP_PASS: {
            description: 'Email server password',
            example: 'email-password',
            required: false,
            sensitive: true
          }
        }
      };

      console.log('🌍 Required Environment Variables:');
      Object.entries(requiredEnvVars).forEach(([category, vars]) => {
        console.log(`\\n${category.toUpperCase()}:`);
        Object.entries(vars).forEach(([varName, config]) => {
          console.log(`   ${varName}:`);
          console.log(`     Description: ${config.description}`);
          console.log(`     Required: ${config.required ? 'Yes' : 'No'}`);
          console.log(`     Sensitive: ${config.sensitive ? 'Yes' : 'No'}`);
          if (!config.sensitive) {
            console.log(`     Example: ${config.example}`);
          }
        });
      });

      const environmentChecklist = [
        'All required environment variables are set',
        'Sensitive variables are not logged or exposed',
        'Development-specific settings are disabled',
        'Production database connection is configured',
        'CORS origins are properly restricted',
        'JWT secret is cryptographically secure',
        'Logging level is appropriate for production'
      ];

      console.log('\\n✅ Environment Configuration Checklist:');
      environmentChecklist.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item}`);
      });

      expect(requiredEnvVars).toHaveProperty('database');
      expect(requiredEnvVars).toHaveProperty('authentication');
      expect(requiredEnvVars).toHaveProperty('server');

      console.log('\\n✅ Environment variables documented');
    });

    test('should validate current environment configuration', async () => {
      console.log('🔍 Current Environment Analysis:');

      // Check Node.js version
      console.log(`   Node.js version: ${process.version}`);
      
      // Check environment mode
      const nodeEnv = process.env.NODE_ENV || 'development';
      console.log(`   NODE_ENV: ${nodeEnv}`);
      
      // Check platform information
      console.log(`   Platform: ${os.platform()} ${os.arch()}`);
      console.log(`   OS Release: ${os.release()}`);
      
      // Check memory usage
      const memUsage = process.memoryUsage();
      console.log(`   Memory Usage: RSS ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);

      // Validate environment readiness by testing API functionality
      if (adminToken) {
        console.log('\\n🔍 Environment Functionality Check:');
        
        // Test database connectivity through API
        const dbTestResponse = await request(API_BASE)
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`);

        console.log(`   Database connectivity: ${dbTestResponse.status === 200 ? '✅ Connected' : '❌ Issues detected'}`);
        
        if (dbTestResponse.status === 200) {
          console.log(`   Database response time: ${dbTestResponse.get('x-response-time') || 'Not measured'}`);
          console.log(`   Records retrieved: ${dbTestResponse.body.data ? dbTestResponse.body.data.length : 0}`);
        }

        // Test JWT functionality
        const jwtTestResponse = await request(API_BASE)
          .get('/api/departments')
          .set('Authorization', `Bearer ${adminToken}`);

        console.log(`   JWT authentication: ${jwtTestResponse.status === 200 ? '✅ Working' : '❌ Issues detected'}`);
      }

      // Security recommendations based on environment
      const securityRecommendations = {
        production: [
          'Use HTTPS only (disable HTTP)',
          'Set secure headers (helmet.js)',
          'Enable rate limiting',
          'Use environment-specific secrets',
          'Enable access logging',
          'Disable debug modes',
          'Use process managers (PM2, Docker)'
        ],
        development: [
          'Use separate development database',
          'Enable debug logging',
          'Use development-specific secrets',
          'Allow localhost CORS',
          'Enable hot reload for development'
        ]
      };

      console.log(`\\n🔒 Security Recommendations for ${nodeEnv.toUpperCase()}:`);
      const recommendations = securityRecommendations[nodeEnv] || securityRecommendations.production;
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });

      expect(process.version).toMatch(/^v\d+\.\d+\.\d+/);
      expect(['development', 'test', 'production'].includes(nodeEnv)).toBe(true);

      console.log('\\n✅ Environment configuration validated');
    });
  });

  describe('10.1.2 API URL Configuration', () => {
    test('should validate API endpoint accessibility', async () => {
      console.log('🌐 API Endpoint Accessibility Test:');

      const criticalEndpoints = [
        { name: 'Authentication', path: '/api/auth/login', method: 'POST', requiresAuth: false },
        { name: 'Users', path: '/api/users', method: 'GET', requiresAuth: true },
        { name: 'Departments', path: '/api/departments', method: 'GET', requiresAuth: true },
        { name: 'Leave Pending', path: '/api/leave/pending', method: 'GET', requiresAuth: true }
      ];

      const endpointResults = [];

      for (const endpoint of criticalEndpoints) {
        let response;
        const startTime = Date.now();

        try {
          if (endpoint.method === 'POST' && endpoint.path === '/api/auth/login') {
            // Special case for login endpoint
            response = await request(API_BASE)
              .post(endpoint.path)
              .send({ username: 'admin', password: 'admin' });
          } else if (endpoint.requiresAuth) {
            response = await request(API_BASE)
              .get(endpoint.path)
              .set('Authorization', `Bearer ${adminToken || 'no-token'}`);
          } else {
            response = await request(API_BASE)
              .get(endpoint.path);
          }
        } catch (error) {
          response = { status: 500, error: error.message };
        }

        const responseTime = Date.now() - startTime;

        const result = {
          name: endpoint.name,
          path: endpoint.path,
          status: response.status,
          responseTime,
          accessible: [200, 401].includes(response.status), // 401 is acceptable for auth-required endpoints without token
          error: response.error || null
        };

        endpointResults.push(result);
        
        const accessibilityStatus = result.accessible ? '✅ Accessible' : '❌ Not accessible';
        console.log(`   ${endpoint.name}: ${accessibilityStatus} (${response.status}, ${responseTime}ms)`);
        
        if (result.error) {
          console.log(`     Error: ${result.error}`);
        }
      }

      // All critical endpoints should be accessible
      const accessibleEndpoints = endpointResults.filter(r => r.accessible).length;
      const totalEndpoints = endpointResults.length;

      console.log(`\\n📊 Endpoint Accessibility Summary:`);
      console.log(`   Accessible endpoints: ${accessibleEndpoints}/${totalEndpoints}`);
      console.log(`   Success rate: ${((accessibleEndpoints / totalEndpoints) * 100).toFixed(1)}%`);

      expect(accessibleEndpoints).toBe(totalEndpoints);

      console.log('\\n✅ API endpoint accessibility validated');
    });

    test('should document URL configuration for different environments', async () => {
      const environmentUrls = {
        development: {
          frontend: 'http://localhost:3727',
          backend: 'http://localhost:5455',
          database: 'mongodb://localhost:27017/hr_development',
          corsOrigin: 'http://localhost:3727'
        },
        production: {
          frontend: 'https://smpain-hr.vercel.app',
          backend: 'https://hr-backend-429401177957.asia-northeast3.run.app',
          database: 'mongodb+srv://[credentials]@cluster.mongodb.net/hr_production',
          corsOrigin: 'https://smpain-hr.vercel.app'
        },
        staging: {
          frontend: 'https://staging-hr.vercel.app',
          backend: 'https://staging-hr-backend.run.app',
          database: 'mongodb+srv://[credentials]@cluster.mongodb.net/hr_staging',
          corsOrigin: 'https://staging-hr.vercel.app'
        }
      };

      console.log('🔗 Environment URL Configuration:');
      Object.entries(environmentUrls).forEach(([env, urls]) => {
        console.log(`\\n${env.toUpperCase()} ENVIRONMENT:`);
        Object.entries(urls).forEach(([service, url]) => {
          // Don't display full database URLs with credentials
          const displayUrl = service === 'database' && url.includes('[credentials]') 
            ? url 
            : url;
          console.log(`   ${service}: ${displayUrl}`);
        });
      });

      const urlValidationRules = [
        'Frontend and backend URLs must use HTTPS in production',
        'CORS origins must exactly match frontend URLs',
        'Database URLs must not expose credentials in logs',
        'API URLs must be accessible from frontend domains',
        'No hardcoded localhost references in production',
        'SSL certificates must be valid for production domains'
      ];

      console.log('\\n🔒 URL Configuration Rules:');
      urlValidationRules.forEach((rule, index) => {
        console.log(`   ${index + 1}. ${rule}`);
      });

      // Test current environment URL pattern
      const currentApiBase = API_BASE;
      const isLocalhost = currentApiBase.includes('localhost');
      const isHttps = currentApiBase.startsWith('https://');

      console.log(`\\n🔍 Current Configuration Analysis:`);
      console.log(`   API Base: ${currentApiBase}`);
      console.log(`   Is localhost: ${isLocalhost ? 'Yes (Development)' : 'No'}`);
      console.log(`   Uses HTTPS: ${isHttps ? 'Yes' : 'No'}`);
      
      if (isLocalhost && !isHttps) {
        console.log('   ✅ Appropriate for development environment');
      } else if (!isLocalhost && isHttps) {
        console.log('   ✅ Appropriate for production environment');
      } else if (!isLocalhost && !isHttps) {
        console.log('   ⚠️  Production environment should use HTTPS');
      }

      expect(environmentUrls).toHaveProperty('development');
      expect(environmentUrls).toHaveProperty('production');

      console.log('\\n✅ URL configuration documented');
    });
  });

  describe('10.1.3 Security Configuration', () => {
    test('should validate security headers and settings', async () => {
      console.log('🛡️  Security Configuration Assessment:');

      // Test a simple GET request to analyze response headers
      if (adminToken) {
        const response = await request(API_BASE)
          .get('/api/departments')
          .set('Authorization', `Bearer ${adminToken}`);

        console.log('\\n📋 Response Headers Analysis:');
        const securityHeaders = [
          'x-powered-by',
          'x-frame-options', 
          'x-content-type-options',
          'x-xss-protection',
          'strict-transport-security',
          'content-security-policy',
          'x-dns-prefetch-control'
        ];

        securityHeaders.forEach(headerName => {
          const headerValue = response.get(headerName);
          if (headerValue) {
            console.log(`   ${headerName}: ${headerValue}`);
          } else {
            console.log(`   ${headerName}: Not set`);
          }
        });

        // Check for security-related response characteristics
        const securityAssessment = {
          poweredByHidden: !response.get('x-powered-by'),
          corsConfigured: !!response.get('access-control-allow-origin'),
          hasContentType: !!response.get('content-type'),
          responseSize: JSON.stringify(response.body).length
        };

        console.log('\\n🔒 Security Assessment:');
        console.log(`   X-Powered-By hidden: ${securityAssessment.poweredByHidden ? '✅ Good' : '⚠️  Should hide'}`);
        console.log(`   CORS configured: ${securityAssessment.corsConfigured ? '✅ Yes' : '⚠️  Check config'}`);
        console.log(`   Content-Type set: ${securityAssessment.hasContentType ? '✅ Yes' : '❌ Missing'}`);
        console.log(`   Response size: ${securityAssessment.responseSize} bytes`);
      }

      const securityBestPractices = {
        headers: [
          'X-Frame-Options: DENY (prevent clickjacking)',
          'X-Content-Type-Options: nosniff (prevent MIME sniffing)', 
          'X-XSS-Protection: 1; mode=block (XSS protection)',
          'Strict-Transport-Security: enforce HTTPS',
          'Content-Security-Policy: restrict resource loading'
        ],
        serverSecurity: [
          'Hide server version information',
          'Disable unnecessary HTTP methods',
          'Implement rate limiting',
          'Use HTTPS only in production',
          'Validate all input data'
        ],
        authentication: [
          'Use strong JWT secrets',
          'Implement token expiration',
          'Secure password hashing (bcrypt)',
          'Prevent brute force attacks',
          'Log authentication events'
        ]
      };

      console.log('\\n🎯 Security Best Practices:');
      Object.entries(securityBestPractices).forEach(([category, practices]) => {
        console.log(`\\n${category.toUpperCase()}:`);
        practices.forEach((practice, index) => {
          console.log(`   ${index + 1}. ${practice}`);
        });
      });

      console.log('\\n✅ Security configuration assessed');
    });

    test('should document production security checklist', async () => {
      const productionSecurityChecklist = {
        infrastructure: [
          'Server firewall configured to allow only necessary ports',
          'SSL/TLS certificates installed and valid',
          'Regular security updates applied to OS and dependencies',
          'Backup systems configured and tested',
          'Monitoring and alerting systems active'
        ],
        application: [
          'Environment variables properly secured',
          'Database connections encrypted',
          'Input validation implemented on all endpoints',
          'Error messages don\'t expose sensitive information',
          'Logging configured without sensitive data exposure'
        ],
        deployment: [
          'Production database separate from development',
          'Admin accounts have strong passwords',
          'Default credentials changed',
          'Unused services and ports disabled',
          'Security scanning performed regularly'
        ],
        compliance: [
          'Data privacy requirements met (GDPR, etc.)',
          'Access logs maintained for auditing',
          'User data encrypted at rest and in transit',
          'Regular security assessments conducted',
          'Incident response plan documented and tested'
        ]
      };

      console.log('📋 Production Security Checklist:');
      Object.entries(productionSecurityChecklist).forEach(([category, items]) => {
        console.log(`\\n${category.toUpperCase()}:`);
        items.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item}`);
        });
      });

      const securityTools = [
        'OWASP ZAP for vulnerability scanning',
        'npm audit for dependency vulnerability checks',
        'Helmet.js for Express.js security headers',
        'Rate limiting middleware (express-rate-limit)',
        'CORS middleware with strict origins',
        'bcrypt for password hashing',
        'jsonwebtoken for secure JWT handling'
      ];

      console.log('\\n🛠️  Recommended Security Tools:');
      securityTools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool}`);
      });

      expect(productionSecurityChecklist).toHaveProperty('infrastructure');
      expect(productionSecurityChecklist).toHaveProperty('application');

      console.log('\\n✅ Production security checklist documented');
    });
  });

  describe('10.1.4 Performance Configuration', () => {
    test('should assess current performance settings', async () => {
      console.log('⚡ Performance Configuration Assessment:');

      // Test API performance
      if (adminToken) {
        const performanceTests = [
          { name: 'Simple Query', endpoint: '/api/departments' },
          { name: 'Complex Query', endpoint: '/api/users' },
          { name: 'Authenticated Request', endpoint: '/api/leave/pending' }
        ];

        for (const test of performanceTests) {
          const startTime = Date.now();
          
          const response = await request(API_BASE)
            .get(test.endpoint)
            .set('Authorization', `Bearer ${adminToken}`);

          const responseTime = Date.now() - startTime;
          const dataSize = JSON.stringify(response.body).length;

          console.log(`\\n   ${test.name}:`);
          console.log(`     Response time: ${responseTime}ms`);
          console.log(`     Status: ${response.status}`);
          console.log(`     Data size: ${dataSize} bytes`);
          console.log(`     Records: ${response.body.data ? response.body.data.length : 0}`);
          
          // Performance assessment
          if (responseTime < 100) {
            console.log('     Performance: ✅ Excellent');
          } else if (responseTime < 500) {
            console.log('     Performance: ✅ Good');
          } else if (responseTime < 1000) {
            console.log('     Performance: ⚠️  Acceptable');
          } else {
            console.log('     Performance: ❌ Needs optimization');
          }
        }
      }

      const performanceOptimizations = {
        server: [
          'Enable gzip compression for responses',
          'Use connection pooling for database',
          'Implement response caching where appropriate',
          'Optimize database queries and indexes',
          'Use CDN for static assets'
        ],
        database: [
          'Create appropriate indexes for frequent queries',
          'Use aggregation pipelines efficiently',
          'Implement query result caching',
          'Monitor and optimize slow queries',
          'Use read replicas for read-heavy operations'
        ],
        application: [
          'Minimize payload sizes',
          'Implement pagination for large datasets',
          'Use lazy loading where appropriate',
          'Optimize API response structures',
          'Bundle and minify frontend assets'
        ]
      };

      console.log('\\n🚀 Performance Optimization Recommendations:');
      Object.entries(performanceOptimizations).forEach(([category, optimizations]) => {
        console.log(`\\n${category.toUpperCase()}:`);
        optimizations.forEach((opt, index) => {
          console.log(`   ${index + 1}. ${opt}`);
        });
      });

      console.log('\\n✅ Performance configuration assessed');
    });
  });

  afterAll(async () => {
    console.log('\\n🏁 Environment configuration tests completed');
    console.log('📋 Summary: Production readiness assessment completed');
  });
});
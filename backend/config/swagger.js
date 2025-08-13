/*
 * AI-HEADER
 * Intent: Swagger/OpenAPI configuration for HR Management System API
 * Domain Meaning: API documentation configuration and specification setup
 * Misleading Names: None
 * Data Contracts: OpenAPI 3.0 specification format, JWT authentication scheme
 * PII: No PII data - only API configuration and documentation setup
 * Invariants: All API endpoints must be documented with proper schemas
 * RAG Keywords: Swagger configuration, OpenAPI specification, API documentation
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Swagger Configuration
 * DomainMeaning: Central configuration for API documentation generation
 * MisleadingNames: None
 * SideEffects: Configures API documentation endpoints and UI
 * Invariants: Must maintain OpenAPI 3.0 compliance
 * RAG_Keywords: swagger config, openapi spec, api documentation setup
 * DuplicatePolicy: canonical - primary swagger configuration
 * FunctionIdentity: hash_swagger_config_001
 */

// Basic API information
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HR Management System API',
      version: '1.0.0',
      description: `
        HR Management System API for employee management and payroll processing.
        
        ## Features
        - Employee management and user authentication
        - Role-based access control (Admin, Supervisor, User)
        - Payroll data upload and processing with Excel preview functionality
        - Leave request management and approvals
        - Department management
        - Administrative tools and monitoring
        
        ## Authentication
        This API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Error Handling
        All endpoints return standardized error responses with the following format:
        \`\`\`json
        {
          "success": false,
          "error": "ERROR_CODE",
          "message": "Human-readable error description"
        }
        \`\`\`
      `,
      contact: {
        name: 'HR System API Support',
        email: 'admin@hr-system.local'
      },
      license: {
        name: 'Private',
        url: 'https://example.com/license'
      }
    },
    servers: [
      {
        url: 'http://localhost:5455',
        description: 'Development server'
      },
      {
        url: 'https://hr-backend-429401177957.asia-northeast3.run.app',
        description: 'Production server (Google Cloud Run)'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        // Standard API Response
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the request was successful'
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)'
            },
            message: {
              type: 'string',
              description: 'Optional success message'
            }
          },
          required: ['success']
        },
        
        // Error Response
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
              description: 'Always false for error responses'
            },
            error: {
              type: 'string',
              description: 'Error code for programmatic handling'
            },
            message: {
              type: 'string',
              description: 'Human-readable error message'
            }
          },
          required: ['success', 'error', 'message']
        },
        
        // User Model
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Unique user identifier'
            },
            username: {
              type: 'string',
              description: 'Username for login'
            },
            name: {
              type: 'string',
              description: 'Full name of the user'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address'
            },
            role: {
              type: 'string',
              enum: ['Admin', 'Supervisor', 'User'],
              description: 'User role for access control'
            },
            department: {
              type: 'string',
              description: 'Department ID the user belongs to'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user account is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            }
          },
          required: ['_id', 'username', 'role']
        },
        
        // Authentication Models
        LoginRequest: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username for authentication'
            },
            password: {
              type: 'string',
              description: 'Password for authentication'
            }
          },
          required: ['username', 'password']
        },
        
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            token: {
              type: 'string',
              description: 'JWT token for authenticated requests'
            },
            user: {
              $ref: '#/components/schemas/User'
            },
            message: {
              type: 'string',
              description: 'Success message'
            }
          },
          required: ['success', 'token', 'user']
        },
        
        // Payroll Models
        PayrollPreview: {
          type: 'object',
          properties: {
            previewToken: {
              type: 'string',
              description: 'Temporary token for preview data access'
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PayrollRecord'
              },
              description: 'Parsed payroll records for preview'
            },
            summary: {
              type: 'object',
              properties: {
                totalRecords: {
                  type: 'integer',
                  description: 'Total number of records'
                },
                validRecords: {
                  type: 'integer',
                  description: 'Number of valid records'
                },
                errorRecords: {
                  type: 'integer',
                  description: 'Number of records with errors'
                },
                warningRecords: {
                  type: 'integer',
                  description: 'Number of records with warnings'
                }
              }
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  row: { type: 'integer' },
                  field: { type: 'string' },
                  message: { type: 'string' },
                  severity: { 
                    type: 'string',
                    enum: ['error', 'warning']
                  }
                }
              }
            }
          },
          required: ['previewToken', 'data', 'summary']
        },
        
        PayrollRecord: {
          type: 'object',
          properties: {
            employeeId: {
              type: 'string',
              description: 'Employee identifier'
            },
            name: {
              type: 'string',
              description: 'Employee name'
            },
            baseSalary: {
              type: 'number',
              description: 'Base salary amount'
            },
            overtimePay: {
              type: 'number',
              description: 'Overtime payment'
            },
            incentives: {
              type: 'number',
              description: 'Performance incentives'
            },
            deductions: {
              type: 'object',
              properties: {
                tax: { type: 'number' },
                insurance: { type: 'number' },
                pension: { type: 'number' },
                other: { type: 'number' }
              }
            },
            netPay: {
              type: 'number',
              description: 'Net pay after deductions'
            },
            payPeriod: {
              type: 'string',
              format: 'date',
              description: 'Pay period (YYYY-MM format)'
            }
          }
        },
        
        // Admin Models
        SystemStatus: {
          type: 'object',
          properties: {
            tempUploads: {
              type: 'object',
              properties: {
                count: { type: 'integer' },
                totalSizeMB: { type: 'number' },
                oldestEntry: { type: 'string', format: 'date-time' }
              }
            },
            systemHealth: {
              type: 'object',
              properties: {
                status: { 
                  type: 'string',
                  enum: ['healthy', 'warning', 'critical']
                },
                uptime: { type: 'number' },
                memoryUsage: { type: 'number' }
              }
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: [
    './routes/*.js',
    './routes/**/*.js'
  ]
};

// Generate Swagger specification
const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger middleware for Express app
 * DomainMeaning: Configures Swagger UI and JSON endpoints
 * MisleadingNames: None
 * SideEffects: Adds /api-docs routes to Express application
 * Invariants: Must be called after Express app initialization
 * RAG_Keywords: swagger middleware, express setup, api docs routes
 * DuplicatePolicy: canonical - primary swagger middleware setup
 * FunctionIdentity: hash_swagger_middleware_002
 */
const setupSwagger = (app) => {
  // Serve Swagger JSON specification
  app.get('/api-docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "HR Management System API Docs",
    customfavIcon: "/favicon.ico"
  }));

  console.log('📚 Swagger API documentation available at: /api-docs');
  console.log('📝 OpenAPI specification available at: /api-docs/swagger.json');
};

module.exports = {
  swaggerSpec,
  setupSwagger
};
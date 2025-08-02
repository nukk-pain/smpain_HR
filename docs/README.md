# HR System Documentation Index

## 📚 Documentation Structure

This directory contains all documentation for the HR Management System, organized by category.

### 📁 Directory Structure

```
docs/
├── setup/              # Installation and setup guides
├── api/                # API documentation and references
├── development/        # Development guides and standards
├── architecture/       # System design and architecture
├── deployment/         # Deployment guides and troubleshooting
├── reports/            # Project reports and summaries
├── planning/           # Current project planning documents
├── previous_plans/     # Historical planning documents
├── CLOUD_RUN_DEPLOYMENT.md     # Google Cloud deployment
├── ENVIRONMENT_SETUP.md        # Environment configuration
├── MONGODB_ATLAS_SETUP.md      # MongoDB Atlas setup
└── VERCEL_DEPLOYMENT.md        # Vercel frontend deployment
```

## 🔍 Quick Links

### Setup & Deployment
- [Project Overview](setup/README.md) - Main project README with JWT authentication
- [Deployment Guide](setup/DEPLOYMENT.md) - Production deployment with JWT configuration
- [Environment Setup](setup/ENVIRONMENT_SETUP.md) - JWT environment variables and configuration
- [MongoDB Setup](setup/MONGODB_SETUP.md) - Database configuration with JWT migration
- [MongoDB Credentials](setup/MONGODB_CREDENTIALS.md) - Database access information
- [MongoDB Atlas Setup](MONGODB_ATLAS_SETUP.md) - Cloud database setup guide
- [Cloud Run Deployment](CLOUD_RUN_DEPLOYMENT.md) - Google Cloud deployment with JWT
- [Vercel Deployment](VERCEL_DEPLOYMENT.md) - Frontend deployment configuration
- [Environment Setup (Root)](ENVIRONMENT_SETUP.md) - Root level environment configuration

### Deployment Guides
- [Complete Deployment Guide](deployment/complete-deployment-guide.md) - End-to-end deployment
- [Troubleshooting Deployment](deployment/TROUBLESHOOTING_DEPLOYMENT.md) - JWT deployment debugging
- [JWT Migration Complete](deployment/jwt-migration-complete.md) - Migration completion report
- [JWT Phase 3 Progress](deployment/jwt-phase3-progress.md) - Implementation progress
- [JWT Phase 3 Summary](deployment/jwt-phase3-summary.md) - Phase summary
- [JWT Testing Results](deployment/jwt-testing-results.md) - Testing outcomes
- [Frontend JWT Test Guide](deployment/frontend-jwt-test-guide.md) - Frontend testing procedures
- [Nginx Reverse Proxy](deployment/nginx-reverse-proxy.conf) - Proxy configuration

### API Documentation
- [API Documentation](api/DOCUMENTATION.md) - Complete JWT API reference with Authorization headers
- [API Endpoints](api/ENDPOINTS.md) - JWT-based API endpoints and authentication
- [API Cleanup Summary](api/cleanup-summary.md) - API optimization report

### Development Guides
- [Claude AI Instructions](development/CLAUDE.md) - JWT architecture and development guidelines
- [Configuration Enforcement](development/CONFIG_ENFORCEMENT.md) - Config management guide
- [Test Guide](development/TEST_GUIDE.md) - JWT token-based testing procedures
- [Functions & Variables](development/FUNCTIONS_VARIABLES.md) - Code reference

### Architecture
- [Performance Guide](architecture/PERFORMANCE.md) - JWT stateless performance optimization
- [Pages Structure](architecture/PAGES.md) - JWT-protected frontend pages and routing

### Reports & Summaries
- [Progress Report](reports/progress.md) - Project progress tracking
- [Refactoring Summary](reports/refactoring-summary.md) - Code refactoring report
- [Optimization Summary](reports/optimization-summary.md) - System optimization report
- [API Consistency Fixes](reports/api-consistency-fixes-summary.md) - API fixes report

### Planning
- [Current Plan](planning/current-plan.md) - Active development plan
- [Previous Plan](planning/previous-plan.md) - Historical planning
- [Frontend-Backend Plan](planning/frontend-backend-plan.md) - Integration planning

### Previous Plans (Archive)
- [Plan 1](previous_plans/plan1.md) - Initial planning document
- [Plan 2](previous_plans/plan2.md) - Second iteration planning
- [Plan Brief](previous_plans/plan_brief.md) - Brief planning overview
- [MUI v7 Plan](previous_plans/plan-muiv7.md) - Material-UI upgrade planning
- [Vite Bundle Optimization](previous_plans/plan-%20Vite%20Bundle%20최적화%20계획.md) - Bundle optimization plan

## 🎯 Quick Start Guides

### For New Developers
1. Start with [Project Overview](setup/README.md) - understand JWT architecture
2. Set up [Environment Variables](setup/ENVIRONMENT_SETUP.md) - configure JWT secrets
3. Choose deployment method:
   - [Cloud Run Deployment](CLOUD_RUN_DEPLOYMENT.md) for Google Cloud
   - [Vercel Deployment](VERCEL_DEPLOYMENT.md) for frontend
   - [Complete Deployment Guide](deployment/complete-deployment-guide.md) for full setup
4. Read [Claude AI Instructions](development/CLAUDE.md) for development guidelines
5. Review [Test Guide](development/TEST_GUIDE.md) for JWT token testing procedures
6. If issues arise, check [Troubleshooting Guide](deployment/TROUBLESHOOTING_DEPLOYMENT.md)

### For API Development
1. Check [API Documentation](api/DOCUMENTATION.md) - JWT authentication examples
2. Review [API Endpoints](api/ENDPOINTS.md) - Authorization header requirements
3. Test with [JWT Testing Scripts](../scripts/test-jwt-endpoints.js)
4. See [API Cleanup Summary](api/cleanup-summary.md) for recent changes

### For System Architecture
1. Study [Pages Structure](architecture/PAGES.md) - JWT-protected routing
2. Review [Performance Guide](architecture/PERFORMANCE.md) - stateless JWT benefits
3. Understand deployment options:
   - [Complete Deployment Guide](deployment/complete-deployment-guide.md) for full setup
   - [JWT Migration Report](deployment/jwt-migration-complete.md) for architecture changes
4. Review [JWT Phase 3 Summary](deployment/jwt-phase3-summary.md) for implementation details

## 📋 Documentation Standards

- **File Names**: Use UPPERCASE for main docs, lowercase for reports
- **Format**: Markdown (.md) for all documentation
- **Updates**: Keep documentation synchronized with code changes
- **Cross-References**: Use relative links between documents

## 🔄 Recent Updates

- **JWT Migration Complete** (August 2025): All documentation updated for JWT authentication
- Added comprehensive deployment guides for Google Cloud Run and Vercel
- Implemented JWT Phase 4 features (refresh tokens, token blacklisting)
- Created detailed troubleshooting and testing documentation
- Updated API documentation with Authorization header examples
- Reorganized documentation structure with dedicated deployment folder
- Added historical planning documents archive
- Enhanced MongoDB Atlas setup documentation

## 📞 Need Help?

### Quick Troubleshooting
1. **Deployment Issues**: Check [Troubleshooting Deployment](deployment/TROUBLESHOOTING_DEPLOYMENT.md)
2. **JWT Authentication Problems**: Review [JWT Testing Results](deployment/jwt-testing-results.md)
3. **API Issues**: Consult [API Documentation](api/DOCUMENTATION.md)
4. **Environment Setup**: See [Environment Setup](setup/ENVIRONMENT_SETUP.md)

### Development Support
- Review [Functions & Variables](development/FUNCTIONS_VARIABLES.md) for code references
- Consult [Claude AI Instructions](development/CLAUDE.md) for development practices
- Check [Progress Report](reports/progress.md) for project status
- Use [Frontend JWT Test Guide](deployment/frontend-jwt-test-guide.md) for testing
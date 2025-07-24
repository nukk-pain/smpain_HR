# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# ROLE AND EXPERTISE

You are a senior software engineer who follows Kent Beck's Test-Driven Development (TDD) and Tidy First principles. Your purpose is to guide development following these methodologies precisely.

# CORE DEVELOPMENT PRINCIPLES

- Always follow the TDD cycle: Red → Green → Refactor
- Write the simplest failing test first
- Implement the minimum code needed to make tests pass
- Refactor only after tests are passing
- Follow Beck's "Tidy First" approach by separating structural changes from behavioral changes
- Maintain high code quality throughout development

# TDD METHODOLOGY GUIDANCE

- Start by writing a failing test that defines a small increment of functionality
- Use meaningful test names that describe behavior (e.g., "shouldSumTwoPositiveNumbers")
- Make test failures clear and informative
- Write just enough code to make the test pass - no more
- Once tests pass, consider if refactoring is needed
- Repeat the cycle for new functionality
- When fixing a defect, first write an API-level failing test then write the smallest possible test that replicates the problem then get both tests to pass.

# TIDY FIRST APPROACH

- Separate all changes into two distinct types:
  1. STRUCTURAL CHANGES: Rearranging code without changing behavior (renaming, extracting methods, moving code)
  2. BEHAVIORAL CHANGES: Adding or modifying actual functionality
- Never mix structural and behavioral changes in the same commit
- Always make structural changes first when both are needed
- Validate structural changes do not alter behavior by running tests before and after

# COMMIT DISCIPLINE

- Only commit when:
  1. ALL tests are passing
  2. ALL compiler/linter warnings have been resolved
  3. The change represents a single logical unit of work
  4. Commit messages clearly state whether the commit contains structural or behavioral changes
- Use small, frequent commits rather than large, infrequent ones
- commit 하라고 하기 전까지는 commit하지 마

# CODE QUALITY STANDARDS

- Eliminate duplication ruthlessly
- Express intent clearly through naming and structure
- Make dependencies explicit
- Keep methods small and focused on a single responsibility
- Minimize state and side effects
- Use the simplest solution that could possibly work

# REFACTORING GUIDELINES

- Refactor only when tests are passing (in the "Green" phase)
- Use established refactoring patterns with their proper names
- Make one refactoring change at a time
- Run tests after each refactoring step
- Prioritize refactorings that remove duplication or improve clarity

# EXAMPLE WORKFLOW

When approaching a new feature:

1. Write a simple failing test for a small part of the feature
2. Implement the bare minimum to make it pass
3. Run tests to confirm they pass (Green)
4. Make any necessary structural changes (Tidy First), running tests after each change
5. Commit structural changes separately
6. Add another test for the next small increment of functionality
7. Repeat until the feature is complete, committing behavioral changes separately from structural ones

Follow this process precisely, always prioritizing clean, well-tested code over quick implementation.

Always write one test at a time, make it run, then improve structure. Always run all the tests (except long-running tests) each time.

# IMPORTANT
Never use a mock data. use the data from mongodb.

## Project Overview

This is an HR management system with payroll functionality, built with Node.js Express backend and React TypeScript frontend. The system handles employee leave tracking, payroll calculations with incentives, and user management with role-based access control.

## Development Guidelines

### Code and Documentation Best Practices
- 변수나 함수를 만들 때에는 root 폴더에 md파일을 하나 만들어서 그 파일에 어떤 기능을 하는 변수, 함수를 정리해줘. 그리고 새로운 기능을 추가할 때마다 그 md파일을 검토해서 기존에 같은 역할을 하는 경우 그것을 이용하도록 해줘.

### **CRITICAL: Field Name and API Consistency**
**ALWAYS verify that frontend, backend, and MongoDB use consistent field names and API structures:**

1. **Before making any changes**: Check existing field names across all layers
2. **When creating new APIs**: Ensure request/response formats match frontend expectations
3. **When modifying data structures**: Update all related components (frontend types, backend models, API responses)
4. **Common mismatches to watch for**:
   - Frontend expects `title` but backend stores `name`
   - Frontend sends `userId` but backend expects `user_id`
   - Array fields that might be undefined in one layer but expected as arrays in another
   - Date format inconsistencies (ISO strings vs Date objects)

**Process to follow**:
1. Read existing backend API route to understand current data structure
2. Check frontend component/service to see what fields it expects
3. Verify MongoDB collection structure if needed
4. Make consistent changes across all layers
5. Test the full data flow from frontend → backend → database → response → frontend

This prevents bugs like fields not displaying, API errors, or data persistence issues.

### **CRITICAL: Always Test After Changes**
**Every time you create or modify functionality, you MUST test that it works properly:**

1. **After creating new features**: 
   - Test the complete user flow from frontend to database
   - Verify all CRUD operations work as expected
   - Check error handling and edge cases

2. **After modifying existing code**:
   - Test that existing functionality still works (regression testing)
   - Verify the specific changes work as intended
   - Test related features that might be affected

3. **Testing checklist**:
   - Frontend UI displays correctly and handles user input
   - API endpoints return expected responses
   - Database operations (create, read, update, delete) work properly
   - Error messages are clear and helpful
   - Loading states and user feedback work correctly

4. **How to test**:
   - Use browser developer tools to check network requests
   - Verify database changes using MongoDB queries
   - Test different user roles and permissions
   - Try invalid inputs to test error handling
   - Check console for any JavaScript errors

**Never commit or mark tasks as complete without testing the functionality end-to-end.**

## Common Development Commands

### Backend Development
```bash
cd backend
npm run dev        # Start with nodemon for hot reloading
npm start          # Production mode
```

### Frontend Development
```bash
cd frontend
npm run dev        # Start Vite dev server on port 3727
npm run build      # Production build
npm run build-check # TypeScript check + build
```

### Quick Start (Development)
```bash
# Linux/WSL/macOS
./start-simple.sh

# Windows
start.bat
```

### Database Operations
```bash
# Reset database to initial state
node scripts/resetDatabase.js

# MongoDB connection (development)
mongodb://localhost:27017/SM_nomu

# MongoDB connection (production - Docker)
mongodb://hr_app_user:Hr2025Secure@localhost:27018/SM_nomu?authSource=SM_nomu
```

## High-Level Architecture

### Backend Architecture
- **Session-based authentication**: Uses express-session with connect-mongo store
- **Role-based access control (RBAC)**: Three roles (Admin, Manager, User) with fine-grained permissions
- **Modular route structure**: Features split into separate route files under `backend/routes/`
- **Validation layer**: Joi schemas for request validation
- **Error handling**: Centralized async error handling with proper status codes
- **File processing**: Excel upload/download for payroll data and reports

### Frontend Architecture
- **TypeScript-first**: Full type safety with strict TypeScript configuration
- **Component structure**: Pages for routes, components for reusable UI
- **Configuration enforcement**: Custom hooks prevent hardcoding, centralized in `frontend/src/config/`
- **Material-UI theming**: Consistent design system with custom theme
- **AG Grid integration**: Advanced data tables for payroll and employee listings
- **Optimized builds**: Vite with chunk splitting and minification

### Key Business Logic

#### Leave Management
- Annual leave calculation: First year monthly accrual (max 11), then 15 + (years - 1) capped at 25
- Advance use allowed up to -3 days
- Maximum carryover: 15 days
- Saturday counts as 0.5 days
- Minimum advance notice: 3 days
- Maximum consecutive leave: 15 days

#### Payroll System
- Base salary + various allowances
- Incentive calculation based on performance
- Four mandatory deductions support
- Excel-based data import/export
- PDF payslip generation

### Database Schema Overview
- **users**: Employee records with role, permissions, department
- **leave_requests**: Leave applications with approval workflow
- **leave_balances**: Current leave balance tracking
- **departments**: Organizational structure
- **payroll**: Monthly payroll records with calculations
- **sessions**: MongoDB session storage

### API Endpoints Structure
- `/api/auth/*` - Authentication (login, logout, check)
- `/api/users/*` - User management CRUD
- `/api/leave/*` - Leave requests, approvals, balances
- `/api/departments/*` - Department management
- `/api/payroll/*` - Payroll operations and reports
- `/api/reports/*` - Various report generation

### Testing Approach
Currently using manual testing with TEST_GUIDE.md. When implementing automated tests:
- Use Jest for unit tests
- Supertest for API integration tests
- React Testing Library for frontend components
- Always test with real MongoDB data, never mocks

### Security Considerations
- Passwords hashed with bcryptjs (10 rounds)
- Session cookies with httpOnly, secure flags
- Input validation on all endpoints
- File upload restrictions and virus scanning
- Role-based API access control

### Performance Optimizations
- Frontend code splitting by route
- Lazy loading for heavy components
- MongoDB indexes on frequently queried fields
- Session cleanup job for expired sessions
- Pagination on all list endpoints

### Development Workflow
1. Check FUNCTIONS_VARIABLES.md before creating new functions
2. Follow TDD cycle for new features
3. Separate structural and behavioral changes
4. Test manually following TEST_GUIDE.md
5. Only commit when explicitly requested
6. Update documentation for new features

### UI Development Notes
- Project uses Material-UI, not Tailwind CSS
- Follow Material Design principles
- Use MUI theme for consistent styling
- Responsive design required for all pages
- AG Grid for complex data tables

### Configuration Files
- `backend/config/` - Server configuration
- `frontend/src/config/` - Frontend constants and settings
- `ecosystem.config.js` - PM2 production configuration
- Never hardcode values - always use configuration
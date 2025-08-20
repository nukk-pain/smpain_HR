# CLAUDE.md

Always follow the instructions in plan.md. When I say "go", find the next unmarked test in plan.md, implement the test, then implement only enough code to make that test pass.

# PLANNING PRINCIPLES

When creating any development plan, ALWAYS apply TDD methodology:
- Every plan must be structured as a series of test-implementation cycles
- Each task in the plan should follow: Write Test → Run Test (Red) → Implement → Run Test (Green) → Refactor
- Plans should break down features into small, testable increments
- Each increment should have its own test case defined before implementation
- Never plan to implement features without corresponding tests

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
- 변수나 함수를 만들 때에는 `docs/development/FUNCTIONS_VARIABLES.md` 파일에 어떤 기능을 하는 변수, 함수를 정리해줘. 그리고 새로운 기능을 추가할 때마다 그 md파일을 검토해서 기존에 같은 역할을 하는 경우 그것을 이용하도록 해줘.

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

# MongoDB connection (development - Atlas)
# ⚠️ SECURITY: Use environment variables - never commit credentials
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# MongoDB connection (production - Google Cloud)
# ⚠️ SECURITY: Set via Google Cloud Secret Manager
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

## High-Level Architecture

### Backend Architecture
- **JWT token-based authentication**: Stateless authentication using JWT tokens (migrated from sessions Aug 2025)
- **Role-based access control (RBAC)**: Three roles (Admin, Supervisor, User) with fine-grained permissions
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
- **~~sessions~~**: ❌ Removed (JWT is stateless, no server-side session storage needed)

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
- **JWT token authentication** with Authorization headers (no cookies needed)
- **Stateless authentication** - no server-side session storage
- **Cross-domain compatible** - works with Vercel frontend + Cloud Run backend
- **Token expiration and refresh** (Phase 4 features available)
- **Server-side token blacklisting** (optional Phase 4 feature)
- Input validation on all endpoints
- File upload restrictions and virus scanning
- Role-based API access control

### Performance Optimizations
- Frontend code splitting by route
- Lazy loading for heavy components
- MongoDB indexes on frequently queried fields
- **JWT stateless architecture** - no session cleanup needed
- **Reduced database load** - no session read/write operations
- Pagination on all list endpoints

### Development Workflow

#### Pre-Development Phase
1. **Review existing code**: Check `docs/development/FUNCTIONS_VARIABLES.md` to avoid duplicating existing functions
2. **Plan with TDD**: Break down the feature into small, testable increments
3. **Check field consistency**: Verify field names across frontend, backend, and MongoDB layers

#### TDD Development Cycle
1. **Write failing test first**: Define expected behavior before implementation
2. **Run test to see it fail (Red)**: Confirm the test properly detects the missing functionality
3. **Implement minimal code**: Write just enough code to make the test pass
4. **Run test to see it pass (Green)**: Verify implementation meets requirements
5. **Refactor if needed**: Improve code structure while keeping tests green
6. **Repeat cycle**: Continue with the next test for the next increment

#### Code Organization
1. **Separate changes**: Never mix structural changes (refactoring) with behavioral changes (new features)
2. **Structural changes first**: When both are needed, commit structural changes separately
3. **Test after each change**: Run relevant tests after every modification

#### Quality Assurance
1. **Manual testing**: Follow `docs/development/TEST_GUIDE.md` for end-to-end verification
2. **Cross-layer validation**: Test data flow from frontend → API → database → response
3. **Error handling**: Verify edge cases and error scenarios work correctly

#### Documentation & Commit
1. **Update FUNCTIONS_VARIABLES.md**: Document new functions and their purposes
2. **Update relevant docs**: Keep API documentation and guides current
3. **Commit only when requested**: Never auto-commit; wait for explicit user instruction
4. **Clear commit messages**: Specify whether commits contain structural or behavioral changes

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

## Backend Infrastructure Details

- backend는 google cloud에서 작동중이야.

## Deployment URLs

- **Frontend (Vercel)**: https://smpain-hr.vercel.app/
- **Backend (Google Cloud Run)**: https://hr-backend-429401177957.asia-northeast3.run.app

## HR Understanding Notes

- supervisor는 팀과 완전 무관한 직책이야.

## Project Structure Guidelines

- 수정 계획은 root 폴더에 만들고 docs에는 영구적으로 남길 파일만 남겨줘.

## Development Notes

- frontend, backend 실행은 사용자에게 따로 요청할 것 
- 코드는 최대 1000줄까지만 작성하도록. 넘어가면 refactoring 계획을 세워서 md 파일로 정리.
- '/mnt/d/my_programs/HR/todo.md' 이 파일에서는 완성된 작업은 지우고 앞으로 할 작업만 남겨줘.
- 계획을 세울 때에는 항상 todo.md파일에 기록을 남겨서 알아보기 쉽게 해줘.
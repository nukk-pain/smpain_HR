# Payroll System Phase 1 Implementation Plan

## AI-HEADER
- **Intent**: Implement core payroll management features for HR system
- **Domain Meaning**: Employee compensation tracking and payment processing
- **Misleading Names**: "salary" vs "payroll" - payroll includes all compensation
- **Data Contracts**: Payroll data must include base_salary, allowances, deductions
- **PII**: Contains sensitive salary information - requires encryption
- **Invariants**: Total pay = base + allowances - deductions; Pay cannot be negative
- **RAG Keywords**: payroll, salary, compensation, payslip, wage, deductions, allowances

## Phase 1 목표 (1-2개월)
핵심 급여 관리 기능 구현 - 기본 CRUD, 엑셀 연동, PDF 명세서 관리

## 구현 순서 및 체크리스트

### Week 1-2: Database Schema & Backend Infrastructure

#### 1. Database Schema 설계
- [x] `payroll` collection 스키마 정의 (Implemented via PayrollRepository with comprehensive schema)
  ```javascript
  {
    _id: ObjectId,
    userId: ObjectId,
    year: Number,
    month: Number,
    baseSalary: Number,
    allowances: {
      overtime: Number,
      position: Number,
      meal: Number,
      transportation: Number,
      other: Number
    },
    deductions: {
      nationalPension: Number,
      healthInsurance: Number,
      employmentInsurance: Number,
      incomeTax: Number,
      localIncomeTax: Number,
      other: Number
    },
    netSalary: Number,
    paymentDate: Date,
    paymentStatus: String, // 'pending', 'approved', 'paid'
    createdAt: Date,
    updatedAt: Date,
    createdBy: ObjectId,
    approvedBy: ObjectId
  }
  ```

- [x] `payroll_templates` collection 스키마 정의 (Implemented via PayrollTemplateRepository with calculation rules)
  ```javascript
  {
    _id: ObjectId,
    name: String,
    description: String,
    baseSalaryRules: Object,
    allowanceRules: Object,
    deductionRules: Object,
    isActive: Boolean,
    createdAt: Date,
    updatedAt: Date
  }
  ```

- [x] `payroll_documents` collection 스키마 정의 (Implemented via PayrollDocumentRepository with security features)
  ```javascript
  {
    _id: ObjectId,
    payrollId: ObjectId,
    userId: ObjectId,
    year: Number,
    month: Number,
    documentType: String, // 'payslip', 'tax_statement'
    fileName: String,
    filePath: String,
    fileSize: Number,
    uploadedAt: Date,
    uploadedBy: ObjectId
  }
  ```

- [x] MongoDB 인덱스 생성 (Completed - indexes created for all payroll collections)
  ```javascript
  // payroll indexes
  db.payroll.createIndex({ userId: 1, year: -1, month: -1 })
  db.payroll.createIndex({ paymentStatus: 1 })
  db.payroll.createIndex({ year: 1, month: 1 })
  
  // payroll_documents indexes
  db.payroll_documents.createIndex({ userId: 1, year: -1, month: -1 })
  db.payroll_documents.createIndex({ payrollId: 1 })
  ```

#### 2. Backend Models 생성
- [x] Enhanced PayrollRepository with comprehensive schema implementation (TDD approach)
  - Enhanced `createPayroll` method with allowances/deductions calculation
  - `approvePayroll` method for workflow management 
  - `findByUserAndPeriod` method for specific lookups
  - `getPayrollSummaryByPeriod` method for aggregations
  - Comprehensive test coverage with 6 passing tests
- [x] PayrollTemplateRepository with comprehensive calculation engine (TDD approach)
  - `createTemplate` method with rule validation
  - `applyTemplate` method for payroll calculations
  - Template versioning and lifecycle management
  - Advanced calculation rules (percentage, tax tables, hourly rates)
  - Comprehensive test coverage with 6 passing tests
- [x] PayrollDocumentRepository with security and audit features (TDD approach)
  - `createDocument` method with file validation
  - Document lifecycle management (active, archived, deleted)
  - Secure download URL generation with expiration
  - Complete access history and audit logging
  - File type and size validation
  - Comprehensive test coverage with 9 passing tests

### Week 2-3: Backend API Development

#### 3. Payroll CRUD API (✅ COMPLETED)
- [x] `POST /api/payroll` - 급여 정보 생성 (Enhanced implementation with allowances/deductions)
  - Request validation (Enhanced Joi schema with nested objects)
  - 권한 체크 (Admin/HR only with permission middleware)
  - 중복 체크 (same user, year, month with repository validation)
  - Automatic total calculations (totalAllowances, totalDeductions, netSalary)
  
- [x] `GET /api/payroll` - 급여 목록 조회 (Enhanced with user lookup)
  - Pagination 지원 (query parameters: page, limit)
  - Filter: year, month, userId, paymentStatus
  - Role-based access (Users see only their own records)
  - User information included via MongoDB aggregation
  
- [x] `GET /api/payroll/:id` - 급여 상세 조회 (Enhanced with user data)
  - 권한별 접근 제어 (Users can only view own records)
  - Full payroll details with user information
  - MongoDB aggregation for joined data
  
- [x] `PUT /api/payroll/:id` - 급여 정보 수정 (Enhanced with recalculation)
  - Admin/HR only permissions
  - Automatic total recalculation on updates
  - Audit trail with updatedBy and updatedAt
  - Partial update support for allowances/deductions
  
- [x] `DELETE /api/payroll/:id` - 급여 정보 삭제 (Soft delete implementation)
  - Admin only permissions
  - Soft delete with isDeleted flag and audit trail
  - Status update to 'cancelled' for workflow consistency

**Implementation Details:**
- Route file: `backend/routes/payroll-enhanced.js` 
- Validation schemas updated in `backend/validation/schemas.js`
- Comprehensive test coverage: 9/9 tests passing
- Full integration with PayrollRepository TDD implementation

#### 4. Excel Upload/Download API
- [ ] `POST /api/payroll/excel/upload` - 엑셀 일괄 업로드
  ```javascript
  // Expected Excel columns:
  // 사번 | 이름 | 기본급 | 시간외수당 | 직책수당 | 식대 | 교통비 | 
  // 국민연금 | 건강보험 | 고용보험 | 소득세 | 지방소득세
  ```
  - File validation (xlsx, xls only)
  - Data validation
  - Batch insert with transaction
  - Error report generation
  
- [ ] `GET /api/payroll/excel/template` - 엑셀 템플릿 다운로드
  - Generate empty template
  - Include validation rules
  
- [ ] `GET /api/payroll/excel/export` - 급여 데이터 엑셀 export
  - Filter options
  - Format options

#### 5. PDF Payslip Management API
- [ ] `POST /api/payroll/:id/payslip/upload` - PDF 급여명세서 업로드
  - File validation (PDF only)
  - File size limit (5MB)
  - Virus scan
  - Store in GridFS or file system
  
- [ ] `GET /api/payroll/:id/payslip` - 급여명세서 다운로드
  - Access control
  - Audit logging
  
- [ ] `DELETE /api/payroll/:id/payslip` - 급여명세서 삭제
  - Admin only

### Week 3-4: Frontend Development

#### 6. Payroll List Page
- [ ] `frontend/src/pages/Payroll/PayrollList.tsx` 생성
  - AG Grid integration
  - Columns: 년월, 사원명, 부서, 기본급, 수당, 공제, 실수령액, 상태
  - Filter controls
  - Pagination
  - Excel export button
  
- [ ] Search and filter functionality
  - Year/Month selector
  - Department filter
  - Status filter
  - Employee search

#### 7. Payroll Detail/Edit Page  
- [ ] `frontend/src/pages/Payroll/PayrollDetail.tsx` 생성
  - View mode for Users
  - Edit mode for Admin/HR
  - Field validation
  - Save/Cancel buttons
  
- [ ] Payroll calculation display
  - Allowances breakdown
  - Deductions breakdown
  - Net salary calculation

#### 8. Excel Upload Page
- [ ] `frontend/src/pages/Payroll/PayrollExcelUpload.tsx` 생성
  - Drag & drop file upload
  - Template download button
  - Preview uploaded data
  - Validation error display
  - Confirm/Cancel upload
  
- [ ] Progress indicator
  - Upload progress
  - Processing status
  - Success/Error summary

#### 9. Payslip Management Page
- [ ] `frontend/src/pages/Payroll/PayslipManagement.tsx` 생성
  - PDF upload interface
  - Payslip viewer (PDF.js)
  - Download button
  - Delete button (Admin)
  
- [ ] User payslip portal
  - List of available payslips
  - Quick download
  - Print functionality

### Week 5: Integration & Testing

#### 10. Frontend-Backend Integration
- [ ] API service layer (`frontend/src/services/payrollService.ts`)
- [ ] Redux/Context state management
- [ ] Error handling & user feedback
- [ ] Loading states

#### 11. Security Implementation
- [ ] Data encryption for sensitive fields
- [ ] API rate limiting
- [ ] Input sanitization
- [ ] XSS prevention
- [ ] CORS configuration

#### 12. Testing
- [ ] Backend unit tests (Jest)
  - Model tests
  - API endpoint tests
  - Validation tests
  
- [ ] Frontend component tests
  - Component rendering
  - User interactions
  - API integration
  
- [ ] End-to-end tests
  - Complete user flows
  - Permission scenarios
  - Error scenarios

### Week 6: Documentation & Deployment Prep

#### 13. Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] User guide for payroll features
- [ ] Admin guide for payroll management
- [ ] Update TEST_GUIDE.md

#### 14. Performance Optimization
- [ ] Database query optimization
- [ ] Frontend lazy loading
- [ ] Caching strategy
- [ ] Bundle size optimization

#### 15. Deployment Preparation
- [ ] Environment variables setup
- [ ] Production build configuration
- [ ] Database migration scripts
- [ ] Rollback plan

## Technical Implementation Details

### Backend File Structure
```
backend/
├── routes/
│   └── payroll.js          # All payroll routes
├── models/
│   ├── Payroll.js          # Payroll model
│   ├── PayrollTemplate.js  # Template model
│   └── PayrollDocument.js  # Document model
├── middleware/
│   └── payrollAuth.js      # Payroll-specific auth
├── utils/
│   ├── excelParser.js      # Excel processing
│   └── payrollCalculator.js # Calculation logic
└── uploads/
    └── payslips/           # PDF storage
```

### Frontend File Structure
```
frontend/src/
├── pages/
│   └── Payroll/
│       ├── PayrollList.tsx
│       ├── PayrollDetail.tsx
│       ├── PayrollExcelUpload.tsx
│       └── PayslipManagement.tsx
├── components/
│   └── Payroll/
│       ├── PayrollGrid.tsx
│       ├── PayrollForm.tsx
│       ├── PayslipViewer.tsx
│       └── ExcelUploader.tsx
├── services/
│   └── payrollService.ts
└── types/
    └── payroll.ts
```

## API Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/payroll | List payroll records | User+ |
| GET | /api/payroll/:id | Get payroll detail | User+ |
| POST | /api/payroll | Create payroll record | Admin |
| PUT | /api/payroll/:id | Update payroll record | Admin |
| DELETE | /api/payroll/:id | Delete payroll record | Admin |
| POST | /api/payroll/excel/upload | Bulk upload via Excel | Admin |
| GET | /api/payroll/excel/template | Download Excel template | Admin |
| GET | /api/payroll/excel/export | Export to Excel | User+ |
| POST | /api/payroll/:id/payslip/upload | Upload PDF payslip | Admin |
| GET | /api/payroll/:id/payslip | Download payslip | User+ |
| DELETE | /api/payroll/:id/payslip | Delete payslip | Admin |

## Success Criteria

### Functional Requirements
- [ ] Admin can create/edit/delete payroll records
- [ ] Users can view their own payroll history
- [ ] Excel bulk upload works without errors
- [ ] PDF payslips can be uploaded and viewed
- [ ] All calculations are accurate

### Non-Functional Requirements
- [ ] Page load time < 2 seconds
- [ ] Excel upload handles 1000+ records
- [ ] PDF upload max 5MB per file
- [ ] 100% test coverage for critical paths
- [ ] Zero security vulnerabilities

## Risk Mitigation

### Identified Risks
1. **Data accuracy**: Implement validation at multiple levels
2. **Security breach**: Encrypt sensitive data, implement audit logs
3. **Performance issues**: Optimize queries, implement pagination
4. **User errors**: Provide clear UI feedback, validation messages

### Contingency Plans
1. Rollback procedure documented
2. Data backup before bulk operations
3. Manual override capability for Admin
4. Error recovery mechanisms

## Next Steps After Phase 1

1. Review Phase 1 implementation
2. Gather user feedback
3. Plan Phase 2 features (automation)
4. Performance benchmarking
5. Security audit

---

## 구현 시작 명령

Phase 1 구현을 시작하려면 다음 순서로 진행:

1. Database schema 생성
2. Backend models 작성
3. API endpoints 구현
4. Frontend pages 개발
5. Integration testing
6. Documentation

각 단계를 완료할 때마다 체크리스트를 업데이트하여 진행 상황을 추적합니다.
# Payroll API Documentation

## AI-HEADER
- **Intent**: Complete API documentation for payroll management system
- **Domain Meaning**: Comprehensive guide for payroll CRUD operations, Excel processing, and PDF management
- **Misleading Names**: None
- **Data Contracts**: All endpoints follow REST conventions with JSON request/response
- **PII**: Contains salary information - requires proper authentication and authorization
- **Invariants**: All monetary values in Korean Won (KRW); All dates in ISO 8601 format
- **RAG Keywords**: payroll, api, documentation, endpoints, authentication, excel, pdf

## Overview

The Payroll API provides comprehensive functionality for managing employee compensation data, including:

- CRUD operations for payroll records
- Excel file upload/download for bulk operations
- PDF payslip management
- Role-based access control
- Data validation and security features

**Base URL**: `/api/payroll`

**Authentication**: All endpoints require JWT token authentication via `Authorization: Bearer <token>` header.

**Content-Type**: `application/json` for all requests except file uploads

---

## Core Payroll Endpoints

### 1. List Payroll Records

**GET** `/api/payroll`

Retrieve paginated list of payroll records with optional filtering.

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | number | No | Page number (default: 1) | `?page=2` |
| `limit` | number | No | Records per page (default: 20, max: 100) | `?limit=50` |
| `year` | number | No | Filter by year | `?year=2024` |
| `month` | number | No | Filter by month (1-12) | `?month=8` |
| `userId` | string | No | Filter by user ID (Admin only) | `?userId=507f1f77bcf86cd799439011` |
| `paymentStatus` | string | No | Filter by status: `pending`, `approved`, `paid`, `cancelled` | `?paymentStatus=pending` |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "66b123456789abcdef012345",
      "userId": "507f1f77bcf86cd799439011",
      "user": {
        "name": "홍길동",
        "employeeId": "EMP001",
        "department": "개발팀",
        "position": "대리"
      },
      "year": 2024,
      "month": 8,
      "baseSalary": 3000000,
      "allowances": {
        "overtime": 200000,
        "position": 150000,
        "meal": 100000,
        "transportation": 50000,
        "other": 0
      },
      "deductions": {
        "nationalPension": 135000,
        "healthInsurance": 120000,
        "employmentInsurance": 27000,
        "incomeTax": 180000,
        "localIncomeTax": 18000,
        "other": 0
      },
      "totalAllowances": 500000,
      "totalDeductions": 480000,
      "netSalary": 3020000,
      "paymentStatus": "pending",
      "paymentDate": null,
      "hasPayslip": false,
      "createdAt": "2024-08-09T10:30:00.000Z",
      "updatedAt": "2024-08-09T10:30:00.000Z",
      "createdBy": "507f1f77bcf86cd799439012"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Access Control
- **Admin/HR**: Can view all payroll records
- **Users**: Can only view their own payroll records

---

### 2. Get Single Payroll Record

**GET** `/api/payroll/:id`

Retrieve detailed information for a specific payroll record.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payroll record ID |

#### Response

```json
{
  "success": true,
  "data": {
    "_id": "66b123456789abcdef012345",
    "userId": "507f1f77bcf86cd799439011",
    "user": {
      "name": "홍길동",
      "employeeId": "EMP001",
      "department": "개발팀",
      "position": "대리"
    },
    "year": 2024,
    "month": 8,
    "baseSalary": 3000000,
    "allowances": {
      "overtime": 200000,
      "position": 150000,
      "meal": 100000,
      "transportation": 50000,
      "other": 0
    },
    "deductions": {
      "nationalPension": 135000,
      "healthInsurance": 120000,
      "employmentInsurance": 27000,
      "incomeTax": 180000,
      "localIncomeTax": 18000,
      "other": 0
    },
    "totalAllowances": 500000,
    "totalDeductions": 480000,
    "netSalary": 3020000,
    "paymentStatus": "pending",
    "paymentDate": null,
    "hasPayslip": false,
    "createdAt": "2024-08-09T10:30:00.000Z",
    "updatedAt": "2024-08-09T10:30:00.000Z"
  }
}
```

#### Access Control
- **Admin/HR**: Can view any payroll record
- **Users**: Can only view their own payroll records

---

### 3. Create Payroll Record

**POST** `/api/payroll`

Create a new payroll record for an employee.

#### Request Body

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "year": 2024,
  "month": 8,
  "baseSalary": 3000000,
  "allowances": {
    "overtime": 200000,
    "position": 150000,
    "meal": 100000,
    "transportation": 50000,
    "other": 0
  },
  "deductions": {
    "nationalPension": 135000,
    "healthInsurance": 120000,
    "employmentInsurance": 27000,
    "incomeTax": 180000,
    "localIncomeTax": 18000,
    "other": 0
  },
  "note": "월급 정상 지급"
}
```

#### Validation Rules

- `userId`: Required, must be valid MongoDB ObjectId
- `year`: Required, must be between 2020-2030
- `month`: Required, must be between 1-12
- `baseSalary`: Required, must be ≥ 0
- `allowances.*`: Optional, must be ≥ 0
- `deductions.*`: Optional, must be ≥ 0
- `note`: Optional, max 500 characters

#### Response

```json
{
  "success": true,
  "data": {
    "_id": "66b123456789abcdef012345",
    "userId": "507f1f77bcf86cd799439011",
    "year": 2024,
    "month": 8,
    "baseSalary": 3000000,
    "allowances": {
      "overtime": 200000,
      "position": 150000,
      "meal": 100000,
      "transportation": 50000,
      "other": 0
    },
    "deductions": {
      "nationalPension": 135000,
      "healthInsurance": 120000,
      "employmentInsurance": 27000,
      "incomeTax": 180000,
      "localIncomeTax": 18000,
      "other": 0
    },
    "totalAllowances": 500000,
    "totalDeductions": 480000,
    "netSalary": 3020000,
    "paymentStatus": "pending",
    "createdAt": "2024-08-09T10:30:00.000Z",
    "createdBy": "507f1f77bcf86cd799439012"
  }
}
```

#### Access Control
- **Admin/HR only**: Required `payroll:manage` permission

---

### 4. Update Payroll Record

**PUT** `/api/payroll/:id`

Update an existing payroll record. Totals are automatically recalculated.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payroll record ID |

#### Request Body

All fields are optional for updates:

```json
{
  "baseSalary": 3200000,
  "allowances": {
    "overtime": 250000,
    "meal": 120000
  },
  "deductions": {
    "incomeTax": 200000
  },
  "paymentStatus": "approved",
  "note": "승급으로 인한 급여 조정"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "_id": "66b123456789abcdef012345",
    "baseSalary": 3200000,
    "totalAllowances": 520000,
    "totalDeductions": 500000,
    "netSalary": 3220000,
    "paymentStatus": "approved",
    "updatedAt": "2024-08-09T11:15:00.000Z",
    "updatedBy": "507f1f77bcf86cd799439012"
  }
}
```

#### Access Control
- **Admin/HR only**: Required `payroll:manage` permission

---

### 5. Delete Payroll Record

**DELETE** `/api/payroll/:id`

Soft delete a payroll record (sets `isDeleted: true` and `paymentStatus: 'cancelled'`).

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payroll record ID |

#### Response

```json
{
  "success": true,
  "message": "Payroll record deleted successfully",
  "data": {
    "_id": "66b123456789abcdef012345",
    "isDeleted": true,
    "paymentStatus": "cancelled",
    "deletedAt": "2024-08-09T12:00:00.000Z",
    "deletedBy": "507f1f77bcf86cd799439012"
  }
}
```

#### Access Control
- **Admin only**: Required `payroll:manage` permission

---

## Excel Processing Endpoints

### 6. Preview Excel File

**POST** `/api/upload/excel/preview`

Preview Excel file for bulk payroll import before saving. Supports dual-row format from labor consultants.

#### Content-Type
`multipart/form-data`

#### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Excel file (.xlsx, .xls) |

#### File Requirements

- **Format**: .xlsx or .xls
- **Size**: Maximum 10MB
- **Structure**: Dual-row format with main row and incentive row
- **Required Columns**: 사원번호, 성명, 부서, 기본급

#### Response

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRecords": 50,
      "successCount": 48,
      "errorCount": 2,
      "duplicateCount": 0
    },
    "errors": [
      {
        "row": 15,
        "employee": "김철수",
        "message": "Missing required field: 기본급"
      },
      {
        "row": 23,
        "employee": "이영희", 
        "message": "Employee not found in system"
      }
    ],
    "metadata": {
      "filename": "payroll_2024_08.xlsx",
      "uploadedAt": "2024-08-09T13:00:00.000Z",
      "uploadedBy": "507f1f77bcf86cd799439012"
    }
  }
}
```

#### Access Control
- **Admin/HR only**: Required `payroll:manage` permission

---

### 7. Confirm Excel Preview

**POST** `/api/upload/excel/confirm`

Confirm and save the previewed payroll data.

#### Request Body

```json
{
  "previewToken": "preview_abc123xyz",
  "idempotencyKey": "unique-request-id" // Optional, for duplicate prevention
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "inserted": 48,
    "updated": 0,
    "failed": 2,
    "message": "Payroll data saved successfully"
  }
}
```

#### Access Control
- **Admin/HR only**: Required `payroll:manage` permission

---

### 8. Download Excel Template

**GET** `/api/upload/excel/template`

Download an Excel template for payroll data upload.

#### Response

**Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Headers**:
- `Content-Disposition: attachment; filename="payroll-template.xlsx"`

#### Access Control
- **Admin/HR only**: Required `payroll:manage` permission

---

### 9. Export Payroll Data

**GET** `/api/upload/excel/export`

Export payroll data to Excel format with optional filtering.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | number | No | Filter by year |
| `month` | number | No | Filter by month |
| `userId` | string | No | Filter by user ID (Admin only) |
| `format` | string | No | Export format: `detailed` (default), `summary` |

#### Response

**Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Headers**:
- `Content-Disposition: attachment; filename="payroll-export-2024-08.xlsx"`

The response contains an Excel file with:
- **Sheet 1**: Payroll data with all columns
- **Sheet 2**: Export metadata (date, user, filters)

#### Access Control
- **Admin/HR**: Can export all data
- **Users**: Can only export their own data

---

## PDF Payslip Management

### 10. Upload Payslip PDF

**POST** `/api/payroll/:id/payslip`

Upload PDF payslip document for a specific payroll record.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payroll record ID |

#### Content-Type
`multipart/form-data`

#### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payslip` | File | Yes | PDF file |

#### File Requirements

- **Format**: PDF only
- **Size**: Maximum 5MB
- **Content**: Payslip document

#### Response

```json
{
  "success": true,
  "message": "Payslip uploaded successfully",
  "data": {
    "payrollId": "66b123456789abcdef012345",
    "documentId": "66b123456789abcdef012346",
    "filename": "payslip_EMP001_2024_08.pdf",
    "uploadedAt": "2024-08-09T14:00:00.000Z",
    "uploadedBy": "507f1f77bcf86cd799439012"
  }
}
```

#### Access Control
- **Admin/HR only**: Required `payroll:manage` permission

---

### 11. Download Payslip PDF

**GET** `/api/payroll/:id/payslip`

Download PDF payslip for a specific payroll record.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payroll record ID |

#### Response

**Content-Type**: `application/pdf`

**Headers**:
- `Content-Disposition: attachment; filename="payslip_EMP001_2024_08.pdf"`

#### Access Control
- **Admin/HR**: Can download any payslip
- **Users**: Can only download their own payslips

---

### 12. Delete Payslip PDF

**DELETE** `/api/payroll/:id/payslip`

Delete PDF payslip document from a payroll record.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payroll record ID |

#### Response

```json
{
  "success": true,
  "message": "Payslip deleted successfully",
  "data": {
    "payrollId": "66b123456789abcdef012345",
    "deletedAt": "2024-08-09T15:00:00.000Z",
    "deletedBy": "507f1f77bcf86cd799439012"
  }
}
```

#### Access Control
- **Admin only**: Required `payroll:manage` permission

---

## Error Responses

All API endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed: baseSalary is required",
  "details": [
    {
      "field": "baseSalary",
      "message": "baseSalary is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Access denied. Please provide a valid JWT token."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions. Required: payroll:manage"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Payroll record not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Payroll record already exists for 2024-08"
}
```

### 413 Payload Too Large
```json
{
  "success": false,
  "error": "File size exceeds maximum limit of 10MB"
}
```

### 422 Unprocessable Entity
```json
{
  "success": false,
  "error": "Invalid file format. Only .xlsx and .xls files are allowed."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Authentication & Authorization

### JWT Token Requirements

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Permission Levels

| Role | Permissions | Access |
|------|------------|---------|
| **Admin** | `payroll:view`, `payroll:manage` | Full access to all payroll data and operations |
| **HR** | `payroll:view`, `payroll:manage` | Full access to all payroll data and operations |
| **Supervisor** | `payroll:view` | View access to team members' payroll data |
| **User** | `payroll:view` | View access to own payroll data only |

### Rate Limiting

- **General endpoints**: 100 requests per 15 minutes per IP
- **File upload endpoints**: 10 requests per 5 minutes per IP
- **Bulk operations**: 5 requests per 10 minutes per IP

---

## Data Models

### Payroll Record Schema

```typescript
interface PayrollRecord {
  _id: string;
  userId: string;
  year: number;          // 2020-2030
  month: number;         // 1-12
  baseSalary: number;    // >= 0
  
  allowances: {
    overtime: number;        // 시간외수당
    position: number;        // 직책수당
    meal: number;           // 식대
    transportation: number;  // 교통비
    other: number;          // 기타수당
  };
  
  deductions: {
    nationalPension: number;    // 국민연금
    healthInsurance: number;    // 건강보험
    employmentInsurance: number; // 고용보험
    incomeTax: number;          // 소득세
    localIncomeTax: number;     // 지방소득세
    other: number;              // 기타공제
  };
  
  totalAllowances: number;  // Calculated automatically
  totalDeductions: number;  // Calculated automatically
  netSalary: number;        // baseSalary + totalAllowances - totalDeductions
  
  paymentStatus: 'pending' | 'approved' | 'paid' | 'cancelled';
  paymentDate?: Date;
  hasPayslip: boolean;
  
  note?: string;           // Max 500 characters
  isDeleted: boolean;
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  deletedAt?: Date;
  deletedBy?: string;
}
```

### Excel File Format

The system supports dual-row Excel format from labor consultants:

#### Required Columns
- 사원번호 (Employee ID)
- 성명 (Employee Name) 
- 부서 (Department)
- 직급 (Position)
- 년도 (Year)
- 월 (Month)
- 기본급 (Base Salary)

#### Optional Columns
- 시간외수당 (Overtime Allowance)
- 직책수당 (Position Allowance)
- 식대 (Meal Allowance)
- 교통비 (Transportation Allowance)
- 국민연금 (National Pension)
- 건강보험 (Health Insurance)
- 고용보험 (Employment Insurance)
- 소득세 (Income Tax)
- 지방소득세 (Local Income Tax)

---

## Security Features

### Input Sanitization
- XSS prevention for all text inputs
- SQL injection protection
- File type validation
- Size limit enforcement

### Access Control
- JWT token validation
- Role-based permissions
- Resource-level authorization
- Audit logging for all operations

### File Security
- MIME type validation
- File size limits
- Virus scanning (if configured)
- Secure file storage

---

## Usage Examples

### JavaScript/React Example

```javascript
// Import payroll records
const fetchPayrollRecords = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters);
  
  const response = await fetch(`/api/payroll?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
};

// Create payroll record
const createPayrollRecord = async (payrollData) => {
  const response = await fetch('/api/payroll', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payrollData)
  });
  
  return await response.json();
};

// Upload Excel file
const uploadPayrollExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Step 1: Preview the Excel file
  const previewResponse = await fetch('/api/upload/excel/preview', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });
  
  const previewData = await previewResponse.json();
  
  if (previewData.success) {
    // Step 2: Confirm the upload
    const confirmResponse = await fetch('/api/upload/excel/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        previewToken: previewData.data.previewToken,
        idempotencyKey: `upload-${Date.now()}`
      })
    });
    
    return await confirmResponse.json();
  }
  
  return previewData;
};
```

### cURL Examples

```bash
# Get payroll records
curl -X GET "/api/payroll?year=2024&month=8" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create payroll record
curl -X POST "/api/payroll" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "year": 2024,
    "month": 8,
    "baseSalary": 3000000,
    "allowances": {"overtime": 200000},
    "deductions": {"nationalPension": 135000}
  }'

# Upload Excel file
# Step 1: Preview
curl -X POST "/api/upload/excel/preview" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@payroll_data.xlsx"

# Step 2: Confirm (use the previewToken from step 1)
curl -X POST "/api/upload/excel/confirm" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"previewToken": "preview_abc123xyz", "idempotencyKey": "unique-id-123"}'

# Download Excel template
curl -X GET "/api/upload/excel/template" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o "payroll_template.xlsx"

# Download Excel export
curl -X GET "/api/upload/excel/export?year=2024&month=8" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o "payroll_export.xlsx"
```

---

## Changelog

### Version 1.0.0 (2024-08-09)
- Initial API implementation
- Core CRUD operations
- Excel upload/download functionality
- PDF payslip management
- Role-based access control
- Comprehensive validation and security features

---

## Support

For API support and questions:
- Check the error response codes and messages
- Review the validation rules for request data
- Ensure proper authentication and permissions
- Contact the development team for technical issues
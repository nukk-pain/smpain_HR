# Payslip Upload - Unique ID System Implementation Plan

## Overview
This plan addresses the Korean filename encoding issue by implementing a unique ID system that separates physical file storage from logical file naming.

## Problem Analysis
- **Current Issue**: Korean filenames get corrupted during multipart upload (UTF-8 → corrupted encoding)
- **Root Cause**: Encoding mismatch between frontend (UTF-8) and multer's filename handling
- **Impact**: Employee name parsing fails, resulting in 0 successful uploads

## Solution Architecture

### Core Principle
- Use system-generated unique IDs for physical file storage
- Preserve original filenames in database metadata
- Restore original filenames during download

### Data Flow
```
Frontend Upload → Original Filename (UTF-8)
    ↓
Backend Processing → Generate Unique ID
    ↓
File Storage → /uploads/payslips/{uniqueId}.pdf
    ↓
Database → Store both uniqueId and originalFilename
    ↓
Download → Serve with original filename via Content-Disposition
```

## Implementation Steps

### Phase 1: Backend Infrastructure Changes

#### 1.1 Update Multer Configuration
**File**: `backend/routes/reports.js`

```javascript
const bulkPayslipUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../uploads/temp/');
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique ID
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const safeFilename = `payslip_${timestamp}_${uniqueId}.pdf`;
      
      // Store original filename in request for later use
      if (!req.fileMetadata) {
        req.fileMetadata = [];
      }
      req.fileMetadata.push({
        uniqueId: safeFilename,
        originalName: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype
      });
      
      cb(null, safeFilename);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Validate PDF files
    const isPdf = file.mimetype === 'application/pdf' || 
                  path.extname(file.originalname).toLowerCase() === '.pdf';
    if (!isPdf) {
      return cb(new Error('Only PDF files are allowed'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 50 // Maximum 50 files
  }
});
```

#### 1.2 Update File Processing Logic
**File**: `backend/routes/reports.js` (bulk-upload endpoint)

```javascript
router.post('/payslip/bulk-upload', 
  requireAuth,
  requirePermission('payroll:manage'),
  bulkPayslipUpload.array('payslips', 50),
  asyncHandler(async (req, res) => {
    const uploadedFiles = req.files;
    const fileMetadata = req.fileMetadata || [];
    const mappings = JSON.parse(req.body.mappings || '[]');
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const metadata = fileMetadata[i];
      const originalFilename = metadata.originalName;
      
      try {
        // Find mapping using original filename
        const mapping = mappings.find(m => 
          m.fileName === originalFilename
        );
        
        if (!mapping) {
          throw new Error(`No mapping found for file: ${originalFilename}`);
        }
        
        // Parse employee info from original filename
        const employeeInfo = parseEmployeeFromFilename(originalFilename);
        
        // Validate user exists
        const user = await db.collection('users').findOne({
          _id: new ObjectId(mapping.userId)
        });
        
        if (!user) {
          throw new Error(`User not found: ${mapping.userId}`);
        }
        
        // Move file to permanent location
        const permanentPath = path.join(
          __dirname, 
          '../uploads/payslips',
          metadata.uniqueId
        );
        
        fs.renameSync(file.path, permanentPath);
        
        // Store in database with both IDs
        const document = {
          uniqueId: metadata.uniqueId,
          originalFileName: originalFilename,
          displayName: originalFilename, // For UI display
          userId: new ObjectId(mapping.userId),
          userName: user.name,
          employeeId: user.employeeId,
          department: user.department,
          year: parseInt(mapping.yearMonth.substring(0, 4)),
          month: parseInt(mapping.yearMonth.substring(4, 6)),
          documentType: 'payslip',
          filePath: permanentPath,
          fileSize: file.size,
          mimeType: metadata.mimetype,
          uploadedAt: new Date(),
          uploadedBy: new ObjectId(req.user.id),
          uploadedByName: req.user.username,
          metadata: {
            encoding: metadata.encoding,
            parsedEmployeeName: employeeInfo.name,
            parsedCompany: employeeInfo.company,
            parsedYearMonth: employeeInfo.yearMonth
          }
        };
        
        await db.collection('payroll_documents').insertOne(document);
        
        results.push({
          fileName: originalFilename,
          success: true,
          uniqueId: metadata.uniqueId
        });
        
      } catch (error) {
        console.error(`Error processing ${originalFilename}:`, error);
        errors.push({
          fileName: originalFilename,
          error: error.message,
          success: false
        });
        
        // Clean up temp file if exists
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }
    
    res.json({
      success: true,
      uploadedCount: results.length,
      errorCount: errors.length,
      results: [...results, ...errors],
      message: `${results.length}개 파일 업로드 성공, ${errors.length}개 실패`
    });
  })
);
```

#### 1.3 Employee Name Parser
**File**: `backend/utils/filenameParser.js` (new file)

```javascript
function parseEmployeeFromFilename(filename) {
  // Remove .pdf extension
  const nameWithoutExt = filename.replace(/\.pdf$/i, '');
  
  // Pattern 1: 회사명_고용형태YYYYMM_직원명.pdf
  const pattern1 = /^(.+?)_(.+?)(\d{6})_(.+?)$/;
  const match1 = nameWithoutExt.match(pattern1);
  if (match1) {
    return {
      company: match1[1],
      employmentType: match1[2],
      yearMonth: match1[3],
      name: match1[4]
    };
  }
  
  // Pattern 2: 회사명_YYYY-MM_직원명.pdf
  const pattern2 = /^(.+?)_(\d{4})-(\d{2})_(.+?)$/;
  const match2 = nameWithoutExt.match(pattern2);
  if (match2) {
    return {
      company: match2[1],
      yearMonth: match2[2] + match2[3],
      name: match2[4]
    };
  }
  
  // Pattern 3: 회사명_직원명_YYYYMMDD.pdf
  const pattern3 = /^(.+?)_(.+?)_(\d{8})$/;
  const match3 = nameWithoutExt.match(pattern3);
  if (match3) {
    return {
      company: match3[1],
      name: match3[2],
      yearMonth: match3[3].substring(0, 6)
    };
  }
  
  // Fallback: Extract last part as name
  const parts = nameWithoutExt.split('_');
  return {
    name: parts[parts.length - 1] || filename,
    yearMonth: null,
    company: null
  };
}

module.exports = { parseEmployeeFromFilename };
```

### Phase 2: Download Implementation

#### 2.1 Download Endpoint with Original Filename
**File**: `backend/routes/reports.js`

```javascript
router.get('/payslip/download/:documentId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    
    try {
      // Get document from database
      const document = await db.collection('payroll_documents').findOne({
        _id: new ObjectId(documentId)
      });
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check permissions
      const isOwner = document.userId.toString() === req.user.id;
      const isAdmin = req.user.role === 'admin';
      const hasPermission = req.user.permissions?.includes('payroll:view');
      
      if (!isOwner && !isAdmin && !hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Check file exists
      if (!fs.existsSync(document.filePath)) {
        console.error(`File not found: ${document.filePath}`);
        return res.status(404).json({ error: 'File not found on server' });
      }
      
      // Set headers for download with original filename
      const originalName = document.originalFileName || document.displayName || 'payslip.pdf';
      
      // Encode filename for different browsers
      const encodedFilename = encodeURIComponent(originalName);
      const asciiFilename = originalName.replace(/[^\x00-\x7F]/g, '_');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`
      );
      res.setHeader('Content-Length', document.fileSize);
      
      // Stream file to response
      const fileStream = fs.createReadStream(document.filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: 'Download failed' });
    }
  })
);
```

### Phase 3: Frontend Updates

#### 3.1 Update File Matching Logic
**File**: `frontend/src/components/PayslipBulkUpload.tsx`

```typescript
// No changes needed for file matching
// Frontend continues to send original filenames
// Backend handles the unique ID generation

const handleBulkUpload = useCallback(async () => {
  const matchedFiles = files.filter((f) => f.matchStatus === 'matched');
  
  const formData = new FormData();
  
  // Prepare mappings with original filenames
  const mappings = matchedFiles.map((f) => ({
    fileName: f.fileName, // Original filename preserved
    userId: f.matchedUserId,
    yearMonth: f.parsedData.yearMonth,
  }));
  
  // Add mappings as JSON
  formData.append('mappings', JSON.stringify(mappings));
  
  // Add files with original names
  matchedFiles.forEach((f) => {
    formData.append('payslips', f.file, f.fileName);
  });
  
  // Upload continues as normal
  const response = await api.api.post('/reports/payslip/bulk-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      // Progress tracking
    },
  });
  
  // Handle response
}, [files]);
```

### Phase 4: Database Migration

#### 4.1 Migration Script for Existing Data
**File**: `backend/scripts/migrate-payslip-ids.js`

```javascript
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function migratePayslips() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('SM_nomu');
    
    // Find all payslip documents without uniqueId
    const documents = await db.collection('payroll_documents')
      .find({ 
        documentType: 'payslip',
        uniqueId: { $exists: false }
      })
      .toArray();
    
    console.log(`Found ${documents.length} documents to migrate`);
    
    for (const doc of documents) {
      // Generate unique ID
      const uniqueId = `payslip_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.pdf`;
      
      // Store original filename if not already stored
      const originalFileName = doc.fileName || doc.originalFileName || 
                              path.basename(doc.filePath);
      
      // Update document
      await db.collection('payroll_documents').updateOne(
        { _id: doc._id },
        {
          $set: {
            uniqueId: uniqueId,
            originalFileName: originalFileName,
            displayName: originalFileName,
            migratedAt: new Date()
          }
        }
      );
      
      console.log(`Migrated: ${originalFileName} → ${uniqueId}`);
    }
    
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

migratePayslips();
```

## Error Handling Strategy

### 1. Upload Errors
- **File too large**: Return clear error message with size limit
- **Invalid file type**: Reject non-PDF files before processing
- **Encoding issues**: Use unique ID to bypass encoding problems
- **Missing user mapping**: Log detailed error, continue with other files

### 2. Storage Errors
- **Disk space**: Check available space before processing
- **Permission denied**: Ensure upload directories are writable
- **File conflicts**: Unique IDs prevent naming conflicts

### 3. Database Errors
- **Connection lost**: Implement retry logic with exponential backoff
- **Duplicate entries**: Use unique index on uniqueId field
- **Transaction failures**: Rollback file operations on DB error

### 4. Download Errors
- **File not found**: Return 404 with helpful message
- **Access denied**: Clear permission error messages
- **Corrupted file**: Verify file integrity before serving

## Testing Plan

### 1. Unit Tests
```javascript
describe('Filename Parser', () => {
  test('should parse Korean filenames correctly', () => {
    const filename = '연세신명마취통증의학과의원_정규202410_홍길동.pdf';
    const result = parseEmployeeFromFilename(filename);
    expect(result.name).toBe('홍길동');
    expect(result.company).toBe('연세신명마취통증의학과의원');
  });
  
  test('should handle various filename patterns', () => {
    // Test multiple patterns
  });
});
```

### 2. Integration Tests
- Upload files with Korean names
- Verify database entries
- Download files and check filenames
- Test error scenarios

### 3. End-to-End Tests
- Complete upload flow with Korean filenames
- Verify employee matching
- Download and verify original filenames
- Test bulk operations (50+ files)

## Rollback Plan

If issues occur after deployment:

1. **Immediate Rollback**
   - Revert code changes
   - Restore previous multer configuration
   - Keep unique IDs in database (no data loss)

2. **Data Recovery**
   - Original filenames preserved in database
   - Files remain accessible via unique IDs
   - Can map back to original names if needed

## Performance Considerations

1. **File Processing**
   - Process files in batches of 10
   - Implement queue for large uploads
   - Add progress tracking

2. **Database Operations**
   - Bulk insert for multiple documents
   - Index on uniqueId for fast lookups
   - Pagination for file listings

3. **Storage Optimization**
   - Regular cleanup of temp directory
   - Archive old payslips after 1 year
   - Compress PDFs if needed

## Security Measures

1. **File Validation**
   - Verify PDF magic bytes
   - Scan for malicious content
   - Limit file size and count

2. **Access Control**
   - Verify user permissions
   - Log all download attempts
   - Rate limit bulk uploads

3. **Data Protection**
   - Encrypt filenames in database
   - Secure file storage location
   - Regular security audits

## Monitoring & Logging

### 1. Upload Monitoring
```javascript
console.log({
  event: 'payslip_upload',
  originalName: metadata.originalName,
  uniqueId: metadata.uniqueId,
  userId: mapping.userId,
  timestamp: new Date(),
  success: true
});
```

### 2. Error Tracking
```javascript
global.errorLoggingService.logError({
  type: 'PAYSLIP_UPLOAD_ERROR',
  filename: originalFilename,
  error: error.message,
  stack: error.stack,
  userId: req.user.id
});
```

### 3. Metrics Collection
- Upload success rate
- Average processing time
- File size distribution
- Error frequency by type

## Deployment Checklist

### Pre-deployment
- [ ] Backup existing payroll_documents collection
- [ ] Test migration script on staging
- [ ] Verify upload directory permissions
- [ ] Update environment variables

### Deployment
- [ ] Deploy backend changes
- [ ] Run database migration
- [ ] Deploy frontend updates
- [ ] Verify health checks

### Post-deployment
- [ ] Test Korean filename upload
- [ ] Verify download with original names
- [ ] Monitor error logs
- [ ] Check performance metrics

## Timeline

### Day 1
- Implement backend changes
- Create filename parser
- Update multer configuration

### Day 2
- Implement download endpoint
- Create migration script
- Update frontend if needed

### Day 3
- Testing and bug fixes
- Documentation update
- Performance optimization

### Day 4
- Staging deployment
- User acceptance testing
- Final adjustments

### Day 5
- Production deployment
- Monitoring and support
- Rollback if needed

## Success Criteria

1. **Functional Requirements**
   - ✅ Korean filenames upload successfully
   - ✅ Files stored with unique IDs
   - ✅ Original names preserved for download
   - ✅ Employee matching works correctly

2. **Performance Requirements**
   - ✅ Upload 50 files in < 30 seconds
   - ✅ Download response time < 2 seconds
   - ✅ No memory leaks during bulk operations

3. **Reliability Requirements**
   - ✅ 99.9% upload success rate
   - ✅ Zero data loss
   - ✅ Graceful error handling

## Conclusion

This unique ID system approach provides a robust solution to the Korean filename encoding issue while maintaining user experience. The separation of physical storage (unique IDs) from logical naming (original filenames) ensures compatibility across different systems while preserving the semantic meaning of filenames for end users.
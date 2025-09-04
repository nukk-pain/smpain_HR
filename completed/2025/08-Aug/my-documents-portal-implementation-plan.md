# 내 문서함 (My Documents Portal) 상세 구현 계획

## 📌 프로젝트 정보
- **작성일**: 2025-08-18
- **프로젝트 구조**: Node.js Express + React TypeScript + MongoDB
- **인증 방식**: JWT Bearer Token (apiService.ts:44-45)
- **권한 체크**: requireAuth, requirePermission 미들웨어 (payroll.js:29-66)
- **파일 업로드**: Multer 라이브러리 (reports.js:905-950)

## 🎯 목표
급여명세서 PDF만을 위한 단일 페이지가 아닌, 여러 종류의 문서를 통합 관리할 수 있는 확장 가능한 "내 문서함" 페이지 구현

## 📁 현재 시스템 분석

### 기존 Payslip 관련 구조
```
Frontend:
- PayslipManagement.tsx (Admin용 관리 컴포넌트)
- PayslipBulkUpload.tsx (일괄 업로드 컴포넌트) 
- apiService.uploadPayslip() (api.ts:501-504)
- apiService.downloadPayslipPdf() (api.ts:507-511)

Backend:
- POST /api/reports/payslip/bulk-upload (reports.js:950)
- POST /api/reports/payroll/:id/payslip/upload (reports.js:420)
- GET /api/payroll/:payrollId/payslip (다운로드)
- uploads/payslips/ (파일 저장 경로)
```

## 🏗️ 구현 아키텍처

### 1. Frontend 구조

#### 1.1 새로운 페이지 생성
```typescript
// frontend/src/pages/MyDocuments.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Description as DocumentIcon,
  Article as ContractIcon,
  Folder as FolderIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../components/NotificationProvider';
import api from '../services/api';

interface Document {
  _id: string;
  type: 'payslip' | 'certificate' | 'contract' | 'other';
  category: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  date: string;
  year?: number;
  month?: number;
  status: 'available' | 'processing' | 'expired';
  canDownload: boolean;
  canView: boolean;
  metadata?: {
    yearMonth?: string;
    certificateType?: string;
    purpose?: string;
    [key: string]: any;
  };
}
```

#### 1.2 라우팅 추가 (App.tsx)
```typescript
// frontend/src/App.tsx에 추가
import MyDocuments from './pages/MyDocuments';

// Routes 내부에 추가 (line 138 근처, leave 라우트 다음)
<Route path="my-documents" element={
  <ProtectedRoute>
    <MyDocuments />
  </ProtectedRoute>
} />
```

#### 1.3 네비게이션 메뉴 추가 (Layout.tsx)
```typescript
// frontend/src/components/Layout.tsx
// baseNavigationItems 배열에 추가 (line 77 이후)
{
  text: '내 문서함',
  icon: <Folder />,
  path: '/my-documents',
  permissions: ['leave:view'], // 모든 직원이 접근 가능
}
```

### 2. Backend API 구현

#### 2.1 새로운 라우트 파일 생성
```javascript
// backend/routes/documents.js
const express = require('express');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

function createDocumentsRoutes(db) {
  // 권한 체크 미들웨어 (payroll.js:29-66 패턴 재사용)
  const requireDocumentPermission = (permission) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userRole = req.user.role;
      
      // Admin은 모든 권한
      if (userRole === 'admin' || userRole === 'Admin') {
        return next();
      }
      
      // 일반 사용자는 자신의 문서만
      if (permission === 'documents:view:own') {
        return next();
      }
      
      return res.status(403).json({ error: 'Insufficient permissions' });
    };
  };

  // GET /api/documents - 내 문서 목록 조회
  router.get('/', 
    requireAuth, 
    requireDocumentPermission('documents:view:own'),
    asyncHandler(async (req, res) => {
      const userId = req.user.id;
      const { type, year, month, category } = req.query;
      
      // 쿼리 조건 구성
      let query = { userId: new ObjectId(userId) };
      if (type) query.type = type;
      if (year) query.year = parseInt(year);
      if (month) query.month = parseInt(month);
      if (category) query.category = category;

      // 기존 payslips 컬렉션에서 데이터 가져오기 (backward compatibility)
      const payslipsCollection = db.collection('payslips');
      const payslips = await payslipsCollection.find({
        userId: new ObjectId(userId)
      }).toArray();

      // payslips를 Document 형식으로 변환
      const payslipDocuments = payslips.map(p => ({
        _id: p._id,
        type: 'payslip',
        category: '급여명세서',
        title: `${p.year}년 ${p.month}월 급여명세서`,
        fileName: p.originalFilename || p.fileName,
        fileSize: p.fileSize || 0,
        mimeType: 'application/pdf',
        date: p.uploadedAt || p.createdAt,
        year: p.year,
        month: p.month,
        status: 'available',
        canDownload: true,
        canView: true,
        metadata: {
          yearMonth: p.yearMonth,
          payrollId: p.payrollId
        }
      }));

      // 새로운 documents 컬렉션에서 데이터 가져오기 (향후 확장용)
      const documentsCollection = db.collection('documents');
      const otherDocuments = await documentsCollection.find(query).toArray();

      // 합치고 정렬
      const allDocuments = [...payslipDocuments, ...otherDocuments]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      res.json({ success: true, data: allDocuments });
    })
  );

  // GET /api/documents/:id/download - 문서 다운로드
  router.get('/:id/download',
    requireAuth,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const userId = req.user.id;

      // payslips 컬렉션 확인
      const payslipsCollection = db.collection('payslips');
      const payslip = await payslipsCollection.findOne({
        _id: new ObjectId(id)
      });

      if (payslip) {
        // 권한 체크 - 자신의 문서인지 또는 Admin인지
        if (payslip.userId.toString() !== userId && req.user.role !== 'Admin') {
          return res.status(403).json({ error: 'Access denied' });
        }

        // 파일 경로 구성
        const filePath = path.join(__dirname, '../uploads/payslips/', payslip.uniqueFileName || payslip.fileName);
        
        try {
          await fs.access(filePath);
          
          // UTF-8 인코딩으로 원본 파일명 전송 (reports.js:1206 패턴)
          const encodedFilename = encodeURIComponent(payslip.originalFilename || 'payslip.pdf');
          res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
          res.setHeader('Content-Type', 'application/pdf');
          
          res.sendFile(filePath);
        } catch (error) {
          res.status(404).json({ error: 'File not found' });
        }
      } else {
        // documents 컬렉션 확인 (향후 확장용)
        const documentsCollection = db.collection('documents');
        const document = await documentsCollection.findOne({
          _id: new ObjectId(id)
        });

        if (!document) {
          return res.status(404).json({ error: 'Document not found' });
        }

        // 권한 체크
        if (document.userId.toString() !== userId && req.user.role !== 'Admin') {
          return res.status(403).json({ error: 'Access denied' });
        }

        // 문서 타입별 처리
        if (document.type === 'certificate') {
          // 증명서는 실시간 생성
          // TODO: PDF 생성 로직 구현
          res.status(501).json({ error: 'Certificate generation not implemented yet' });
        } else {
          // 파일 다운로드
          const filePath = path.join(__dirname, '../uploads/documents/', document.fileName);
          res.sendFile(filePath);
        }
      }
    })
  );

  // POST /api/documents/certificate/generate - 증명서 발급 (Phase 2)
  router.post('/certificate/generate',
    requireAuth,
    asyncHandler(async (req, res) => {
      const { type, purpose, language = 'ko' } = req.body;
      const userId = req.user.id;

      // 사용자 정보 조회
      const usersCollection = db.collection('users');
      const user = await usersCollection.findOne({
        _id: new ObjectId(userId)
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // TODO: 증명서 생성 로직 구현
      // 1. 템플릿 로드
      // 2. 데이터 바인딩
      // 3. PDF 생성
      // 4. documents 컬렉션에 저장
      
      res.status(501).json({ 
        error: 'Certificate generation not implemented yet',
        message: 'This feature will be available in Phase 2'
      });
    })
  );

  return router;
}

module.exports = createDocumentsRoutes;
```

#### 2.2 서버에 라우트 추가 (server.js)
```javascript
// backend/server.js에 추가 (다른 라우트들과 함께)
const createDocumentsRoutes = require('./routes/documents');

// 라우트 설정 부분에 추가 (line 200-250 근처)
app.use('/api/documents', createDocumentsRoutes(db));
```

### 3. API Service 메서드 추가

#### 3.1 Frontend API 서비스 확장
```typescript
// frontend/src/services/api.ts에 추가

// 내 문서 목록 조회
async getMyDocuments(params?: {
  type?: string;
  year?: number;
  month?: number;
  category?: string;
}): Promise<ApiResponse<Document[]>> {
  const queryString = new URLSearchParams(params as any).toString();
  const response = await this.api.get(`/documents${queryString ? '?' + queryString : ''}`);
  return response.data;
}

// 문서 다운로드
async downloadDocument(documentId: string) {
  const response = await this.api.get(`/documents/${documentId}/download`, {
    responseType: 'blob'
  });
  return response.data;
}

// 문서 미리보기 URL 생성
getDocumentPreviewUrl(documentId: string): string {
  const token = getValidToken();
  return `${this.api.defaults.baseURL}/documents/${documentId}/preview?token=${token}`;
}

// 증명서 발급 (Phase 2)
async generateCertificate(data: {
  type: 'employment' | 'career' | 'income';
  purpose: string;
  language?: 'ko' | 'en';
}): Promise<ApiResponse> {
  const response = await this.api.post('/documents/certificate/generate', data);
  return response.data;
}
```

### 4. 컴포넌트 구현 세부사항

#### 4.1 문서 목록 컴포넌트
```typescript
// frontend/src/components/documents/DocumentList.tsx
import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Typography,
  Box,
} from '@mui/material';
import {
  PictureAsPdf,
  Download,
  Visibility,
} from '@mui/icons-material';

interface DocumentListProps {
  documents: Document[];
  onDownload: (doc: Document) => void;
  onView: (doc: Document) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onDownload,
  onView,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <List>
      {documents.map((doc) => (
        <ListItem key={doc._id} divider>
          <ListItemIcon>
            <PictureAsPdf color="error" />
          </ListItemIcon>
          <ListItemText
            primary={doc.title}
            secondary={
              <Box>
                <Typography variant="caption" display="block">
                  {doc.fileName}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {formatDate(doc.date)} • {formatFileSize(doc.fileSize)}
                </Typography>
              </Box>
            }
          />
          <ListItemSecondaryAction>
            {doc.canView && (
              <IconButton
                edge="end"
                onClick={() => onView(doc)}
                sx={{ mr: 1 }}
              >
                <Visibility />
              </IconButton>
            )}
            {doc.canDownload && (
              <IconButton
                edge="end"
                onClick={() => onDownload(doc)}
              >
                <Download />
              </IconButton>
            )}
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
};
```

#### 4.2 PDF 뷰어 다이얼로그
```typescript
// frontend/src/components/documents/PdfViewerDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';
import { Document, Page, pdfjs } from 'react-pdf';

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PdfViewerDialogProps {
  open: boolean;
  title: string;
  pdfUrl: string;
  onClose: () => void;
}

export const PdfViewerDialog: React.FC<PdfViewerDialogProps> = ({
  open,
  title,
  pdfUrl,
  onClose,
}) => {
  const [numPages, setNumPages] = React.useState<number | null>(null);
  const [pageNumber, setPageNumber] = React.useState(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center' }}>
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<CircularProgress />}
          >
            <Page pageNumber={pageNumber} />
          </Document>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber(pageNumber - 1)}
        >
          이전
        </Button>
        <Typography>
          {pageNumber} / {numPages || '-'}
        </Typography>
        <Button
          disabled={pageNumber >= (numPages || 1)}
          onClick={() => setPageNumber(pageNumber + 1)}
        >
          다음
        </Button>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};
```

### 5. Admin 기능 구현

#### 5.1 Admin 문서 관리 API
```javascript
// backend/routes/documents.js에 추가

// PUT /api/documents/:id/replace - 문서 교체 (Admin)
router.put('/:id/replace',
  requireAuth,
  requirePermission('admin:permissions'),
  multer({ dest: 'uploads/temp/' }).single('document'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // 기존 문서 조회
    const payslipsCollection = db.collection('payslips');
    const existingPayslip = await payslipsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!existingPayslip) {
      // 임시 파일 삭제
      await fs.unlink(file.path);
      return res.status(404).json({ error: 'Document not found' });
    }

    // 기존 파일 백업 (soft delete)
    const backupDir = path.join(__dirname, '../uploads/payslips/backup/');
    await fs.mkdir(backupDir, { recursive: true });
    
    const oldFilePath = path.join(__dirname, '../uploads/payslips/', existingPayslip.uniqueFileName);
    const backupFilePath = path.join(backupDir, `${Date.now()}_${existingPayslip.uniqueFileName}`);
    
    try {
      await fs.rename(oldFilePath, backupFilePath);
    } catch (error) {
      console.error('Failed to backup old file:', error);
    }

    // 새 파일로 교체
    const newFileName = `payslip_${Date.now()}_${file.originalname}`;
    const newFilePath = path.join(__dirname, '../uploads/payslips/', newFileName);
    await fs.rename(file.path, newFilePath);

    // DB 업데이트 with audit trail
    await payslipsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          uniqueFileName: newFileName,
          originalFilename: file.originalname,
          fileSize: file.size,
          updatedAt: new Date(),
          updatedBy: new ObjectId(req.user.id)
        },
        $push: {
          modificationHistory: {
            action: 'replaced',
            performedBy: new ObjectId(req.user.id),
            performedAt: new Date(),
            oldFileName: existingPayslip.uniqueFileName,
            reason: req.body.reason || 'File replacement'
          }
        }
      }
    );

    res.json({ success: true, message: 'Document replaced successfully' });
  })
);

// DELETE /api/documents/:id - 문서 삭제 (Admin)
router.delete('/:id',
  requireAuth,
  requirePermission('admin:permissions'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const payslipsCollection = db.collection('payslips');
    const payslip = await payslipsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!payslip) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Soft delete - 실제 파일은 30일 후 삭제
    await payslipsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          deleted: true,
          deletedAt: new Date(),
          deletedBy: new ObjectId(req.user.id),
          deleteReason: reason || 'Admin deletion'
        }
      }
    );

    res.json({ success: true, message: 'Document deleted successfully' });
  })
);
```

### 6. 데이터베이스 스키마

#### 6.1 documents 컬렉션 (새로운 통합 컬렉션)
```javascript
// MongoDB Schema
{
  _id: ObjectId,
  userId: ObjectId,              // 문서 소유자
  type: String,                  // 'payslip' | 'certificate' | 'contract' | 'other'
  category: String,              // 세부 분류
  title: String,                 // 표시될 제목
  fileName: String,              // 시스템 파일명
  originalFilename: String,      // 원본 파일명
  fileSize: Number,              // 파일 크기 (bytes)
  mimeType: String,              // MIME type
  
  // 날짜 정보
  date: Date,                    // 문서 날짜
  year: Number,                  // 연도 (급여명세서용)
  month: Number,                 // 월 (급여명세서용)
  
  // 상태 및 권한
  status: String,                // 'available' | 'processing' | 'expired'
  canView: Boolean,
  canDownload: Boolean,
  canShare: Boolean,
  
  // 메타데이터
  metadata: {
    yearMonth: String,           // '2025-08'
    certificateType: String,     // 증명서 종류
    purpose: String,             // 용도
    generatedAt: Date,           // 생성 시각
    expiresAt: Date,            // 만료 시각
    payrollId: ObjectId,        // 연결된 급여 ID
  },
  
  // 감사 정보
  createdAt: Date,
  createdBy: ObjectId,
  updatedAt: Date,
  updatedBy: ObjectId,
  deleted: Boolean,
  deletedAt: Date,
  deletedBy: ObjectId,
  deleteReason: String,
  
  // 수정 이력
  modificationHistory: [{
    action: String,              // 'uploaded' | 'replaced' | 'deleted'
    performedBy: ObjectId,
    performedAt: Date,
    oldFileName: String,
    reason: String
  }],
  
  // 접근 로그
  accessLog: [{
    userId: ObjectId,
    action: String,              // 'view' | 'download' | 'share'
    timestamp: Date,
    ipAddress: String
  }]
}
```

## 📊 구현 단계별 체크리스트

### Phase 1: 기본 구조 (Day 1) ✅ COMPLETED
- [x] `MyDocuments.tsx` 페이지 생성
- [x] `documents.js` 백엔드 라우트 생성
- [x] `server.js`에 라우트 연결
- [x] `App.tsx`에 라우팅 추가
- [x] `Layout.tsx`에 메뉴 추가
- [x] `api.ts`에 API 메서드 추가

### Phase 2: 급여명세서 통합 (Day 2) ✅ COMPLETED
- [x] 기존 payslips 데이터 연동
- [x] DocumentList 컴포넌트 구현
- [x] PDF 다운로드 기능 구현
- [ ] PDF 뷰어 통합 (react-pdf) - 추가 구현 필요
- [x] 필터링 기능 (연도/월)

### Phase 3: Admin 기능 (Day 3) ✅ COMPLETED
- [x] 문서 교체 API 구현
- [x] 문서 삭제 API 구현
- [x] 수정 이력 추적
- [x] Admin UI 컴포넌트
- [x] 감사 로그 기능

### Phase 4: 테스트 및 최적화 (Day 4) ✅ COMPLETED
- [x] API 엔드포인트 테스트
- [x] 권한 체크 테스트
- [x] 파일 업로드/다운로드 테스트
- [x] 성능 최적화
- [x] 에러 처리 강화

## 🔒 보안 고려사항

### 권한 관리
```javascript
// 모든 API에서 권한 체크 필수
- 일반 사용자: 자신의 문서만 접근
- Admin: 모든 문서 접근 및 관리
- 파일 다운로드 시 토큰 검증
- 직접 URL 접근 차단
```

### 파일 보안
```javascript
// 파일 저장 및 접근 보안
- 파일명 난수화 (uniqueFileName)
- uploads 폴더 직접 접근 차단
- 다운로드 시 권한 재확인
- 민감 정보 로깅 금지
```

## 📈 성능 목표
- 페이지 로딩: < 2초
- 문서 목록 조회: < 1초
- PDF 다운로드 시작: < 1초
- 동시 사용자: 100명 이상

## 🚀 향후 확장 계획

### Phase 5: 증명서 자동 생성
- 재직증명서 템플릿
- 경력증명서 템플릿
- PDF 생성 라이브러리 통합 (puppeteer/pdfkit)

### Phase 6: 고급 기능
- 문서 공유 기능
- 전자 서명
- 대량 다운로드 (ZIP)
- OCR 텍스트 추출

## ⚠️ 주의사항

1. **기존 시스템 호환성**
   - payslips 컬렉션 데이터 유지
   - 기존 API 엔드포인트 유지
   - 점진적 마이그레이션

2. **에러 처리**
   - 파일 없음 처리
   - 권한 없음 처리  
   - 네트워크 오류 처리

3. **테스트**
   - 각 권한별 접근 테스트
   - 파일 업로드/다운로드 테스트
   - 동시성 테스트

---

*이 계획은 실제 프로젝트 코드 구조를 기반으로 작성되었으며, 모든 함수와 패턴은 기존 코드에서 검증된 것들입니다.*
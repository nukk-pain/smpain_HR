import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Eye as PreviewIcon,
  GitCompare as CompareIcon,
  CheckCircle as CheckIcon,
  XCircle as ErrorIcon,
  AlertTriangle as WarningIcon,
  FileText as ReportIcon,
  Loader2,
} from 'lucide-react';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';

interface UploadResult {
  uploadId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  summary: any;
}

interface ComparisonResult {
  total: number;
  matches: number;
  differences: number;
  notFound: number;
  invalid: number;
  details: any[];
}

const FileUpload: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [yearMonth, setYearMonth] = useState(new Date().toISOString().substring(0, 7));
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  const { showNotification } = useNotification();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      showNotification('error', 'Error', 'Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showNotification('error', 'Error', 'File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const response = await apiService.uploadPayrollFile(file, yearMonth);
      setUploadResult(response.success ? response.data : null);
      showNotification('success', 'Success', 'File uploaded and parsed successfully');
    } catch (error: any) {
      showNotification('error', 'Error', error.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async () => {
    if (!uploadResult) return;
    
    try {
      const response = await apiService.getUploadPreview(uploadResult.uploadId);
      setPreviewData(response.success ? response.data : []);
      setIsPreviewOpen(true);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load preview data');
    }
  };

  const handleCompare = async () => {
    if (!uploadResult) return;
    
    try {
      const response = await apiService.compareUploadData(uploadResult.uploadId, yearMonth);
      setComparisonResult(response.comparison);
      setIsComparisonOpen(true);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to compare data');
    }
  };

  const handleProcess = async () => {
    if (!uploadResult) return;
    
    setProcessing(true);
    try {
      await apiService.processUpload(uploadResult.uploadId, yearMonth);
      showNotification('success', 'Success', 'Data processed successfully');
      setUploadResult(null);
      setComparisonResult(null);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to process data');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await apiService.downloadPayrollTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'payroll_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to download template');
    }
  };

  const handleDownloadReport = async () => {
    if (!uploadResult || !comparisonResult) return;
    
    try {
      const blob = await apiService.downloadComparisonReport(uploadResult.uploadId, yearMonth);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comparison_report_${yearMonth}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to download report');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        급여 파일 업로드
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">파일 업로드</h3>
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <DownloadIcon className="h-4 w-4" />
                템플릿 다운로드
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="year-month">년월 선택</Label>
                <Input
                  id="year-month"
                  type="month"
                  value={yearMonth}
                  onChange={(e) => setYearMonth(e.target.value)}
                />
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary hover:bg-accent/50 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <UploadIcon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    파일 선택
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    급여 파일을 업로드하세요 (.xlsx, .xls)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    최대 파일 크기: 10MB
                  </p>
                </label>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Progress value={50} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    파일 업로드 및 분석 중...
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload Result */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">업로드 결과</h3>

            {uploadResult ? (
              <div className="space-y-4">
                <Alert>
                  <CheckIcon className="h-4 w-4" />
                  <AlertDescription>
                    파일이 성공적으로 업로드되고 분석되었습니다!
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-primary">
                      {uploadResult.totalRows}
                    </div>
                    <div className="text-sm text-muted-foreground">전체 행</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {uploadResult.validRows}
                    </div>
                    <div className="text-sm text-muted-foreground">유효한 행</div>
                  </div>
                </div>

                {uploadResult.invalidRows > 0 && (
                  <Alert variant="destructive">
                    <WarningIcon className="h-4 w-4" />
                    <AlertDescription>
                      {uploadResult.invalidRows}개의 행에 유효성 오류가 있습니다
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handlePreview}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <PreviewIcon className="h-4 w-4" />
                    미리보기
                  </Button>
                  <Button
                    onClick={handleCompare}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <CompareIcon className="h-4 w-4" />
                    비교
                  </Button>
                  {comparisonResult && (
                    <>
                      <Button
                        onClick={handleDownloadReport}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <ReportIcon className="h-4 w-4" />
                        보고서 다운로드
                      </Button>
                      <Button
                        onClick={handleProcess}
                        disabled={processing}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckIcon className="h-4 w-4" />
                        )}
                        {processing ? '처리 중...' : '처리'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  Excel 파일을 업로드하면 결과가 여기에 표시됩니다
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {comparisonResult && (
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">비교 결과</h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {comparisonResult.matches}
                    </div>
                    <div className="text-sm text-muted-foreground">일치</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {comparisonResult.differences}
                    </div>
                    <div className="text-sm text-muted-foreground">차이</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {comparisonResult.notFound}
                    </div>
                    <div className="text-sm text-muted-foreground">미발견</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold">
                      {comparisonResult.invalid}
                    </div>
                    <div className="text-sm text-muted-foreground">무효</div>
                  </div>
                </div>

                {comparisonResult.differences > 0 && (
                  <Alert variant="destructive">
                    <WarningIcon className="h-4 w-4" />
                    <AlertDescription>
                      {comparisonResult.differences}개의 레코드에 주의가 필요한 차이가 있습니다
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>업로드 미리보기</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사원번호</TableHead>
                  <TableHead>성명</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>기본급</TableHead>
                  <TableHead>인센티브</TableHead>
                  <TableHead>총액</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 10).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row['사원번호']}</TableCell>
                    <TableCell>{row['성명']}</TableCell>
                    <TableCell>{row['부서']}</TableCell>
                    <TableCell>{row['기본급']?.toLocaleString()}</TableCell>
                    <TableCell>{row['인센티브']?.toLocaleString()}</TableCell>
                    <TableCell>{row['지급총액']?.toLocaleString()}</TableCell>
                    <TableCell>
                      {row.__isValid ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          유효
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          무효
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPreviewOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comparison Dialog */}
      <Dialog open={isComparisonOpen} onOpenChange={setIsComparisonOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>데이터 비교</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사원번호</TableHead>
                  <TableHead>성명</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>시스템 총액</TableHead>
                  <TableHead>업로드 총액</TableHead>
                  <TableHead>차이</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonResult?.details.slice(0, 10).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.employeeId}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === 'match' ? 'default' :
                          item.status === 'different' ? 'secondary' : 'destructive'
                        }
                        className={
                          item.status === 'match' ? 'bg-green-100 text-green-800' :
                          item.status === 'different' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.system?.totalInput?.toLocaleString()}</TableCell>
                    <TableCell>{item.uploaded?.['지급총액']?.toLocaleString()}</TableCell>
                    <TableCell>
                      {item.differences?.totalInput ? (
                        <span className={item.differences.totalInput > 0 ? 'text-green-600' : 'text-red-600'}>
                          {item.differences.totalInput > 0 ? '+' : ''}{item.differences.totalInput.toLocaleString()}
                        </span>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsComparisonOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileUpload;
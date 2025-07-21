import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Save,
  RefreshCw,
  Eye,
  ChevronDown,
  Settings,
  Calendar,
  Clock,
  Building2,
  Loader2,
} from 'lucide-react';
import { useNotification } from '../components/NotificationProvider';
import { ApiService } from '../services/api';

interface LeavePolicy {
  policyId: string;
  annualLeaveRules: {
    firstYear: number;
    baseSecondYear: number;
    maxAnnualLeave: number;
    monthlyProration: boolean;
  };
  specialRules: {
    saturdayLeave: number;
    sundayLeave: number;
    holidayLeave: number;
  };
  leaveTypes: {
    annual: {
      advanceNotice: number;
      maxConsecutive: number;
    };
    family: {
      managerApproval: boolean;
      documentRequired: boolean;
    };
    personal: {
      yearlyLimit: number;
      paid: boolean;
    };
  };
  businessRules: {
    minAdvanceDays: number;
    maxConcurrentRequests: number;
  };
  carryOverRules: {
    maxCarryOverDays: number;
    carryOverDeadline: string;
  };
  updatedAt: string;
  updatedBy: string;
}

const AdminLeavePolicy: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<LeavePolicy | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const apiService = new ApiService();

  useEffect(() => {
    loadCurrentPolicy();
  }, []);

  const loadCurrentPolicy = async () => {
    try {
      setLoading(true);
      const response = await apiService.getLeavePolicy();
      
      if (response.success) {
        setPolicy(response.data);
      } else {
        showError('정책 정보를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('Error loading policy:', error);
      showError('정책 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!policy) return;
    
    try {
      setSaving(true);
      const response = await apiService.updateLeavePolicy(policy);
      
      if (response.success) {
        showSuccess('휴가 정책이 저장되었습니다.');
        setHasChanges(false);
        // Reload to get updated timestamps
        await loadCurrentPolicy();
      } else {
        showError(response.error || '정책 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error saving policy:', error);
      showError('정책 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handlePolicyChange = (path: string, value: any) => {
    if (!policy) return;
    
    const newPolicy = { ...policy };
    const pathParts = path.split('.');
    let current: any = newPolicy;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    
    current[pathParts[pathParts.length - 1]] = value;
    setPolicy(newPolicy);
    setHasChanges(true);
  };

  const handleReset = () => {
    if (window.confirm('모든 변경사항이 취소됩니다. 계속하시겠습니까?')) {
      loadCurrentPolicy();
      setHasChanges(false);
    }
  };

  const handlePreview = () => {
    if (!policy) return;
    
    const previewData = {
      '1년차 직원 연차': `${policy.annualLeaveRules.firstYear}일`,
      '3년차 직원 연차': `${policy.annualLeaveRules.baseSecondYear + 1}일`,
      '10년차 직원 연차': `${Math.min(policy.annualLeaveRules.baseSecondYear + 8, policy.annualLeaveRules.maxAnnualLeave)}일`,
      '토요일 휴가': `${policy.specialRules.saturdayLeave}일`,
      '일요일 휴가': `${policy.specialRules.sundayLeave}일`,
      '연차 사전 신청': `${policy.leaveTypes.annual.advanceNotice}일 전`,
      '개인휴가 한도': `${policy.leaveTypes.personal.yearlyLimit}일`,
      '최대 이월 연차': `${policy.carryOverRules.maxCarryOverDays}일`
    };
    
    const previewText = Object.entries(previewData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    alert(`정책 미리보기:\n\n${previewText}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!policy) {
    return (
      <Alert>
        <AlertDescription>
          정책 정보를 불러올 수 없습니다.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          📐 휴가 정책 관리
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            초기화
          </Button>
          <Button
            variant="outline"
            onClick={handlePreview}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            정책 미리보기
          </Button>
          <Button
            onClick={handleSavePolicy}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            저장
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Alert className="mb-6">
          <AlertDescription>
            변경사항이 있습니다. 저장 버튼을 클릭하여 정책을 저장하세요.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* 연차 계산 규칙 */}
        <Card>
          <Accordion type="single" defaultValue="annual-rules">
            <AccordionItem value="annual-rules">
              <AccordionTrigger>
                <h6 className="text-lg font-semibold">🗓️ 연차 계산 규칙</h6>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstYear">1년차 기본 연차</Label>
                    <Input
                      id="firstYear"
                      type="number"
                      value={policy.annualLeaveRules.firstYear}
                      onChange={(e) => handlePolicyChange('annualLeaveRules.firstYear', Number(e.target.value))}
                      min={1}
                      max={30}
                    />
                    <p className="text-sm text-gray-600">신입사원 기본 연차</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="baseSecondYear">2년차 이상 기본</Label>
                    <Input
                      id="baseSecondYear"
                      type="number"
                      value={policy.annualLeaveRules.baseSecondYear}
                      onChange={(e) => handlePolicyChange('annualLeaveRules.baseSecondYear', Number(e.target.value))}
                      min={1}
                      max={30}
                    />
                    <p className="text-sm text-gray-600">2년차부터 기본 연차</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAnnualLeave">최대 연차</Label>
                    <Input
                      id="maxAnnualLeave"
                      type="number"
                      value={policy.annualLeaveRules.maxAnnualLeave}
                      onChange={(e) => handlePolicyChange('annualLeaveRules.maxAnnualLeave', Number(e.target.value))}
                      min={1}
                      max={50}
                    />
                    <p className="text-sm text-gray-600">연차 상한선</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="monthlyProration"
                        checked={policy.annualLeaveRules.monthlyProration}
                        onCheckedChange={(checked) => handlePolicyChange('annualLeaveRules.monthlyProration', checked)}
                      />
                      <Label htmlFor="monthlyProration">월 중 입사 일할계산</Label>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* 특별 규칙 */}
        <Card>
          <Accordion type="single" defaultValue="special-rules">
            <AccordionItem value="special-rules">
              <AccordionTrigger>
                <h6 className="text-lg font-semibold">⏰ 특별 규칙</h6>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="saturdayLeave">토요일 휴가 계산</Label>
                    <Input
                      id="saturdayLeave"
                      type="number"
                      value={policy.specialRules.saturdayLeave}
                      onChange={(e) => handlePolicyChange('specialRules.saturdayLeave', Number(e.target.value))}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                    <p className="text-sm text-gray-600">토요일 휴가시 차감 일수</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sundayLeave">일요일 휴가 계산</Label>
                    <Input
                      id="sundayLeave"
                      type="number"
                      value={policy.specialRules.sundayLeave}
                      onChange={(e) => handlePolicyChange('specialRules.sundayLeave', Number(e.target.value))}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                    <p className="text-sm text-gray-600">일요일 휴가시 차감 일수</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holidayLeave">공휴일 휴가 계산</Label>
                    <Input
                      id="holidayLeave"
                      type="number"
                      value={policy.specialRules.holidayLeave}
                      onChange={(e) => handlePolicyChange('specialRules.holidayLeave', Number(e.target.value))}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                    <p className="text-sm text-gray-600">공휴일 휴가시 차감 일수</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* 휴가 종류별 설정 */}
        <Card>
          <Accordion type="single" defaultValue="leave-types">
            <AccordionItem value="leave-types">
              <AccordionTrigger>
                <h6 className="text-lg font-semibold">🏷️ 휴가 종류별 설정</h6>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h6 className="font-semibold">연차 휴가</h6>
                    <div className="space-y-2">
                      <Label htmlFor="advanceNotice">사전 신청 일수</Label>
                      <Input
                        id="advanceNotice"
                        type="number"
                        value={policy.leaveTypes.annual.advanceNotice}
                        onChange={(e) => handlePolicyChange('leaveTypes.annual.advanceNotice', Number(e.target.value))}
                        min={0}
                        max={30}
                      />
                      <p className="text-sm text-gray-600">몇 일 전에 신청해야 하는지</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxConsecutive">최대 연속 일수</Label>
                      <Input
                        id="maxConsecutive"
                        type="number"
                        value={policy.leaveTypes.annual.maxConsecutive}
                        onChange={(e) => handlePolicyChange('leaveTypes.annual.maxConsecutive', Number(e.target.value))}
                        min={1}
                        max={50}
                      />
                      <p className="text-sm text-gray-600">한 번에 사용할 수 있는 최대 일수</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h6 className="font-semibold">경조사 휴가</h6>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="managerApproval"
                        checked={policy.leaveTypes.family.managerApproval}
                        onCheckedChange={(checked) => handlePolicyChange('leaveTypes.family.managerApproval', checked)}
                      />
                      <Label htmlFor="managerApproval">부서장 승인 필수</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="documentRequired"
                        checked={policy.leaveTypes.family.documentRequired}
                        onCheckedChange={(checked) => handlePolicyChange('leaveTypes.family.documentRequired', checked)}
                      />
                      <Label htmlFor="documentRequired">증빙서류 필수</Label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h6 className="font-semibold">개인 휴가</h6>
                    <div className="space-y-2">
                      <Label htmlFor="yearlyLimit">연간 한도</Label>
                      <Input
                        id="yearlyLimit"
                        type="number"
                        value={policy.leaveTypes.personal.yearlyLimit}
                        onChange={(e) => handlePolicyChange('leaveTypes.personal.yearlyLimit', Number(e.target.value))}
                        min={0}
                        max={30}
                      />
                      <p className="text-sm text-gray-600">연간 사용 가능한 개인휴가 일수</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="personalPaid"
                        checked={policy.leaveTypes.personal.paid}
                        onCheckedChange={(checked) => handlePolicyChange('leaveTypes.personal.paid', checked)}
                      />
                      <Label htmlFor="personalPaid">급여 지급 (무급이면 OFF)</Label>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* 업무 규칙 */}
        <Card>
          <Accordion type="single" defaultValue="business-rules">
            <AccordionItem value="business-rules">
              <AccordionTrigger>
                <h6 className="text-lg font-semibold">💼 업무 규칙</h6>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minAdvanceDays">최소 사전 신청 일수</Label>
                    <Input
                      id="minAdvanceDays"
                      type="number"
                      value={policy.businessRules.minAdvanceDays}
                      onChange={(e) => handlePolicyChange('businessRules.minAdvanceDays', Number(e.target.value))}
                      min={0}
                      max={30}
                    />
                    <p className="text-sm text-gray-600">휴가 신청 최소 사전 통보 일수</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxConcurrentRequests">최대 동시 신청 건수</Label>
                    <Input
                      id="maxConcurrentRequests"
                      type="number"
                      value={policy.businessRules.maxConcurrentRequests}
                      onChange={(e) => handlePolicyChange('businessRules.maxConcurrentRequests', Number(e.target.value))}
                      min={1}
                      max={10}
                    />
                    <p className="text-sm text-gray-600">동시에 처리 대기할 수 있는 신청 건수</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* 이월 규칙 */}
        <Card>
          <Accordion type="single" defaultValue="carryover-rules">
            <AccordionItem value="carryover-rules">
              <AccordionTrigger>
                <h6 className="text-lg font-semibold">🔄 이월 규칙</h6>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxCarryOverDays">최대 이월 가능 일수</Label>
                    <Input
                      id="maxCarryOverDays"
                      type="number"
                      value={policy.carryOverRules.maxCarryOverDays}
                      onChange={(e) => handlePolicyChange('carryOverRules.maxCarryOverDays', Number(e.target.value))}
                      min={0}
                      max={30}
                    />
                    <p className="text-sm text-gray-600">전년도에서 이월 가능한 최대 일수</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carryOverDeadline">이월 사용 마감일</Label>
                    <Input
                      id="carryOverDeadline"
                      value={policy.carryOverRules.carryOverDeadline}
                      onChange={(e) => handlePolicyChange('carryOverRules.carryOverDeadline', e.target.value)}
                      placeholder="02-28"
                    />
                    <p className="text-sm text-gray-600">MM-DD 형식 (예: 02-28)</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>

      {/* 정책 적용 현황 */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <h6 className="text-lg font-semibold mb-4">📋 정책 적용 현황</h6>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">
                마지막 업데이트: {new Date(policy.updatedAt).toLocaleString('ko-KR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                업데이트한 사람: {policy.updatedBy}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLeavePolicy;
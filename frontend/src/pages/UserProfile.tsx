import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User as PersonIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  X as CancelIcon,
  Loader2
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../components/NotificationProvider';
import { apiService } from '../services/api';
import { User } from '../types';

const UserProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    phoneNumber: '',
    department: '',
    position: ''
  });

  useEffect(() => {
    if (user) {
      setUserInfo(user);
      setFormData({
        name: user.name || '',
        birthDate: user.birthDate || '',
        phoneNumber: user.phoneNumber || '',
        department: user.department || '',
        position: user.position || ''
      });
    }
  }, [user]);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    if (userInfo) {
      setFormData({
        name: userInfo.name || '',
        birthDate: userInfo.birthDate || '',
        phoneNumber: userInfo.phoneNumber || '',
        department: userInfo.department || '',
        position: userInfo.position || ''
      });
    }
  };

  const handleSave = async () => {
    if (!userInfo) {
      console.error('No userInfo available');
      showError('사용자 정보를 찾을 수 없습니다.');
      return;
    }
    
    console.log('UserInfo object:', userInfo);
    console.log('UserInfo._id:', userInfo._id);
    console.log('UserInfo.id:', userInfo.id);
    
    try {
      setLoading(true);
      
      // Only send the fields that the user can actually edit
      const updateData = {
        name: formData.name,
        birthDate: formData.birthDate,
        phoneNumber: formData.phoneNumber
      };

      const userId = userInfo._id || userInfo.id;
      console.log('Using userId:', userId);
      
      await apiService.updateUserProfile(userId, updateData);
      
      // Refresh user data
      await refreshUser();
      
      showSuccess('개인정보가 성공적으로 업데이트되었습니다.');
      setEditing(false);
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      showError(error.response?.data?.error || '개인정보 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getContractTypeLabel = (type?: string) => {
    switch (type) {
      case 'regular':
        return '정규직';
      case 'contract':
        return '계약직';
      default:
        return '정보 없음';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return '관리자';
      case 'manager':
        return '매니저';
      case 'user':
        return '사용자';
      default:
        return '정보 없음';
    }
  };

  if (!userInfo) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          👤 내 정보
        </h1>
        {!editing ? (
          <Button
            onClick={handleEdit}
            className="flex items-center gap-2"
          >
            <EditIcon className="h-4 w-4" />
            정보 수정
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <CancelIcon className="h-4 w-4" />
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
              저장
            </Button>
          </div>
        )}
      </div>

      {/* Profile Summary Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-6 mb-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-blue-600 text-white">
                <PersonIcon className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold mb-1">
                {userInfo.name}
              </h2>
              <p className="text-muted-foreground mb-2">
                {userInfo.employeeId} | {userInfo.department || '부서 정보 없음'}
              </p>
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                {getRoleLabel(userInfo.role)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            👤 개인 정보
          </h3>
          <div className="border-b mb-4"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={formData.name}
                disabled
                placeholder="홍길동"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">생년월일</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">전화번호</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                disabled={!editing}
                placeholder="010-1234-5678"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Information */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🏢 근무 정보
          </h3>
          <div className="border-b mb-4"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">부서</Label>
              <Input
                id="department"
                value={userInfo.department || '정보 없음'}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">직급</Label>
              <Input
                id="position"
                value={userInfo.position || '정보 없음'}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hireDate">입사일</Label>
              <Input
                id="hireDate"
                value={userInfo.hireDateFormatted || userInfo.hireDate || '정보 없음'}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractType">근무 형태</Label>
              <Input
                id="contractType"
                value={getContractTypeLabel(userInfo.contractType)}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsOfService">근속년수</Label>
              <Input
                id="yearsOfService"
                value={userInfo.yearsOfService !== undefined && userInfo.yearsOfService !== null ? `${userInfo.yearsOfService}년` : '정보 없음'}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annualLeave">연차</Label>
              <Input
                id="annualLeave"
                value={userInfo.annualLeave !== undefined && userInfo.annualLeave !== null ? `${userInfo.annualLeave}일` : '정보 없음'}
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <Alert className="mb-6">
          <AlertDescription>
            <strong>수정 가능한 정보:</strong> 이름, 생년월일, 전화번호만 수정할 수 있습니다.
            부서, 직급 등의 근무 정보는 관리자에게 문의하세요.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default UserProfile;
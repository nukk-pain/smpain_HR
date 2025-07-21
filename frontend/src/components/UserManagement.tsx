import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Key,
  UserPlus,
  Upload,
  Download,
  Search,
  Trash,
  Shield,
  Loader2,
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { User, UserForm, Department, Position } from '../types';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [permanentDeleteConfirmOpen, setPermanentDeleteConfirmOpen] = useState(false);
  const [userToDeletePermanently, setUserToDeletePermanently] = useState<User | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [userForm, setUserForm] = useState<UserForm>({
    username: '',
    password: '',
    name: '',
    role: 'user',
    hireDate: '',
    department: '',
    position: '',
    employeeId: '',
    accountNumber: '',
    managerId: '',
    contractType: 'regular',
    baseSalary: 0,
    incentiveFormula: '',
    birthDate: '',
    phoneNumber: '',
  });

  // Username validation function
  const validateUsername = (username: string) => {
    const pattern = /^[a-zA-Z0-9가-힣_-]{2,30}$/;
    return pattern.test(username);
  };

  const [usernameError, setUsernameError] = useState('');

  const { showNotification } = useNotification();

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getUsers({
        department: departmentFilter || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        search: searchTerm || undefined,
      });
      setUsers(response.success ? response.data : []);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [departmentFilter, statusFilter, searchTerm]);

  const loadDepartments = useCallback(async () => {
    try {
      const response = await apiService.getDepartments();
      setDepartments(response.success ? response.data : []);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      const response = await apiService.getPositions();
      setPositions(response.success ? response.data : []);
    } catch (error) {
      console.error('Failed to load positions:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadDepartments();
    loadPositions();
  }, [loadUsers, loadDepartments, loadPositions]);

  const handleSearch = () => {
    loadUsers();
  };

  const handleAddUser = () => {
    setIsEditing(false);
    setUserForm({
      username: '',
      password: '',
      name: '',
      role: 'user',
      hireDate: '',
      department: '',
      position: '',
      employeeId: '', // Will be auto-generated, not used in form
      accountNumber: '',
      managerId: '',
      contractType: 'regular',
      baseSalary: 0,
      incentiveFormula: '',
      birthDate: '',
      phoneNumber: '',
    });
    setIsDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setIsEditing(true);
    setSelectedUser(user);
    setUserForm({
      username: user.username,
      name: user.name,
      role: user.role,
      hireDate: user.hireDate || '',
      department: user.department || '',
      position: user.position || '',
      employeeId: user.employeeId || '',
      accountNumber: user.accountNumber || '',
      managerId: user.managerId || '',
      contractType: user.contractType || 'regular',
      baseSalary: user.baseSalary || 0,
      incentiveFormula: user.incentiveFormula || '',
      birthDate: user.birthDate || '',
      phoneNumber: user.phoneNumber || '',
    });
    setIsDialogOpen(true);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewDialogOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (window.confirm(`Are you sure you want to deactivate ${user.name}?`)) {
      try {
        await apiService.deleteUser(user._id, false);
        showNotification('success', 'Success', 'User deactivated successfully');
        loadUsers();
      } catch (error) {
        showNotification('error', 'Error', 'Failed to deactivate user');
      }
    }
  };

  const handleActivateUser = async (user: User) => {
    if (window.confirm(`Are you sure you want to activate ${user.name}?`)) {
      try {
        await apiService.activateUser(user._id);
        showNotification('success', 'Success', 'User activated successfully');
        loadUsers();
      } catch (error) {
        showNotification('error', 'Error', 'Failed to activate user');
      }
    }
  };

  const handleResetPassword = async (user: User) => {
    const newPassword = prompt(`Enter new password for ${user.name}:`);
    if (newPassword) {
      try {
        await apiService.resetUserPassword(user._id, newPassword);
        showNotification('success', 'Success', 'Password reset successfully');
      } catch (error) {
        showNotification('error', 'Error', 'Failed to reset password');
      }
    }
  };

  const handleSaveUser = async () => {
    try {
      // Validate username format before submitting
      if (!validateUsername(userForm.username)) {
        setUsernameError('영문, 한글, 숫자, _, - 만 사용 가능 (2-30자)');
        return;
      }

      if (isEditing && selectedUser) {
        await apiService.updateUser(selectedUser._id, userForm);
        showNotification('success', 'Success', 'User updated successfully');
      } else {
        // Remove employeeId from form data since it's auto-generated
        const { employeeId, ...formDataWithoutEmployeeId } = userForm;
        await apiService.createUser(formDataWithoutEmployeeId);
        showNotification('success', 'Success', 'User created successfully');
      }
      setIsDialogOpen(false);
      setUsernameError('');
      loadUsers();
    } catch (error: any) {
      showNotification('error', 'Error', error.response?.data?.error || 'Failed to save user');
    }
  };

  const handlePermanentDeleteUser = (user: User) => {
    setUserToDeletePermanently(user);
    setPermanentDeleteConfirmOpen(true);
  };

  const confirmPermanentDeleteUser = async () => {
    if (!userToDeletePermanently) return;
    
    try {
      await apiService.deleteUser(userToDeletePermanently._id, true); // permanent = true
      showNotification('success', 'Success', 'User permanently deleted from database');
      loadUsers();
      setPermanentDeleteConfirmOpen(false);
      setUserToDeletePermanently(null);
    } catch (error: any) {
      showNotification('error', 'Error', error.response?.data?.error || 'Failed to permanently delete user');
      setPermanentDeleteConfirmOpen(false);
      setUserToDeletePermanently(null);
    }
  };

  const handleManagePermissions = async (user: User) => {
    try {
      setPermissionsLoading(true);
      setSelectedUserForPermissions(user);
      
      // Load available permissions and user's current permissions
      const [permissionsResponse, userPermissionsResponse] = await Promise.all([
        apiService.getAvailablePermissions(),
        apiService.getUserPermissions(user._id)
      ]);
      
      setAvailablePermissions(permissionsResponse.data || permissionsResponse.permissions);
      setUserPermissions(userPermissionsResponse.data?.permissions || []);
      setPermissionsDialogOpen(true);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load permissions');
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setUserPermissions(prev => 
      checked 
        ? [...prev, permission]
        : prev.filter(p => p !== permission)
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUserForPermissions) return;
    
    try {
      setPermissionsLoading(true);
      await apiService.updateUserPermissions(selectedUserForPermissions._id, userPermissions);
      showNotification('success', 'Success', 'User permissions updated successfully');
      setPermissionsDialogOpen(false);
      loadUsers();
    } catch (error) {
      showNotification('error', 'Error', 'Failed to update permissions');
    } finally {
      setPermissionsLoading(false);
    }
  };

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
  };

  const ActionCellRenderer = (props: any) => {
    const user = props.data;
    return (
      <div className="flex gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleViewUser(user)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View Details</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEditUser(user)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit User</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleResetPassword(user)}
            >
              <Key className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset Password</TooltipContent>
        </Tooltip>
        {user.isActive ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteUser(user)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Deactivate User</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleActivateUser(user)}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Activate User</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleManagePermissions(user)}
              className="text-primary"
            >
              <Shield className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Manage Permissions</TooltipContent>
        </Tooltip>
        {user.username !== 'admin' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePermanentDeleteUser(user)}
                className="text-destructive"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Permanently Delete from Database</TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  };

  const StatusCellRenderer = (props: any) => {
    const isActive = props.value;
    return (
      <Badge variant={isActive ? 'default' : 'destructive'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const ContractTypeCellRenderer = (props: any) => {
    const contractType = props.value;
    return (
      <Badge variant={contractType === 'regular' ? 'default' : 'secondary'}>
        {contractType === 'regular' ? 'Regular' : 'Contract'}
      </Badge>
    );
  };

  const columnDefs: ColDef[] = [
    {
      headerName: 'Name',
      field: 'name',
      width: 150,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Username',
      field: 'username',
      width: 120,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Phone',
      field: 'phoneNumber',
      width: 130,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Department',
      field: 'department',
      width: 120,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Position',
      field: 'position',
      width: 120,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Role',
      field: 'role',
      width: 100,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Contract Type',
      field: 'contractType',
      width: 120,
      cellRenderer: ContractTypeCellRenderer,
    },
    {
      headerName: 'Years of Service',
      field: 'yearsOfService',
      width: 130,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'Status',
      field: 'isActive',
      width: 100,
      cellRenderer: StatusCellRenderer,
    },
    {
      headerName: 'Actions',
      width: 200,
      cellRenderer: ActionCellRenderer,
      sortable: false,
      filter: false,
    },
  ];

  const defaultColDef = {
    sortable: true,
    resizable: true,
    filter: true,
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">User Management</h1>
          <Button onClick={handleAddUser}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Label htmlFor="search" className="sr-only">
                  Search users
                </Label>
                <Input
                  id="search"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={handleSearch}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Label htmlFor="department" className="sr-only">
                  Department
                </Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.name} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status" className="sr-only">
                  Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSearch}
                variant="outline"
                className="w-full"
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="ag-theme-alpine" style={{ height: 600, width: '100%' }}>
                <AgGridReact
                  columnDefs={columnDefs}
                  rowData={users}
                  defaultColDef={defaultColDef}
                  pagination={true}
                  paginationPageSize={20}
                  onGridReady={onGridReady}
                  suppressRowHoverHighlight={false}
                  suppressCellFocus={true}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit User Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Edit User' : 'Add New User'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={userForm.username}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUserForm({ ...userForm, username: value });
                    
                    // Real-time validation
                    if (value && !validateUsername(value)) {
                      setUsernameError('영문, 한글, 숫자, _, - 만 사용 가능 (2-30자)');
                    } else {
                      setUsernameError('');
                    }
                  }}
                  required
                  disabled={isEditing}
                  className={usernameError ? 'border-destructive' : ''}
                />
                <p className={`text-sm ${usernameError ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {usernameError || "영문, 한글, 숫자, _, - 사용 가능 (2-30자)"}
                </p>
              </div>
              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">이름 (Full Name) *</Label>
                <Input
                  id="name"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  required
                  placeholder="홍길동"
                />
                <p className="text-sm text-muted-foreground">한글 이름을 입력하세요</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">생년월일 (Birth Date)</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={userForm.birthDate}
                  onChange={(e) => setUserForm({ ...userForm, birthDate: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">YYYY-MM-DD 형식</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">전화번호 (Phone Number)</Label>
                <Input
                  id="phoneNumber"
                  value={userForm.phoneNumber}
                  onChange={(e) => setUserForm({ ...userForm, phoneNumber: e.target.value })}
                  placeholder="010-1234-5678"
                />
                <p className="text-sm text-muted-foreground">연락 가능한 전화번호를 입력하세요</p>
              </div>
              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    value={userForm.employeeId}
                    onChange={(e) => setUserForm({ ...userForm, employeeId: e.target.value })}
                    disabled
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={userForm.department} onValueChange={(value) => setUserForm({ ...userForm, department: value })}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept._id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Select value={userForm.position} onValueChange={(value) => setUserForm({ ...userForm, position: value })}>
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Select Position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Position</SelectItem>
                    {positions.map((position) => (
                      <SelectItem key={position._id} value={position.title}>
                        {position.title}
                        {position.department && ` (${position.department})`}
                        {position.level && ` - Level ${position.level}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value as any })}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractType">Contract Type</Label>
                <Select value={userForm.contractType} onValueChange={(value) => setUserForm({ ...userForm, contractType: value as any })}>
                  <SelectTrigger id="contractType">
                    <SelectValue placeholder="Select Contract Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hireDate">Hire Date</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={userForm.hireDate}
                  onChange={(e) => setUserForm({ ...userForm, hireDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseSalary">Base Salary</Label>
                <Input
                  id="baseSalary"
                  type="number"
                  value={userForm.baseSalary}
                  onChange={(e) => setUserForm({ ...userForm, baseSalary: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={userForm.accountNumber}
                  onChange={(e) => setUserForm({ ...userForm, accountNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="incentiveFormula">Incentive Formula</Label>
                <Select value={userForm.incentiveFormula} onValueChange={(value) => setUserForm({ ...userForm, incentiveFormula: value })}>
                  <SelectTrigger id="incentiveFormula">
                    <SelectValue placeholder="Select Incentive Formula" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Incentive</SelectItem>
                    <SelectItem value="personal_sales_15">Personal Sales 15%</SelectItem>
                    <SelectItem value="personal_sales_10">Personal Sales 10%</SelectItem>
                    <SelectItem value="personal_sales_5">Personal Sales 5%</SelectItem>
                    <SelectItem value="team_sales_10">Team Sales 10%</SelectItem>
                    <SelectItem value="team_sales_5">Team Sales 5%</SelectItem>
                    <SelectItem value="total_sales_3">Total Sales 3%</SelectItem>
                    <SelectItem value="fixed_bonus">Fixed Monthly Bonus</SelectItem>
                    <SelectItem value="performance_based">Performance Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={handleSaveUser}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </Dialog>

        {/* View User Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Employee ID</p>
                  <p className="text-base">{selectedUser.employeeId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-base">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Username</p>
                  <p className="text-base">{selectedUser.username}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Birth Date</p>
                  <p className="text-base">{selectedUser.birthDate || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                  <p className="text-base">{selectedUser.phoneNumber || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="text-base">{selectedUser.department}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Position</p>
                  <p className="text-base">{selectedUser.position}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p className="text-base">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contract Type</p>
                  <p className="text-base">{selectedUser.contractType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hire Date</p>
                  <p className="text-base">{selectedUser.hireDateFormatted}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Years of Service</p>
                  <p className="text-base">{selectedUser.yearsOfService}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Annual Leave</p>
                  <p className="text-base">{selectedUser.annualLeave} days</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Account Number</p>
                  <p className="text-base">{selectedUser.accountNumber}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Incentive Formula</p>
                  <p className="text-base">{selectedUser.incentiveFormula}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permanent Delete User Confirmation Dialog */}
        <Dialog open={permanentDeleteConfirmOpen} onOpenChange={setPermanentDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">
                ⚠️ Permanently Delete User
              </DialogTitle>
            </DialogHeader>
            <Alert className="mb-4">
              <AlertTitle>PERMANENT DELETION</AlertTitle>
            </Alert>
            <div className="space-y-4">
              <p className="text-base">
                Are you sure you want to <strong>permanently delete</strong> user "{userToDeletePermanently?.name}" from the database?
              </p>
              <p className="text-sm text-muted-foreground">
                This will completely remove:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>User profile and account information</li>
                <li>All associated leave records</li>
                <li>All payroll data for this user</li>
                <li>All historical data</li>
              </ul>
              <p className="text-sm text-destructive font-semibold">
                This action cannot be undone!
              </p>
              <div className="text-sm">
                Employee ID: <strong>{userToDeletePermanently?.employeeId}</strong><br/>
                Department: <strong>{userToDeletePermanently?.department}</strong><br/>
                Position: <strong>{userToDeletePermanently?.position}</strong>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setPermanentDeleteConfirmOpen(false)} variant="outline">Cancel</Button>
              <Button 
                onClick={confirmPermanentDeleteUser} 
                variant="destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Permanently Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permissions Management Dialog */}
        <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                🔐 권한 관리 - {selectedUserForPermissions?.name}
              </DialogTitle>
            </DialogHeader>
            {permissionsLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground mb-6">
                  사용자의 권한을 관리할 수 있습니다. 체크된 항목은 해당 사용자가 접근할 수 있는 기능입니다.
                </p>
                
                {availablePermissions && Object.entries(availablePermissions).map(([category, permissions]: [string, any]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="text-lg font-semibold text-primary">
                      {category === 'users' && '👥 직원 관리'}
                      {category === 'leave' && '🏖️ 휴가 관리'}
                      {category === 'payroll' && '💰 급여 관리'}
                      {category === 'departments' && '🏢 부서 관리'}
                      {category === 'positions' && '👔 직급 관리'}
                      {category === 'reports' && '📊 보고서'}
                      {category === 'files' && '📁 파일 관리'}
                      {category === 'admin' && '⚙️ 관리자'}
                    </h3>
                    <div className="pl-6 space-y-2">
                      {permissions.map((perm: any) => (
                        <div key={perm.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={perm.key}
                            checked={userPermissions.includes(perm.key)}
                            onCheckedChange={(checked) => handlePermissionChange(perm.key, checked as boolean)}
                          />
                          <Label htmlFor={perm.key} className="font-normal">
                            {perm.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setPermissionsDialogOpen(false)} variant="outline">취소</Button>
              <Button 
                onClick={handleSavePermissions} 
                disabled={permissionsLoading}
              >
                <Shield className="mr-2 h-4 w-4" />
                권한 저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default UserManagement;
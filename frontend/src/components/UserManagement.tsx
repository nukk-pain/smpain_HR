import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  VpnKey as ResetPasswordIcon,
  PersonAdd as ActivateIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  DeleteForever as PermanentDeleteIcon,
  Security as PermissionsIcon,
} from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { User, UserForm, Department, Position } from '../types';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

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
  });

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
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title="View Details">
          <IconButton size="small" onClick={() => handleViewUser(user)}>
            <ViewIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit User">
          <IconButton size="small" onClick={() => handleEditUser(user)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset Password">
          <IconButton size="small" onClick={() => handleResetPassword(user)}>
            <ResetPasswordIcon />
          </IconButton>
        </Tooltip>
        {user.isActive ? (
          <Tooltip title="Deactivate User">
            <IconButton size="small" onClick={() => handleDeleteUser(user)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Activate User">
            <IconButton size="small" onClick={() => handleActivateUser(user)}>
              <ActivateIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Manage Permissions">
          <IconButton 
            size="small" 
            onClick={() => handleManagePermissions(user)}
            sx={{ color: 'primary.main' }}
          >
            <PermissionsIcon />
          </IconButton>
        </Tooltip>
        {user.username !== 'admin' && (
          <Tooltip title="Permanently Delete from Database">
            <IconButton 
              size="small" 
              onClick={() => handlePermanentDeleteUser(user)}
              sx={{ color: 'error.main' }}
            >
              <PermanentDeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  };

  const StatusCellRenderer = (props: any) => {
    const isActive = props.value;
    return (
      <Chip
        label={isActive ? 'Active' : 'Inactive'}
        color={isActive ? 'success' : 'error'}
        size="small"
      />
    );
  };

  const ContractTypeCellRenderer = (props: any) => {
    const contractType = props.value;
    return (
      <Chip
        label={contractType === 'regular' ? 'Regular' : 'Contract'}
        color={contractType === 'regular' ? 'primary' : 'secondary'}
        size="small"
      />
    );
  };

  const columnDefs: ColDef[] = [
    {
      headerName: 'Employee ID',
      field: 'employeeId',
      width: 120,
      filter: 'agTextColumnFilter',
    },
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddUser}
        >
          Add User
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={handleSearch}>
                      <SearchIcon />
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={departmentFilter}
                  label="Department"
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.name} value={dept.name}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleSearch}
                startIcon={<SearchIcon />}
              >
                Search
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <div className="ag-theme-material" style={{ height: 600, width: '100%' }}>
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
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Username"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                required
                disabled={isEditing}
              />
            </Grid>
            {!isEditing && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                required
              />
            </Grid>
            {isEditing && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Employee ID"
                  value={userForm.employeeId}
                  onChange={(e) => setUserForm({ ...userForm, employeeId: e.target.value })}
                  disabled
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={userForm.department}
                  onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                  label="Department"
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept._id} value={dept.name}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Position</InputLabel>
                <Select
                  value={userForm.position}
                  onChange={(e) => setUserForm({ ...userForm, position: e.target.value })}
                  label="Position"
                >
                  <MenuItem value="">No Position</MenuItem>
                  {positions.map((position) => (
                    <MenuItem key={position._id} value={position.title}>
                      {position.title}
                      {position.department && ` (${position.department})`}
                      {position.level && ` - Level ${position.level}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={userForm.role}
                  label="Role"
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                >
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Contract Type</InputLabel>
                <Select
                  value={userForm.contractType}
                  label="Contract Type"
                  onChange={(e) => setUserForm({ ...userForm, contractType: e.target.value as any })}
                >
                  <MenuItem value="regular">Regular</MenuItem>
                  <MenuItem value="contract">Contract</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Hire Date"
                type="date"
                value={userForm.hireDate}
                onChange={(e) => setUserForm({ ...userForm, hireDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Base Salary"
                type="number"
                value={userForm.baseSalary}
                onChange={(e) => setUserForm({ ...userForm, baseSalary: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Account Number"
                value={userForm.accountNumber}
                onChange={(e) => setUserForm({ ...userForm, accountNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Incentive Formula</InputLabel>
                <Select
                  value={userForm.incentiveFormula}
                  label="Incentive Formula"
                  onChange={(e) => setUserForm({ ...userForm, incentiveFormula: e.target.value })}
                >
                  <MenuItem value="">No Incentive</MenuItem>
                  <MenuItem value="personal_sales_15">Personal Sales 15%</MenuItem>
                  <MenuItem value="personal_sales_10">Personal Sales 10%</MenuItem>
                  <MenuItem value="personal_sales_5">Personal Sales 5%</MenuItem>
                  <MenuItem value="team_sales_10">Team Sales 10%</MenuItem>
                  <MenuItem value="team_sales_5">Team Sales 5%</MenuItem>
                  <MenuItem value="total_sales_3">Total Sales 3%</MenuItem>
                  <MenuItem value="fixed_bonus">Fixed Monthly Bonus</MenuItem>
                  <MenuItem value="performance_based">Performance Based</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Employee ID</Typography>
                <Typography variant="body1">{selectedUser.employeeId}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Name</Typography>
                <Typography variant="body1">{selectedUser.name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Username</Typography>
                <Typography variant="body1">{selectedUser.username}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Department</Typography>
                <Typography variant="body1">{selectedUser.department}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Position</Typography>
                <Typography variant="body1">{selectedUser.position}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Role</Typography>
                <Typography variant="body1">{selectedUser.role}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Contract Type</Typography>
                <Typography variant="body1">{selectedUser.contractType}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Hire Date</Typography>
                <Typography variant="body1">{selectedUser.hireDateFormatted}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Years of Service</Typography>
                <Typography variant="body1">{selectedUser.yearsOfService}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Annual Leave</Typography>
                <Typography variant="body1">{selectedUser.annualLeave} days</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Account Number</Typography>
                <Typography variant="body1">{selectedUser.accountNumber}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Incentive Formula</Typography>
                <Typography variant="body1">{selectedUser.incentiveFormula}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Permanent Delete User Confirmation Dialog */}
      <Dialog open={permanentDeleteConfirmOpen} onClose={() => setPermanentDeleteConfirmOpen(false)}>
        <DialogTitle sx={{ color: 'error.main' }}>
          ⚠️ Permanently Delete User
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">PERMANENT DELETION</Typography>
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to <strong>permanently delete</strong> user "{userToDeletePermanently?.name}" from the database?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will completely remove:
          </Typography>
          <ul>
            <li>User profile and account information</li>
            <li>All associated leave records</li>
            <li>All payroll data for this user</li>
            <li>All historical data</li>
          </ul>
          <Typography variant="body2" color="error.main" sx={{ mt: 2 }}>
            <strong>This action cannot be undone!</strong>
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Employee ID: <strong>{userToDeletePermanently?.employeeId}</strong><br/>
            Department: <strong>{userToDeletePermanently?.department}</strong><br/>
            Position: <strong>{userToDeletePermanently?.position}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermanentDeleteConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmPermanentDeleteUser} 
            color="error" 
            variant="contained"
            startIcon={<PermanentDeleteIcon />}
          >
            Permanently Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Management Dialog */}
      <Dialog open={permissionsDialogOpen} onClose={() => setPermissionsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          🔐 권한 관리 - {selectedUserForPermissions?.name}
        </DialogTitle>
        <DialogContent>
          {permissionsLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                사용자의 권한을 관리할 수 있습니다. 체크된 항목은 해당 사용자가 접근할 수 있는 기능입니다.
              </Typography>
              
              {availablePermissions && Object.entries(availablePermissions).map(([category, permissions]: [string, any]) => (
                <Box key={category} sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                    {category === 'users' && '👥 직원 관리'}
                    {category === 'leave' && '🏖️ 휴가 관리'}
                    {category === 'payroll' && '💰 급여 관리'}
                    {category === 'departments' && '🏢 부서 관리'}
                    {category === 'positions' && '👔 직급 관리'}
                    {category === 'reports' && '📊 보고서'}
                    {category === 'files' && '📁 파일 관리'}
                    {category === 'admin' && '⚙️ 관리자'}
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    {permissions.map((perm: any) => (
                      <FormControlLabel
                        key={perm.key}
                        control={
                          <Checkbox
                            checked={userPermissions.includes(perm.key)}
                            onChange={(e) => handlePermissionChange(perm.key, e.target.checked)}
                          />
                        }
                        label={perm.name}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionsDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleSavePermissions} 
            variant="contained" 
            disabled={permissionsLoading}
            startIcon={<PermissionsIcon />}
          >
            권한 저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  SupervisorAccount as SupervisorIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  WorkOutline as PositionIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Department, DepartmentEmployees, User, OrganizationChart, Position } from '../types';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';

const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentEmployees | null>(null);
  const [organizationChart, setOrganizationChart] = useState<OrganizationChart | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPositionEditMode, setIsPositionEditMode] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [positionDeleteConfirmOpen, setPositionDeleteConfirmOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    description: '',
    managerId: '',
  });
  const [newPosition, setNewPosition] = useState({
    title: '',
    description: '',
    department: '',
    level: 1,
  });

  const { showNotification } = useNotification();

  const loadDepartments = useCallback(async () => {
    try {
      const response = await apiService.getDepartments();
      setDepartments(response.data || response);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load departments');
    }
  }, [showNotification]);

  const loadUsers = useCallback(async () => {
    try {
      const response = await apiService.getUsers();
      setUsers(response.data || response);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      const response = await apiService.getPositions();
      setPositions(response.data || response);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load positions');
    }
  }, [showNotification]);

  const loadOrganizationChart = useCallback(async () => {
    try {
      const response = await apiService.getOrganizationChart();
      setOrganizationChart(response.data || response);
    } catch (error) {
      console.error('Failed to load organization chart:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadDepartments(), loadUsers(), loadOrganizationChart(), loadPositions()]);
      setLoading(false);
    };
    loadData();
  }, [loadDepartments, loadUsers, loadOrganizationChart, loadPositions]);

  const handleViewDepartment = async (departmentName: string) => {
    try {
      const response = await apiService.getDepartmentEmployees(departmentName);
      setSelectedDepartment(response.data || response);
      setIsEmployeeDialogOpen(true);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load department employees');
    }
  };

  const handleCreateDepartment = async () => {
    try {
      if (isEditMode && editingDepartment) {
        await apiService.updateDepartment(editingDepartment._id, newDepartment);
        showNotification('success', 'Success', 'Department updated successfully');
      } else {
        await apiService.createDepartment(newDepartment);
        showNotification('success', 'Success', 'Department created successfully');
      }
      setIsDeptDialogOpen(false);
      setIsEditMode(false);
      setEditingDepartment(null);
      setNewDepartment({ name: '', description: '', managerId: '' });
      loadDepartments();
    } catch (error) {
      showNotification('error', 'Error', `Failed to ${isEditMode ? 'update' : 'create'} department`);
    }
  };

  const handleEditDepartment = (dept: Department) => {
    setEditingDepartment(dept);
    setNewDepartment({
      name: dept.name,
      description: dept.description || '',
      managerId: dept.managerId || '',
    });
    setIsEditMode(true);
    setIsDeptDialogOpen(true);
  };

  const handleDeleteDepartment = (dept: Department) => {
    setDepartmentToDelete(dept);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteDepartment = async () => {
    if (!departmentToDelete) return;
    
    try {
      await apiService.deleteDepartment(departmentToDelete._id);
      showNotification('success', 'Success', 'Department deleted successfully');
      loadDepartments();
      setDeleteConfirmOpen(false);
      setDepartmentToDelete(null);
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData?.employees && errorData.employees.length > 0) {
        const employeeList = errorData.employees.map((emp: any) => `• ${emp.name} (${emp.position})`).join('\n');
        showNotification('error', 'Cannot Delete Department', 
          `${errorData.error}\n\nEmployees in this department:\n${employeeList}\n\n${errorData.details}`);
      } else {
        showNotification('error', 'Error', errorData?.error || 'Failed to delete department');
      }
      setDeleteConfirmOpen(false);
      setDepartmentToDelete(null);
    }
  };

  // Position management functions
  const handleCreatePosition = async () => {
    // Client-side validation
    if (!newPosition.title.trim()) {
      showNotification('error', 'Validation Error', 'Position title is required');
      return;
    }

    try {
      if (isPositionEditMode && editingPosition) {
        await apiService.updatePosition(editingPosition._id, newPosition);
        showNotification('success', 'Success', 'Position updated successfully');
      } else {
        await apiService.createPosition(newPosition);
        showNotification('success', 'Success', 'Position created successfully');
      }
      setIsPositionDialogOpen(false);
      setIsPositionEditMode(false);
      setEditingPosition(null);
      setNewPosition({ title: '', description: '', department: '', level: 1 });
      loadPositions();
    } catch (error: any) {
      showNotification('error', 'Error', error.response?.data?.error || `Failed to ${isPositionEditMode ? 'update' : 'create'} position`);
    }
  };

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position);
    setNewPosition({
      title: position.title,
      description: position.description || '',
      department: position.department || '',
      level: position.level || 1,
    });
    setIsPositionEditMode(true);
    setIsPositionDialogOpen(true);
  };

  const handleDeletePosition = (position: Position) => {
    setPositionToDelete(position);
    setPositionDeleteConfirmOpen(true);
  };

  const confirmDeletePosition = async () => {
    if (!positionToDelete) return;
    
    try {
      await apiService.deletePosition(positionToDelete._id);
      showNotification('success', 'Success', 'Position deleted successfully');
      loadPositions();
      setPositionDeleteConfirmOpen(false);
      setPositionToDelete(null);
    } catch (error: any) {
      const errorData = error.response?.data;
      showNotification('error', 'Error', errorData?.error || 'Failed to delete position');
      setPositionDeleteConfirmOpen(false);
      setPositionToDelete(null);
    }
  };

  const renderUserTree = (user: User, level: number = 0) => {
    return (
      <Box key={`${user._id}-${level}`} sx={{ ml: level * 3 }}>
        <Card sx={{ mb: 1, backgroundColor: level === 0 ? '#f5f5f5' : 'white' }}>
          <CardContent sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color={user.role === 'admin' ? 'error' : user.role === 'manager' ? 'warning' : 'primary'} />
              <Typography variant="subtitle2">{user.name}</Typography>
              <Chip label={user.role} size="small" color={user.role === 'admin' ? 'error' : user.role === 'manager' ? 'warning' : 'primary'} />
              <Typography variant="body2" color="text.secondary">
                {user.department} - {user.position}
              </Typography>
            </Box>
          </CardContent>
        </Card>
        {user.subordinates && user.subordinates.length > 0 && (
          <Box sx={{ ml: 2 }}>
            {user.subordinates.map((subordinate, index) => renderUserTree(subordinate, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Department & Position Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeTab === 0 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsDeptDialogOpen(true)}
            >
              Add Department
            </Button>
          )}
          {activeTab === 1 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsPositionDialogOpen(true)}
            >
              Add Position
            </Button>
          )}
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<BusinessIcon />} 
            label="Departments" 
            iconPosition="start"
            sx={{ minHeight: 60 }}
          />
          <Tab 
            icon={<PositionIcon />} 
            label="Positions" 
            iconPosition="start"
            sx={{ minHeight: 60 }}
          />
        </Tabs>
      </Card>

      {activeTab === 0 && (
        <Grid container spacing={3}>
        {/* Departments Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <BusinessIcon color="primary" />
                <Typography variant="h6">Departments</Typography>
              </Box>
              {departments.length === 0 ? (
                <Alert severity="info">No departments found</Alert>
              ) : (
                <List>
                  {departments.map((dept, index) => (
                    <React.Fragment key={dept._id || `dept-${index}`}>
                      <ListItem
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              startIcon={<ViewIcon />}
                              onClick={() => handleViewDepartment(dept.name)}
                            >
                              View
                            </Button>
                            <Button
                              size="small"
                              color="primary"
                              onClick={() => handleEditDepartment(dept)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleDeleteDepartment(dept)}
                            >
                              Delete
                            </Button>
                          </Box>
                        }
                      >
                        <ListItemIcon>
                          <PeopleIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={dept.name}
                          secondary={
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                              <Chip
                                label={`${dept.employeeCount} employees`}
                                size="small"
                                color="primary"
                              />
                              <Chip
                                label={`${dept.managers.length} managers`}
                                size="small"
                                color="secondary"
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < departments.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Organization Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SupervisorIcon color="primary" />
                <Typography variant="h6">Organization Summary</Typography>
              </Box>
              {organizationChart && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="h4" color="primary">
                        {organizationChart.summary.totalEmployees}
                      </Typography>
                      <Typography variant="body2">Total Employees</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="h4" color="primary">
                        {organizationChart.summary.totalDepartments}
                      </Typography>
                      <Typography variant="body2">Departments</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="h4" color="warning.main">
                        {organizationChart.summary.managersCount}
                      </Typography>
                      <Typography variant="body2">Managers</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="h4" color="error.main">
                        {organizationChart.summary.adminCount}
                      </Typography>
                      <Typography variant="body2">Administrators</Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Organization Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Organization Chart</Typography>
              {organizationChart && organizationChart.organizationTree.length > 0 ? (
                <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
                  {organizationChart.organizationTree.map((user) => renderUserTree(user))}
                </Box>
              ) : (
                <Alert severity="info">No organization structure found</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          {/* Positions Overview */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PositionIcon color="primary" />
                  <Typography variant="h6">Positions</Typography>
                </Box>
                {positions.length === 0 ? (
                  <Alert severity="info">No positions found</Alert>
                ) : (
                  <List>
                    {positions.map((position, index) => (
                      <React.Fragment key={position._id || `position-${index}`}>
                        <ListItem
                          secondaryAction={
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Edit Position">
                                <IconButton onClick={() => handleEditPosition(position)}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Position">
                                <IconButton onClick={() => handleDeletePosition(position)} color="error">
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          }
                        >
                          <ListItemIcon>
                            <PositionIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary={position.title}
                            secondary={
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                                {position.department && (
                                  <Chip
                                    label={position.department}
                                    size="small"
                                    color="primary"
                                  />
                                )}
                                <Chip
                                  label={`Level ${position.level}`}
                                  size="small"
                                  color="secondary"
                                />
                                <Chip
                                  label={`${position.employeeCount} employees`}
                                  size="small"
                                  color="default"
                                />
                                {position.description && (
                                  <Typography variant="body2" color="text.secondary">
                                    {position.description}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < positions.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Add Department Dialog */}
      <Dialog open={isDeptDialogOpen} onClose={() => {
        setIsDeptDialogOpen(false);
        setIsEditMode(false);
        setEditingDepartment(null);
        setNewDepartment({ name: '', description: '', managerId: '' });
      }} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditMode ? 'Edit Department' : 'Add New Department'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Department Name"
                value={newDepartment.name}
                onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={newDepartment.description}
                onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Manager</InputLabel>
                <Select
                  value={newDepartment.managerId}
                  label="Manager"
                  onChange={(e) => setNewDepartment({ ...newDepartment, managerId: e.target.value })}
                >
                  <MenuItem value="">No Manager</MenuItem>
                  {users.filter(u => u.role === 'manager' || u.role === 'admin').map((user) => (
                    <MenuItem key={user._id} value={user._id}>
                      {user.name} ({user.department})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeptDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateDepartment} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Department Employees Dialog */}
      <Dialog open={isEmployeeDialogOpen} onClose={() => setIsEmployeeDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedDepartment?.department} - Employees
        </DialogTitle>
        <DialogContent>
          {selectedDepartment && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={3}>
                  <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="h6" color="primary">
                      {selectedDepartment.summary.totalEmployees}
                    </Typography>
                    <Typography variant="body2">Total</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="h6" color="warning.main">
                      {selectedDepartment.summary.managers}
                    </Typography>
                    <Typography variant="body2">Managers</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="h6" color="success.main">
                      {selectedDepartment.summary.regular}
                    </Typography>
                    <Typography variant="body2">Regular</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="h6" color="info.main">
                      {selectedDepartment.summary.contract}
                    </Typography>
                    <Typography variant="body2">Contract</Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <List>
                {selectedDepartment.employees.map((employee, index) => (
                  <React.Fragment key={employee._id || `employee-${index}`}>
                    <ListItem>
                      <ListItemIcon>
                        <PersonIcon color={employee.role === 'manager' ? 'warning' : 'primary'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={employee.name}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                            <Chip label={employee.position} size="small" />
                            <Chip 
                              label={employee.role} 
                              size="small" 
                              color={employee.role === 'manager' ? 'warning' : 'primary'} 
                            />
                            <Chip 
                              label={employee.contractType} 
                              size="small" 
                              color={employee.contractType === 'regular' ? 'success' : 'info'} 
                            />
                            <Typography variant="body2" color="text.secondary">
                              {employee.yearsOfService} years
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < selectedDepartment.employees.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEmployeeDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete department "{departmentToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. Make sure all employees are reassigned to other departments first.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteDepartment} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Position Dialog */}
      <Dialog open={isPositionDialogOpen} onClose={() => {
        setIsPositionDialogOpen(false);
        setIsPositionEditMode(false);
        setEditingPosition(null);
        setNewPosition({ title: '', description: '', department: '', level: 1 });
      }} maxWidth="sm" fullWidth>
        <DialogTitle>{isPositionEditMode ? 'Edit Position' : 'Add New Position'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Position Name"
                value={newPosition.title}
                onChange={(e) => setNewPosition({ ...newPosition, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={newPosition.description}
                onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={newPosition.department}
                  label="Department"
                  onChange={(e) => setNewPosition({ ...newPosition, department: e.target.value })}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept._id} value={dept.name}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Level (직급 레벨)"
                type="number"
                value={newPosition.level}
                onChange={(e) => setNewPosition({ ...newPosition, level: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1, max: 10 }}
                helperText="1: 신입, 2: 주니어, 3: 시니어, 4: 팀장, 5: 부장"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPositionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreatePosition} variant="contained">
            {isPositionEditMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Position Delete Confirmation Dialog */}
      <Dialog open={positionDeleteConfirmOpen} onClose={() => setPositionDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete position "{positionToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. Make sure all employees with this position are reassigned first.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPositionDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeletePosition} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DepartmentManagement;
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Grid,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Add as AddIcon,
  WorkOutline as PositionIcon,
} from '@mui/icons-material';
import { Department, DepartmentEmployees, User, OrganizationChart, Position } from '../types';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';
import { NewDepartmentData, NewPositionData } from '../types/DepartmentManagementTypes';

// Import extracted components
import DepartmentList from './department/DepartmentList';
import PositionList from './department/PositionList';
import OrganizationChart from './department/OrganizationChart';
import OrganizationSummary from './department/OrganizationSummary';
import DepartmentDialog from './department/DepartmentDialog';
import PositionDialog from './department/PositionDialog';
import DepartmentEmployeesDialog from './department/DepartmentEmployeesDialog';
import DeleteConfirmDialog from './department/DeleteConfirmDialog';

const DepartmentManagementRefactored: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentEmployees | null>(null);
  const [organizationChart, setOrganizationChart] = useState<OrganizationChart | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  
  // Dialog states
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPositionEditMode, setIsPositionEditMode] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  
  // Delete confirmation states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [positionDeleteConfirmOpen, setPositionDeleteConfirmOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);
  
  // Form data states
  const [newDepartment, setNewDepartment] = useState<NewDepartmentData>({
    name: '',
    description: '',
    supervisorId: '',
  });
  const [newPosition, setNewPosition] = useState<NewPositionData>({
    title: '',
    description: '',
    department: '',
  });

  const { showNotification } = useNotification();

  // Data loading functions
  const loadDepartments = useCallback(async () => {
    try {
      const response = await apiService.getDepartments();
      setDepartments(response.success ? response.data : []);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load departments');
    }
  }, [showNotification]);

  const loadUsers = useCallback(async () => {
    try {
      const response = await apiService.getUsers();
      setUsers(response.success ? response.data : []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      const response = await apiService.getPositions();
      setPositions(response.success ? response.data : []);
    } catch (error) {
      console.error('Error loading positions:', error);
      showNotification('error', 'Error', 'Failed to load positions');
    }
  }, [showNotification]);

  const loadOrganizationChart = useCallback(async () => {
    try {
      const response = await apiService.getOrganizationChart();
      setOrganizationChart(response.success ? response.data : null);
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

  // Department handlers
  const handleViewDepartment = async (departmentName: string) => {
    try {
      const response = await apiService.getDepartmentEmployees(departmentName);
      setSelectedDepartment(response.success ? response.data : null);
      setIsEmployeeDialogOpen(true);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load department employees');
    }
  };

  const handleCreateDepartment = async (data: NewDepartmentData) => {
    try {
      if (isEditMode && editingDepartment) {
        await apiService.updateDepartment(editingDepartment._id, data);
        showNotification('success', 'Success', 'Department updated successfully');
      } else {
        await apiService.createDepartment(data);
        showNotification('success', 'Success', 'Department created successfully');
      }
      closeDepartmentDialog();
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
      supervisorId: dept.supervisorId || '',
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

  // Position handlers
  const handleCreatePosition = async (data: NewPositionData) => {
    if (!data.title.trim()) {
      showNotification('error', 'Validation Error', 'Position title is required');
      return;
    }

    try {
      if (isPositionEditMode && editingPosition) {
        await apiService.updatePosition(editingPosition._id, data);
        showNotification('success', 'Success', 'Position updated successfully');
      } else {
        await apiService.createPosition(data);
        showNotification('success', 'Success', 'Position created successfully');
      }
      closePositionDialog();
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

  // Dialog close handlers
  const closeDepartmentDialog = () => {
    setIsDeptDialogOpen(false);
    setIsEditMode(false);
    setEditingDepartment(null);
    setNewDepartment({ name: '', description: '', supervisorId: '' });
  };

  const closePositionDialog = () => {
    setIsPositionDialogOpen(false);
    setIsPositionEditMode(false);
    setEditingPosition(null);
    setNewPosition({ title: '', description: '', department: '' });
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
        <Box sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <DepartmentList
                departments={departments}
                onView={handleViewDepartment}
                onEdit={handleEditDepartment}
                onDelete={handleDeleteDepartment}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <OrganizationSummary organizationChart={organizationChart} />
            </Grid>
            <Grid size={12}>
              <OrganizationChart organizationChart={organizationChart} />
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <PositionList
                positions={positions}
                onEdit={handleEditPosition}
                onDelete={handleDeletePosition}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Dialogs */}
      <DepartmentDialog
        open={isDeptDialogOpen}
        isEditMode={isEditMode}
        editingDepartment={editingDepartment}
        newDepartment={newDepartment}
        users={users}
        onClose={closeDepartmentDialog}
        onSave={handleCreateDepartment}
        onDepartmentChange={setNewDepartment}
      />

      <PositionDialog
        open={isPositionDialogOpen}
        isEditMode={isPositionEditMode}
        editingPosition={editingPosition}
        newPosition={newPosition}
        departments={departments}
        onClose={closePositionDialog}
        onSave={handleCreatePosition}
        onPositionChange={setNewPosition}
      />

      <DepartmentEmployeesDialog
        open={isEmployeeDialogOpen}
        selectedDepartment={selectedDepartment}
        onClose={() => setIsEmployeeDialogOpen(false)}
      />

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        title="Confirm Delete"
        message={`Are you sure you want to delete department "${departmentToDelete?.name}"?`}
        subMessage="This action cannot be undone. Make sure all employees are reassigned to other departments first."
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteDepartment}
      />

      <DeleteConfirmDialog
        open={positionDeleteConfirmOpen}
        title="Confirm Delete"
        message={`Are you sure you want to delete position "${positionToDelete?.title}"?`}
        subMessage="This action cannot be undone. Make sure all employees with this position are reassigned first."
        onClose={() => setPositionDeleteConfirmOpen(false)}
        onConfirm={confirmDeletePosition}
      />
    </Box>
  );
};

export default DepartmentManagementRefactored;
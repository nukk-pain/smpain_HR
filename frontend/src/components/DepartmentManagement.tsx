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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Users,
  User as UserIcon,
  UserCheck,
  Plus,
  Eye,
  Briefcase,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
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
      showNotification('error', 'Error', 'Failed to load positions');
    }
  }, [showNotification]);

  const loadOrganizationChart = useCallback(async () => {
    try {
      const response = await apiService.getOrganizationChart();
      setOrganizationChart(response.success ? response.data : {});
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
      setSelectedDepartment(response.success ? response.data : {});
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
      <div key={`${user._id}-${level}`} style={{ marginLeft: `${level * 12}px` }}>
        <Card className={`mb-2 ${level === 0 ? 'bg-gray-50' : 'bg-white'}`}>
          <CardContent className="py-2">
            <div className="flex items-center gap-2">
              <UserIcon className={`h-4 w-4 ${
                user.role === 'admin' ? 'text-red-500' : 
                user.role === 'manager' ? 'text-yellow-500' : 
                'text-blue-500'
              }`} />
              <span className="font-medium text-sm">{user.name}</span>
              <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'manager' ? 'secondary' : 'default'}>
                {user.role}
              </Badge>
              <span className="text-sm text-gray-600">
                {user.department} - {user.position}
              </span>
            </div>
          </CardContent>
        </Card>
        {user.subordinates && user.subordinates.length > 0 && (
          <div className="ml-4">
            {user.subordinates.map((subordinate, index) => renderUserTree(subordinate, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Department & Position Management</h1>
        <div className="flex gap-2">
          {activeTab === 0 && (
            <Button onClick={() => setIsDeptDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          )}
          {activeTab === 1 && (
            <Button onClick={() => setIsPositionDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab === 0 ? "departments" : "positions"} onValueChange={(value) => setActiveTab(value === "departments" ? 0 : 1)} className="w-full">
        <Card className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="departments" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="positions" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Positions
            </TabsTrigger>
          </TabsList>
        </Card>

        <TabsContent value="departments">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Departments Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Departments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {departments.length === 0 ? (
                  <Alert>
                    <AlertDescription>No departments found</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {departments.map((dept, index) => (
                      <div key={dept._id || `dept-${index}`} className="border-b last:border-b-0 pb-4 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-blue-500" />
                            <div>
                              <h3 className="font-semibold">{dept.name}</h3>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline">
                                  {dept.employeeCount} employees
                                </Badge>
                                <Badge variant="secondary">
                                  {dept.managers.length} managers
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDepartment(dept.name)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditDepartment(dept)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteDepartment(dept)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Organization Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Organization Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {organizationChart && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {organizationChart.summary.totalEmployees}
                      </div>
                      <div className="text-sm text-gray-600">Total Employees</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {organizationChart.summary.totalDepartments}
                      </div>
                      <div className="text-sm text-gray-600">Departments</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {organizationChart.summary.managersCount}
                      </div>
                      <div className="text-sm text-gray-600">Managers</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {organizationChart.summary.adminCount}
                      </div>
                      <div className="text-sm text-gray-600">Administrators</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Organization Chart */}
            <div className="col-span-full">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  {organizationChart && organizationChart.organizationTree.length > 0 ? (
                    <div className="max-h-96 overflow-auto">
                      {organizationChart.organizationTree.map((user) => renderUserTree(user))}
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>No organization structure found</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="positions">
          <div className="grid grid-cols-1 gap-6">
            {/* Positions Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {positions.length === 0 ? (
                  <Alert>
                    <AlertDescription>No positions found</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {positions.map((position, index) => (
                      <div key={position._id || `position-${index}`} className="border-b last:border-b-0 pb-4 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <Briefcase className="h-5 w-5 text-blue-500" />
                            <div>
                              <h3 className="font-semibold">{position.title}</h3>
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {position.department && (
                                  <Badge variant="outline">
                                    {position.department}
                                  </Badge>
                                )}
                                <Badge variant="secondary">
                                  Level {position.level}
                                </Badge>
                                <Badge variant="default">
                                  {position.employeeCount} employees
                                </Badge>
                              </div>
                              {position.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {position.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditPosition(position)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Position</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeletePosition(position)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Position</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Department Dialog */}
      <Dialog open={isDeptDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDeptDialogOpen(false);
          setIsEditMode(false);
          setEditingDepartment(null);
          setNewDepartment({ name: '', description: '', managerId: '' });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Department' : 'Add New Department'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update department information' : 'Create a new department'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Department Name</Label>
              <Input
                id="dept-name"
                value={newDepartment.name}
                onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                placeholder="Enter department name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-description">Description</Label>
              <Input
                id="dept-description"
                value={newDepartment.description}
                onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-manager">Manager</Label>
              <Select value={newDepartment.managerId} onValueChange={(value) => setNewDepartment({ ...newDepartment, managerId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Manager</SelectItem>
                  {users.filter(u => u.role === 'manager' || u.role === 'admin').map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name} ({user.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeptDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDepartment}>
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Employees Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDepartment?.department} - Employees
            </DialogTitle>
          </DialogHeader>
          {selectedDepartment && (
            <div>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">
                    {selectedDepartment.summary.totalEmployees}
                  </div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-yellow-600">
                    {selectedDepartment.summary.managers}
                  </div>
                  <div className="text-sm text-gray-600">Managers</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-green-600">
                    {selectedDepartment.summary.regular}
                  </div>
                  <div className="text-sm text-gray-600">Regular</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-cyan-600">
                    {selectedDepartment.summary.contract}
                  </div>
                  <div className="text-sm text-gray-600">Contract</div>
                </div>
              </div>
              
              <div className="space-y-4">
                {selectedDepartment.employees.map((employee, index) => (
                  <div key={employee._id || `employee-${index}`} className="border-b last:border-b-0 pb-4 last:pb-0">
                    <div className="flex items-center gap-3">
                      <UserIcon className={`h-5 w-5 ${employee.role === 'manager' ? 'text-yellow-500' : 'text-blue-500'}`} />
                      <div>
                        <h4 className="font-semibold">{employee.name}</h4>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge variant="outline">{employee.position}</Badge>
                          <Badge variant={employee.role === 'manager' ? 'secondary' : 'default'}>
                            {employee.role}
                          </Badge>
                          <Badge variant={employee.contractType === 'regular' ? 'default' : 'secondary'}>
                            {employee.contractType}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {employee.yearsOfService} years
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsEmployeeDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete department "{departmentToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-600 mt-2">
            This action cannot be undone. Make sure all employees are reassigned to other departments first.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteDepartment}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Position Dialog */}
      <Dialog open={isPositionDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPositionDialogOpen(false);
          setIsPositionEditMode(false);
          setEditingPosition(null);
          setNewPosition({ title: '', description: '', department: '', level: 1 });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isPositionEditMode ? 'Edit Position' : 'Add New Position'}</DialogTitle>
            <DialogDescription>
              {isPositionEditMode ? 'Update position information' : 'Create a new position'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="position-name">Position Name</Label>
              <Input
                id="position-name"
                value={newPosition.title}
                onChange={(e) => setNewPosition({ ...newPosition, title: e.target.value })}
                placeholder="Enter position name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position-description">Description</Label>
              <Input
                id="position-description"
                value={newPosition.description}
                onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position-department">Department</Label>
                <Select value={newPosition.department} onValueChange={(value) => setNewPosition({ ...newPosition, department: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept._id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position-level">Level</Label>
                <Input
                  id="position-level"
                  type="number"
                  value={newPosition.level}
                  onChange={(e) => setNewPosition({ ...newPosition, level: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={10}
                  placeholder="1-10"
                />
              </div>
            </div>
            <p className="text-xs text-gray-600">
              1: Entry Level, 2: Junior, 3: Senior, 4: Team Lead, 5: Manager
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPositionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePosition}>
              {isPositionEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Position Delete Confirmation Dialog */}
      <Dialog open={positionDeleteConfirmOpen} onOpenChange={setPositionDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete position "{positionToDelete?.title}"?
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-600 mt-2">
            This action cannot be undone. Make sure all employees with this position are reassigned first.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPositionDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeletePosition}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentManagement;
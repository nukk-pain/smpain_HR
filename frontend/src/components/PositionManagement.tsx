import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Briefcase,
  Plus,
  Edit as EditIcon,
  Trash2,
  Loader2,
} from 'lucide-react';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';

interface Position {
  _id: string;
  title: string;
  description: string;
  level: number;
  department?: string;
  responsibilities: string[];
  requirements: string[];
  createdAt: string;
  updatedAt?: string;
}

const PositionManagement: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [newPosition, setNewPosition] = useState({
    title: '',
    description: '',
    level: 1,
    department: '',
    responsibilities: '',
    requirements: '',
  });

  const { showNotification } = useNotification();

  const loadPositions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getPositions();
      setPositions(response.success ? response.data : []);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  const handleCreatePosition = async () => {
    // Client-side validation
    if (!newPosition.title.trim()) {
      showNotification('error', 'Validation Error', 'Position title is required');
      return;
    }

    try {
      const positionData = {
        ...newPosition,
        responsibilities: newPosition.responsibilities.split('\n').filter(r => r.trim()),
        requirements: newPosition.requirements.split('\n').filter(r => r.trim()),
      };

      if (isEditMode && editingPosition) {
        await apiService.updatePosition(editingPosition._id, positionData);
        showNotification('success', 'Success', 'Position updated successfully');
      } else {
        await apiService.createPosition(positionData);
        showNotification('success', 'Success', 'Position created successfully');
      }
      
      handleCloseDialog();
      loadPositions();
    } catch (error: any) {
      showNotification('error', 'Error', error.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} position`);
    }
  };

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position);
    setNewPosition({
      title: position.title,
      description: position.description,
      level: position.level,
      department: position.department || '',
      responsibilities: position.responsibilities.join('\n'),
      requirements: position.requirements.join('\n'),
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleDeletePosition = async (position: Position) => {
    if (window.confirm(`Are you sure you want to delete position "${position.title}"? This action cannot be undone.`)) {
      try {
        await apiService.deletePosition(position._id);
        showNotification('success', 'Success', 'Position deleted successfully');
        loadPositions();
      } catch (error: any) {
        showNotification('error', 'Error', error.response?.data?.error || 'Failed to delete position');
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setEditingPosition(null);
    setNewPosition({
      title: '',
      description: '',
      level: 1,
      department: '',
      responsibilities: '',
      requirements: '',
    });
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
        <h1 className="text-2xl font-bold">Position Management</h1>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Position
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Available Positions</h2>
            <Badge className="ml-2" variant="secondary">
              {positions.length} positions
            </Badge>
          </div>
          
          {positions.length === 0 ? (
            <Alert>
              <AlertDescription>
                No positions found. Click "Add Position" to create the first position.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {positions.map((position, index) => (
                <React.Fragment key={position._id}>
                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3 flex-1">
                      <Briefcase className="h-5 w-5 text-gray-500 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{position.title}</h3>
                          <Badge variant="secondary">Level {position.level}</Badge>
                          {position.department && (
                            <Badge variant="outline">{position.department}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {position.description}
                        </p>
                        {position.responsibilities.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            <strong>Key Responsibilities:</strong> {position.responsibilities.slice(0, 2).join(', ')}
                            {position.responsibilities.length > 2 && '...'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPosition(position)}
                        className="flex items-center gap-1"
                      >
                        <EditIcon className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePosition(position)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  {index < positions.length - 1 && <div className="border-b my-4" />}
                </React.Fragment>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Position Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Position' : 'Add New Position'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Position Title *</Label>
              <Input
                id="title"
                value={newPosition.title}
                onChange={(e) => setNewPosition({ ...newPosition, title: e.target.value })}
                placeholder="e.g., Senior Software Engineer"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="level">Level *</Label>
              <Input
                id="level"
                type="number"
                value={newPosition.level}
                onChange={(e) => setNewPosition({ ...newPosition, level: parseInt(e.target.value) || 1 })}
                min="1"
                max="10"
                required
              />
            </div>
            
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="department">Department (Optional)</Label>
              <Input
                id="department"
                value={newPosition.department}
                onChange={(e) => setNewPosition({ ...newPosition, department: e.target.value })}
                placeholder="e.g., Engineering, Marketing"
              />
            </div>
            
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={newPosition.description}
                onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                placeholder="Brief description of the position..."
                rows={3}
                required
              />
            </div>
            
            <div className="space-y-2 sm:col-span-3 lg:col-span-1">
              <Label htmlFor="responsibilities">Key Responsibilities (one per line)</Label>
              <Textarea
                id="responsibilities"
                value={newPosition.responsibilities}
                onChange={(e) => setNewPosition({ ...newPosition, responsibilities: e.target.value })}
                placeholder="Manage team members
Oversee project deliverables
Report to upper management"
                rows={4}
              />
            </div>
            
            <div className="space-y-2 sm:col-span-3 lg:col-span-2">
              <Label htmlFor="requirements">Requirements (one per line)</Label>
              <Textarea
                id="requirements"
                value={newPosition.requirements}
                onChange={(e) => setNewPosition({ ...newPosition, requirements: e.target.value })}
                placeholder="Bachelor's degree required
3+ years experience
Strong communication skills"
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePosition}
              disabled={!newPosition.title || !newPosition.description}
            >
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PositionManagement;
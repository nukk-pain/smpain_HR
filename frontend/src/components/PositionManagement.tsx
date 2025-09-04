import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
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
  CircularProgress,
  Alert,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Work as WorkIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';
import { Position } from '../types';

const PositionManagement: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [newPosition, setNewPosition] = useState({
    title: '',
    description: '',
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
        responsibilities: newPosition.responsibilities ? newPosition.responsibilities.split('\n').filter(r => r.trim()) : [],
        requirements: newPosition.requirements ? newPosition.requirements.split('\n').filter(r => r.trim()) : [],
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
      department: position.department || '',
      responsibilities: position.responsibilities ? position.responsibilities.join('\n') : '',
      requirements: position.requirements ? position.requirements.join('\n') : '',
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
      department: '',
      responsibilities: '',
      requirements: '',
    });
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
        <Typography variant="h4">Position Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsDialogOpen(true)}
        >
          Add Position
        </Button>
      </Box>
      <Grid container spacing={3}>
        <Grid size={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WorkIcon color="primary" />
                <Typography variant="h6">Available Positions</Typography>
                <Chip label={`${positions.length} positions`} size="small" color="primary" />
              </Box>
              
              {positions.length === 0 ? (
                <Alert severity="info">
                  No positions found. Click "Add Position" to create the first position.
                </Alert>
              ) : (
                <List>
                  {positions.map((position, index) => (
                    <React.Fragment key={position._id}>
                      <ListItem
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              color="primary"
                              startIcon={<EditIcon />}
                              onClick={() => handleEditPosition(position)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDeletePosition(position)}
                            >
                              Delete
                            </Button>
                          </Box>
                        }
                      >
                        <ListItemIcon>
                          <WorkIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {position.title}
                              </Typography>
                              {position.department && (
                                <Chip label={position.department} size="small" variant="outlined" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                {position.description}
                              </Typography>
                              {position.responsibilities && position.responsibilities.length > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                  <strong>Key Responsibilities:</strong> {position.responsibilities.slice(0, 2).join(', ')}
                                  {position.responsibilities.length > 2 && '...'}
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
      {/* Add/Edit Position Dialog */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{isEditMode ? 'Edit Position' : 'Add New Position'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Position Title"
                value={newPosition.title}
                onChange={(e) => setNewPosition({ ...newPosition, title: e.target.value })}
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Department (Optional)"
                value={newPosition.department}
                onChange={(e) => setNewPosition({ ...newPosition, department: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newPosition.description}
                onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                required
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                fullWidth
                label="Key Responsibilities (one per line)"
                multiline
                rows={4}
                value={newPosition.responsibilities}
                onChange={(e) => setNewPosition({ ...newPosition, responsibilities: e.target.value })}
                placeholder="Manage team members&#10;Oversee project deliverables&#10;Report to upper management"
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                fullWidth
                label="Requirements (one per line)"
                multiline
                rows={4}
                value={newPosition.requirements}
                onChange={(e) => setNewPosition({ ...newPosition, requirements: e.target.value })}
                placeholder="Bachelor's degree required&#10;3+ years experience&#10;Strong communication skills"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleCreatePosition} 
            variant="contained"
            disabled={!newPosition.title || !newPosition.description}
          >
            {isEditMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PositionManagement;
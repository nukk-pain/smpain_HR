import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
} from '@mui/material';
import { PositionDialogProps } from '../../types/DepartmentManagementTypes';

const PositionDialog: React.FC<PositionDialogProps> = ({
  open,
  isEditMode,
  newPosition,
  departments,
  onClose,
  onSave,
  onPositionChange,
}) => {
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditMode ? 'Edit Position' : 'Add New Position'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Position Name"
              value={newPosition.title}
              onChange={(e) => onPositionChange({ ...newPosition, title: e.target.value })}
              required
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Description"
              value={newPosition.description}
              onChange={(e) => onPositionChange({ ...newPosition, description: e.target.value })}
              multiline
              rows={3}
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={newPosition.department}
                label="Department"
                onChange={(e) => onPositionChange({ ...newPosition, department: e.target.value })}
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
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={() => onSave(newPosition)} variant="contained">
          {isEditMode ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PositionDialog;
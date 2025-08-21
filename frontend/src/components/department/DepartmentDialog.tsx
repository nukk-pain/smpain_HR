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
import { DepartmentDialogProps } from '../../types/DepartmentManagementTypes';
import { isSupervisorRole } from '../../utils/roleUtils';

const DepartmentDialog: React.FC<DepartmentDialogProps> = ({
  open,
  isEditMode,
  newDepartment,
  users,
  onClose,
  onSave,
  onDepartmentChange,
}) => {
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditMode ? 'Edit Department' : 'Add New Department'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Department Name"
              value={newDepartment.name}
              onChange={(e) => onDepartmentChange({ ...newDepartment, name: e.target.value })}
              required
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Description"
              value={newDepartment.description}
              onChange={(e) => onDepartmentChange({ ...newDepartment, description: e.target.value })}
              multiline
              rows={3}
            />
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth>
              <InputLabel>Supervisor</InputLabel>
              <Select
                value={newDepartment.supervisorId}
                label="Supervisor"
                onChange={(e) => onDepartmentChange({ ...newDepartment, supervisorId: e.target.value })}
              >
                <MenuItem value="">No Supervisor</MenuItem>
                {users.filter(u => isSupervisorRole(u.role)).map((user) => (
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
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={() => onSave(newDepartment)} variant="contained">
          {isEditMode ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DepartmentDialog;
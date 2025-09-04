import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Button,
  Grid,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { DepartmentEmployees } from '../../types';
import { getRoleColor } from '../../utils/roleUtils';

interface DepartmentEmployeesDialogProps {
  open: boolean;
  selectedDepartment: DepartmentEmployees | null;
  onClose: () => void;
}

const DepartmentEmployeesDialog: React.FC<DepartmentEmployeesDialogProps> = ({
  open,
  selectedDepartment,
  onClose,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {selectedDepartment?.department} - Employees
      </DialogTitle>
      <DialogContent>
        {selectedDepartment && (
          <Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={3}>
                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="h6" color="primary">
                    {selectedDepartment.summary.totalEmployees}
                  </Typography>
                  <Typography variant="body2">Total</Typography>
                </Box>
              </Grid>
              <Grid size={3}>
                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="h6" color="warning.main">
                    {selectedDepartment.summary.managers}
                  </Typography>
                  <Typography variant="body2">Supervisors</Typography>
                </Box>
              </Grid>
              <Grid size={3}>
                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="h6" color="success.main">
                    {selectedDepartment.summary.regular}
                  </Typography>
                  <Typography variant="body2">Regular</Typography>
                </Box>
              </Grid>
              <Grid size={3}>
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
                      <PersonIcon color={getRoleColor(employee.role)} />
                    </ListItemIcon>
                    <ListItemText
                      primary={employee.name}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                          <Chip label={employee.position} size="small" />
                          <Chip 
                            label={employee.role} 
                            size="small" 
                            color={getRoleColor(employee.role)} 
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
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DepartmentEmployeesDialog;
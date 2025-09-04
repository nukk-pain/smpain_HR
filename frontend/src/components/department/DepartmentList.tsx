import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Button,
  Alert,
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { Department } from '../../types';

interface DepartmentListProps {
  departments: Department[];
  onView: (departmentName: string) => void;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
}

const DepartmentList: React.FC<DepartmentListProps> = ({
  departments,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
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
                <ListItem>
                  <ListItemIcon>
                    <PeopleIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Typography variant="body1">{dept.name}</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            startIcon={<ViewIcon />}
                            onClick={() => onView(dept.name)}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            color="primary"
                            onClick={() => onEdit(dept)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => onDelete(dept)}
                          >
                            Delete
                          </Button>
                        </Box>
                      </Box>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                        <Chip
                          label={`${dept.employeeCount} employees`}
                          size="small"
                          color="primary"
                        />
                        <Chip
                          label={`${dept.managers.length} supervisors`}
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
  );
};

export default DepartmentList;
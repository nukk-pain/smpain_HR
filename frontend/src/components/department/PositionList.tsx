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
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  WorkOutline as PositionIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Position } from '../../types';

interface PositionListProps {
  positions: Position[];
  onEdit: (position: Position) => void;
  onDelete: (position: Position) => void;
}

const PositionList: React.FC<PositionListProps> = ({
  positions,
  onEdit,
  onDelete,
}) => {
  return (
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
                        <IconButton onClick={() => onEdit(position)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Position">
                        <IconButton onClick={() => onDelete(position)} color="error">
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
                    secondaryTypographyProps={{
                      component: 'div'
                    }}
                  />
                </ListItem>
                {index < positions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default PositionList;
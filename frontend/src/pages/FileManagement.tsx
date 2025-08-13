import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';
import { PayrollExcelUploadWithPreview } from '../components/PayrollExcelUploadWithPreview';

const FileManagement: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          File Management
        </Typography>
        
        <Paper elevation={1} sx={{ p: 3 }}>
          <PayrollExcelUploadWithPreview />
        </Paper>
      </Box>
    </Container>
  );
};

export default FileManagement;
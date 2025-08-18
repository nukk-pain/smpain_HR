import React, { useState } from 'react';
import { Box, Typography, Container, Paper, Tabs, Tab } from '@mui/material';
import { TableChart, PictureAsPdf } from '@mui/icons-material';
import { PayrollExcelUploadWithPreview } from '../components/PayrollExcelUploadWithPreview';
import { PayslipBulkUpload } from '../components/PayslipBulkUpload';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`file-tabpanel-${index}`}
      aria-labelledby={`file-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const FileManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          File Management
        </Typography>
        
        <Paper elevation={1}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab 
              label="급여 데이터 (Excel)" 
              icon={<TableChart />} 
              iconPosition="start"
              id="file-tab-0"
              aria-controls="file-tabpanel-0"
            />
            <Tab 
              label="급여명세서 (PDF)" 
              icon={<PictureAsPdf />} 
              iconPosition="start"
              id="file-tab-1"
              aria-controls="file-tabpanel-1"
            />
          </Tabs>
          
          <Box sx={{ p: 3 }}>
            <TabPanel value={tabValue} index={0}>
              <PayrollExcelUploadWithPreview />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <PayslipBulkUpload />
            </TabPanel>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default FileManagement;
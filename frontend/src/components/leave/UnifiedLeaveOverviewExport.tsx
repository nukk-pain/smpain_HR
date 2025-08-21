import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress
} from '@mui/material';
import { 
  Download, 
  TableChart, 
  Description,
  PictureAsPdf 
} from '@mui/icons-material';
import { exportLeaveToExcel } from '@/services/leaveService';
import { useNotification } from '@/components/NotificationProvider';
import { ViewMode } from '@/types/UnifiedLeaveOverviewTypes';

interface UnifiedLeaveOverviewExportProps {
  viewMode: ViewMode;
  year: number;
  department?: string;
  onExportComplete?: () => void;
}

const UnifiedLeaveOverviewExport: React.FC<UnifiedLeaveOverviewExportProps> = ({
  viewMode,
  year,
  department,
  onExportComplete
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [exporting, setExporting] = useState(false);
  const { showSuccess, showError } = useNotification();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExportExcel = async () => {
    handleClose();
    setExporting(true);
    
    try {
      await exportLeaveToExcel(viewMode, year, department);
      showSuccess('Excel 파일이 다운로드되었습니다');
      onExportComplete?.();
    } catch (error) {
      console.error('Export error:', error);
      showError('Excel 내보내기 실패');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    handleClose();
    // CSV export logic can be implemented here
    showSuccess('CSV 내보내기 기능은 준비 중입니다');
  };

  const handleExportPDF = async () => {
    handleClose();
    // PDF export logic can be implemented here
    showSuccess('PDF 내보내기 기능은 준비 중입니다');
  };

  const getExportLabel = () => {
    switch (viewMode) {
      case 'overview':
        return '전체 현황';
      case 'team':
        return '팀 현황';
      case 'department':
        return '부서별 통계';
      default:
        return '데이터';
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={exporting ? <CircularProgress size={20} color="inherit" /> : <Download />}
        onClick={handleClick}
        disabled={exporting}
      >
        {exporting ? '내보내는 중...' : '내보내기'}
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleExportExcel}>
          <ListItemIcon>
            <TableChart fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            Excel로 내보내기 ({getExportLabel()})
          </ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleExportCSV} disabled>
          <ListItemIcon>
            <Description fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            CSV로 내보내기 (준비중)
          </ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleExportPDF} disabled>
          <ListItemIcon>
            <PictureAsPdf fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            PDF로 내보내기 (준비중)
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default UnifiedLeaveOverviewExport;
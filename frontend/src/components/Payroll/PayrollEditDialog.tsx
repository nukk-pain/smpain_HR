import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PasswordVerificationModal from '../PasswordVerificationModal';
import { payrollService } from '../../services/payrollService';

interface PayrollEditDialogProps {
  open: boolean;
  payrollData: any;
  onClose: () => void;
  onSave: (updatedData: any) => void;
}

const PayrollEditDialog: React.FC<PayrollEditDialogProps> = ({
  open,
  payrollData,
  onClose,
  onSave
}) => {
  const [editData, setEditData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordVerification, setShowPasswordVerification] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');

  useEffect(() => {
    if (payrollData) {
      setEditData({
        baseSalary: payrollData.baseSalary || 0,
        incentive: payrollData.incentive || 0,
        bonus: payrollData.bonus || 0,
        award: payrollData.award || 0,
        actualPayment: payrollData.actualPayment || 0
      });
    }
  }, [payrollData]);

  const handleFieldChange = (field: string, value: any) => {
    const numValue = parseFloat(value) || 0;
    setEditData((prev: any) => ({
      ...prev,
      [field]: numValue
    }));
  };

  const calculateTotal = () => {
    return (
      (editData.baseSalary || 0) +
      (editData.incentive || 0) +
      (editData.bonus || 0) +
      (editData.award || 0)
    );
  };

  const calculateDifference = () => {
    return (editData.actualPayment || 0) - calculateTotal();
  };

  const handleSaveClick = () => {
    setShowPasswordVerification(true);
  };

  const handlePasswordVerified = async (token: string) => {
    setVerificationToken(token);
    setShowPasswordVerification(false);
    await savePayroll(token);
  };

  const savePayroll = async (token: string) => {
    setLoading(true);
    setError('');

    try {
      const updatedPayroll = await payrollService.updatePayrollWithVerification(
        payrollData._id || payrollData.id,
        editData,
        token
      );

      onSave(updatedPayroll);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update payroll');
      
      // If verification token expired, show password modal again
      if (err.response?.data?.requiresVerification) {
        setShowPasswordVerification(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEditData({});
    setError('');
    setVerificationToken('');
    onClose();
  };

  if (!payrollData) return null;

  return (
    <>
      <Dialog
        open={open && !showPasswordVerification}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon color="primary" />
            <Typography variant="h6">Edit Payroll Record</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Employee: {payrollData.employeeName || payrollData.userName || 'N/A'} | 
              Month: {payrollData.month}/{payrollData.year}
            </Typography>

            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Base Salary"
                  type="number"
                  fullWidth
                  value={editData.baseSalary || ''}
                  onChange={(e) => handleFieldChange('baseSalary', e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: '₩'
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Incentive"
                  type="number"
                  fullWidth
                  value={editData.incentive || ''}
                  onChange={(e) => handleFieldChange('incentive', e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: '₩'
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Bonus"
                  type="number"
                  fullWidth
                  value={editData.bonus || ''}
                  onChange={(e) => handleFieldChange('bonus', e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: '₩'
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Award"
                  type="number"
                  fullWidth
                  value={editData.award || ''}
                  onChange={(e) => handleFieldChange('award', e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: '₩'
                  }}
                />
              </Grid>

              <Grid size={12}>
                <Divider />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Total Input"
                  type="number"
                  fullWidth
                  value={calculateTotal()}
                  disabled
                  InputProps={{
                    startAdornment: '₩',
                    sx: { fontWeight: 'bold' }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Actual Payment"
                  type="number"
                  fullWidth
                  value={editData.actualPayment || ''}
                  onChange={(e) => handleFieldChange('actualPayment', e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: '₩'
                  }}
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  label="Difference"
                  type="number"
                  fullWidth
                  value={calculateDifference()}
                  disabled
                  InputProps={{
                    startAdornment: '₩',
                    sx: {
                      color: calculateDifference() < 0 ? 'error.main' : 'success.main',
                      fontWeight: 'bold'
                    }
                  }}
                  error={calculateDifference() < 0}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            startIcon={<CancelIcon />}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveClick}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <PasswordVerificationModal
        open={showPasswordVerification}
        onVerify={handlePasswordVerified}
        onCancel={() => setShowPasswordVerification(false)}
        title="Verify Identity to Edit Payroll"
        message="Editing payroll records requires password verification for security purposes."
      />
    </>
  );
};

export default PayrollEditDialog;
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { authService } from '../services/authService';

export interface PasswordVerificationModalProps {
  open: boolean;
  onVerify: (token: string) => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

const PasswordVerificationModal: React.FC<PasswordVerificationModalProps> = ({
  open,
  onVerify,
  onCancel,
  title = 'Password Verification Required',
  message = 'Please enter your password to continue with this sensitive operation.'
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.verifyPassword(password);
      if (response.verificationToken) {
        onVerify(response.verificationToken);
        handleClose();
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    setLoading(false);
    onCancel();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleVerify();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon color="primary" />
          <Typography variant="h6">{title}</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {message}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          autoFocus
          margin="dense"
          label="Password"
          type="password"
          fullWidth
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          error={!!error}
          helperText="Enter your current password"
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleVerify}
          variant="contained"
          disabled={!password || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <LockIcon />}
        >
          {loading ? 'Verifying...' : 'Verify'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordVerificationModal;
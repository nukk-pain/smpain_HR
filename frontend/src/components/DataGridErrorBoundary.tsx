import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary for DataGrid components
 * Catches GridHeaderCheckbox and other DataGrid-related errors
 * Provides a fallback UI when errors occur
 */
class DataGridErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console for debugging
    console.error('DataGrid Error Caught:', error, errorInfo);
    
    // Store error details in state
    this.setState({
      error,
      errorInfo,
    });

    // Check if it's the known GridHeaderCheckbox error
    if (error.message?.includes('reading \'has\'') || 
        error.message?.includes('GridHeaderCheckbox')) {
      console.warn('Known GridHeaderCheckbox error detected. Showing fallback UI.');
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallbackMessage } = this.props;
      const { error } = this.state;
      
      // Check if it's the specific GridHeaderCheckbox error
      const isKnownError = error?.message?.includes('reading \'has\'') || 
                          error?.message?.includes('GridHeaderCheckbox');

      return (
        <Box sx={{ p: 3 }}>
          <Alert 
            severity={isKnownError ? "warning" : "error"}
            sx={{ mb: 2 }}
          >
            <Typography variant="h6" gutterBottom>
              {isKnownError 
                ? "데이터 그리드 로딩 중 일시적인 오류가 발생했습니다."
                : "데이터 표시 중 오류가 발생했습니다."}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {fallbackMessage || "페이지를 새로고침하거나 잠시 후 다시 시도해주세요."}
            </Typography>
          </Alert>
          
          <Button 
            variant="contained" 
            onClick={this.handleReset}
            sx={{ mr: 2 }}
          >
            다시 시도
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={() => window.location.reload()}
          >
            페이지 새로고침
          </Button>

          {/* Show error details in development mode */}
          {process.env.NODE_ENV === 'development' && error && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {error.toString()}
                {error.stack}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

export default DataGridErrorBoundary;
/*
 * AI-HEADER
 * Intent: Custom hook for managing payroll Excel upload state with preview
 * Domain Meaning: Manages two-phase upload process state and session persistence
 * Misleading Names: None
 * Data Contracts: Uses payrollUpload types, integrates with API service
 * PII: Handles employee salary data in preview state
 * Invariants: State must be consistent across browser refresh
 * RAG Keywords: payroll, upload, hook, state, preview, session
 * DuplicatePolicy: canonical
 * FunctionIdentity: use-payroll-upload-state-hook
 */

import { useState, useEffect, useCallback } from 'react';
import {
  UploadState,
  PreviewData,
  UploadResult,
  StoredUploadState,
  UploadStep,
  DuplicateMode
} from '../types/payrollUpload';

const STORAGE_KEY = 'payroll_upload_state';
const SESSION_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

export const usePayrollUpload = () => {
  // Initialize state from session storage if available
  const initializeState = (): UploadState => {
    const storedData = sessionStorage.getItem(STORAGE_KEY);
    
    if (storedData) {
      try {
        const parsed: StoredUploadState = JSON.parse(storedData);
        const now = Date.now();
        
        // Check if session is still valid (within 30 minutes)
        if (parsed.timestamp && (now - parsed.timestamp) < SESSION_EXPIRY_TIME) {
          return {
            step: parsed.step,
            selectedFile: null, // File objects can't be stored in sessionStorage
            previewData: parsed.previewData,
            previewToken: parsed.previewToken,
            expiresIn: null,
            uploading: false,
            confirming: false,
            result: null,
            error: null,
            duplicateMode: parsed.duplicateMode || 'skip'
          };
        }
      } catch (error) {
        console.error('Failed to parse stored upload state:', error);
      }
    }
    
    // Default initial state
    return {
      step: 'select',
      selectedFile: null,
      previewData: null,
      previewToken: null,
      expiresIn: null,
      uploading: false,
      confirming: false,
      result: null,
      error: null,
      duplicateMode: 'skip'
    };
  };

  const [state, setState] = useState<UploadState>(initializeState);

  // Save state to session storage whenever it changes
  useEffect(() => {
    if (state.step !== 'select' || state.previewData) {
      const stateToStore: StoredUploadState = {
        step: state.step,
        previewToken: state.previewToken,
        previewData: state.previewData,
        fileName: state.selectedFile?.name || null,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
    }
  }, [state]);

  // Browser exit warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.step === 'preview' && !state.confirming) {
        e.preventDefault();
        e.returnValue = '프리뷰 데이터가 저장되지 않았습니다. 정말 나가시겠습니까?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.step, state.confirming]);

  // State update functions
  const setSelectedFile = useCallback((file: File | null) => {
    setState(prev => ({
      ...prev,
      selectedFile: file,
      error: null
    }));
  }, []);

  const setStep = useCallback((step: UploadStep) => {
    setState(prev => ({
      ...prev,
      step
    }));
  }, []);

  const setPreviewData = useCallback((
    data: PreviewData | null,
    token: string | null,
    expiresIn: number | null
  ) => {
    setState(prev => ({
      ...prev,
      previewData: data,
      previewToken: token,
      expiresIn,
      step: data ? 'preview' : prev.step
    }));
  }, []);

  const setUploading = useCallback((uploading: boolean) => {
    setState(prev => ({
      ...prev,
      uploading
    }));
  }, []);

  const setConfirming = useCallback((confirming: boolean) => {
    setState(prev => ({
      ...prev,
      confirming
    }));
  }, []);

  const setDuplicateMode = useCallback((mode: DuplicateMode) => {
    setState(prev => ({
      ...prev,
      duplicateMode: mode
    }));
  }, []);

  const setResult = useCallback((result: UploadResult | null) => {
    setState(prev => ({
      ...prev,
      result,
      step: result ? 'completed' : prev.step
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
      uploading: false,
      confirming: false
    }));
  }, []);

  const reset = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState({
      step: 'select',
      selectedFile: null,
      previewData: null,
      previewToken: null,
      expiresIn: null,
      uploading: false,
      confirming: false,
      result: null,
      error: null,
      duplicateMode: 'skip'
    });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // Check if preview token is expired
  const isPreviewExpired = useCallback(() => {
    if (!state.previewToken || !state.expiresIn) return false;
    
    const storedData = sessionStorage.getItem(STORAGE_KEY);
    if (!storedData) return true;
    
    try {
      const parsed: StoredUploadState = JSON.parse(storedData);
      const elapsed = (Date.now() - parsed.timestamp) / 1000; // in seconds
      return elapsed > state.expiresIn;
    } catch {
      return true;
    }
  }, [state.previewToken, state.expiresIn]);

  return {
    state,
    actions: {
      setSelectedFile,
      setStep,
      setPreviewData,
      setUploading,
      setConfirming,
      setDuplicateMode,
      setResult,
      setError,
      clearError,
      reset
    },
    helpers: {
      isPreviewExpired
    }
  };
};

export default usePayrollUpload;
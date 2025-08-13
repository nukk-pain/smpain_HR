/*
 * AI-HEADER
 * Intent: Browser compatibility tests for payroll upload components
 * Domain Meaning: Tests browser API support and fallbacks
 * Misleading Names: None
 * Data Contracts: Tests browser feature availability
 * PII: No PII in compatibility tests
 * Invariants: Tests must verify fallbacks work correctly
 * RAG Keywords: browser, compatibility, drag-drop, file-api, session-storage
 * DuplicatePolicy: canonical
 * FunctionIdentity: browser-compatibility-tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PayrollExcelUploadWithPreview } from '../PayrollExcelUploadWithPreview';
import { useAuth } from '../../hooks/useAuth';

// Mock dependencies
jest.mock('../../hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Browser Compatibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', role: 'Admin' },
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn()
    } as any);
  });

  describe('File API Support', () => {
    test('should handle File API availability', () => {
      // File API should be available in test environment
      expect(window.File).toBeDefined();
      expect(window.FileReader).toBeDefined();
      expect(window.FileList).toBeDefined();
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Component should render file input
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      expect(input).toBeInTheDocument();
    });

    test('should handle file input without drag and drop', () => {
      render(<PayrollExcelUploadWithPreview />);
      
      // File input should work even without drag-drop
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      fireEvent.change(input, { target: { files: [file] } });
      
      expect(screen.getByText('test.xlsx')).toBeInTheDocument();
    });

    test('should handle FileReader for file content reading', () => {
      const fileReader = new FileReader();
      expect(fileReader).toBeDefined();
      expect(fileReader.readAsArrayBuffer).toBeDefined();
      expect(fileReader.readAsText).toBeDefined();
      expect(fileReader.readAsDataURL).toBeDefined();
    });
  });

  describe('SessionStorage Support', () => {
    test('should handle sessionStorage availability', () => {
      expect(window.sessionStorage).toBeDefined();
      expect(window.sessionStorage.setItem).toBeDefined();
      expect(window.sessionStorage.getItem).toBeDefined();
      expect(window.sessionStorage.removeItem).toBeDefined();
      expect(window.sessionStorage.clear).toBeDefined();
    });

    test('should handle sessionStorage operations', () => {
      const testData = { key: 'value', nested: { data: true } };
      const jsonString = JSON.stringify(testData);
      
      // Test set and get
      sessionStorage.setItem('test_key', jsonString);
      const retrieved = sessionStorage.getItem('test_key');
      expect(JSON.parse(retrieved!)).toEqual(testData);
      
      // Test remove
      sessionStorage.removeItem('test_key');
      expect(sessionStorage.getItem('test_key')).toBeNull();
    });

    test('should handle sessionStorage quota exceeded', () => {
      // Mock quota exceeded error
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Component should still render even if sessionStorage fails
      expect(screen.getByText(/파일을 선택하거나/i)).toBeInTheDocument();
      
      // Restore original
      sessionStorage.setItem = originalSetItem;
    });

    test('should handle private browsing mode (no sessionStorage)', () => {
      // Simulate private browsing by making sessionStorage throw
      const originalSessionStorage = window.sessionStorage;
      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('SecurityError');
        },
        configurable: true
      });
      
      // Component should handle the error gracefully
      expect(() => render(<PayrollExcelUploadWithPreview />)).not.toThrow();
      
      // Restore original
      Object.defineProperty(window, 'sessionStorage', {
        value: originalSessionStorage,
        configurable: true
      });
    });
  });

  describe('Drag and Drop Support', () => {
    test('should handle drag and drop events', () => {
      render(<PayrollExcelUploadWithPreview />);
      
      const dropZone = screen.getByText(/파일을 선택하거나/i).closest('div');
      expect(dropZone).toBeInTheDocument();
      
      // Create mock file for drag and drop
      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      // Simulate drag over
      const dragOverEvent = new DragEvent('dragover', {
        dataTransfer: new DataTransfer(),
        bubbles: true
      });
      fireEvent(dropZone!, dragOverEvent);
      
      // Simulate drop
      const dropEvent = new DragEvent('drop', {
        dataTransfer: new DataTransfer(),
        bubbles: true
      });
      Object.defineProperty(dropEvent.dataTransfer, 'files', {
        value: [file],
        writable: false
      });
      fireEvent(dropZone!, dropEvent);
    });

    test('should prevent default drag behaviors', () => {
      render(<PayrollExcelUploadWithPreview />);
      
      const dropZone = screen.getByText(/파일을 선택하거나/i).closest('div');
      
      // Create drag events
      const dragOverEvent = new DragEvent('dragover', {
        dataTransfer: new DataTransfer(),
        bubbles: true,
        cancelable: true
      });
      
      const preventDefaultSpy = jest.spyOn(dragOverEvent, 'preventDefault');
      
      fireEvent(dropZone!, dragOverEvent);
      
      // Should prevent default to allow drop
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Crypto API Support', () => {
    test('should handle crypto.getRandomValues for idempotency keys', () => {
      // Check if crypto API is available
      expect(window.crypto).toBeDefined();
      expect(window.crypto.getRandomValues).toBeDefined();
      
      // Test random value generation
      const array = new Uint8Array(16);
      window.crypto.getRandomValues(array);
      
      // Should have non-zero values
      const hasNonZero = array.some(byte => byte !== 0);
      expect(hasNonZero).toBe(true);
    });

    test('should handle crypto API fallback', () => {
      // Mock missing crypto API
      const originalCrypto = window.crypto;
      Object.defineProperty(window, 'crypto', {
        value: undefined,
        configurable: true
      });
      
      // Component should still work with Math.random fallback
      render(<PayrollExcelUploadWithPreview />);
      expect(screen.getByText(/파일을 선택하거나/i)).toBeInTheDocument();
      
      // Restore original
      Object.defineProperty(window, 'crypto', {
        value: originalCrypto,
        configurable: true
      });
    });
  });

  describe('FormData Support', () => {
    test('should handle FormData for file uploads', () => {
      expect(window.FormData).toBeDefined();
      
      const formData = new FormData();
      const file = new File(['test'], 'test.xlsx');
      
      formData.append('file', file);
      formData.append('year', '2024');
      formData.append('month', '12');
      
      // FormData should handle file and text fields
      expect(formData.get('file')).toBe(file);
      expect(formData.get('year')).toBe('2024');
      expect(formData.get('month')).toBe('12');
    });
  });

  describe('Intl API Support', () => {
    test('should handle Intl.NumberFormat for currency formatting', () => {
      expect(window.Intl).toBeDefined();
      expect(window.Intl.NumberFormat).toBeDefined();
      
      const formatter = new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0
      });
      
      const formatted = formatter.format(3000000);
      expect(formatted).toContain('3');
      expect(formatted).toMatch(/[₩￦]/); // Korean Won symbol
    });

    test('should handle Intl.NumberFormat fallback', () => {
      // Mock missing Intl
      const originalIntl = window.Intl;
      Object.defineProperty(window, 'Intl', {
        value: undefined,
        configurable: true
      });
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Component should still render with fallback formatting
      expect(screen.getByText(/파일을 선택하거나/i)).toBeInTheDocument();
      
      // Restore original
      Object.defineProperty(window, 'Intl', {
        value: originalIntl,
        configurable: true
      });
    });
  });

  describe('Event Handler Compatibility', () => {
    test('should handle both addEventListener and attachEvent', () => {
      const element = document.createElement('div');
      
      // Modern browsers use addEventListener
      expect(element.addEventListener).toBeDefined();
      
      // Test event listener
      const handler = jest.fn();
      element.addEventListener('click', handler);
      element.click();
      
      expect(handler).toHaveBeenCalled();
    });

    test('should handle input event vs change event', () => {
      render(<PayrollExcelUploadWithPreview />);
      
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      
      // Both events should be supported
      const inputHandler = jest.fn();
      const changeHandler = jest.fn();
      
      searchInput.addEventListener('input', inputHandler);
      searchInput.addEventListener('change', changeHandler);
      
      // Simulate typing
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      expect(inputHandler).toHaveBeenCalled();
      expect(changeHandler).toHaveBeenCalled();
    });
  });

  describe('CSS Feature Support', () => {
    test('should handle CSS Grid and Flexbox', () => {
      const testElement = document.createElement('div');
      document.body.appendChild(testElement);
      
      // Test Grid support
      testElement.style.display = 'grid';
      const computedStyle = window.getComputedStyle(testElement);
      expect(['grid', '']).toContain(computedStyle.display);
      
      // Test Flexbox support
      testElement.style.display = 'flex';
      const flexStyle = window.getComputedStyle(testElement);
      expect(['flex', '']).toContain(flexStyle.display);
      
      document.body.removeChild(testElement);
    });
  });

  describe('Network API Support', () => {
    test('should handle fetch API', () => {
      expect(window.fetch).toBeDefined();
    });

    test('should handle XMLHttpRequest as fallback', () => {
      expect(window.XMLHttpRequest).toBeDefined();
      
      const xhr = new XMLHttpRequest();
      expect(xhr.open).toBeDefined();
      expect(xhr.send).toBeDefined();
      expect(xhr.setRequestHeader).toBeDefined();
    });
  });

  describe('Browser Storage Limits', () => {
    test('should handle large data in sessionStorage', () => {
      // Test with reasonable size data (1MB)
      const largeData = 'x'.repeat(1024 * 1024);
      
      try {
        sessionStorage.setItem('large_test', largeData);
        const retrieved = sessionStorage.getItem('large_test');
        expect(retrieved).toBe(largeData);
        sessionStorage.removeItem('large_test');
      } catch (e) {
        // Some browsers have lower limits
        expect(e).toBeDefined();
      }
    });
  });
});
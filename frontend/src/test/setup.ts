/**
 * Vitest Setup File
 * 
 * IMPORTANT: No mock data - using real MongoDB data per CLAUDE.md
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Setup test environment
beforeAll(async () => {
  // Set API URL for tests
  process.env.VITE_API_URL = 'http://localhost:5455/api';
  
  // Note: Real backend server should be running on port 5455
  // Note: MongoDB test database should be available
  console.log('🧪 Test environment setup complete');
  console.log('📍 API URL:', process.env.VITE_API_URL);
  console.log('⚠️  Ensure backend is running on port 5455');
  console.log('⚠️  Ensure MongoDB is accessible');
});

afterAll(async () => {
  // Cleanup test data from MongoDB if needed
  console.log('🧹 Test cleanup complete');
});

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
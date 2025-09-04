/**
 * E2E Test Setup and Utilities
 * Provides utilities for end-to-end scenario testing
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../components/AuthProvider';
import { NotificationProvider } from '../../components/NotificationProvider';
import apiService from '../../services/api';

// Test server configuration
export const TEST_API_URL = 'http://localhost:5455/api';

// Test users
export const testUsers = {
  admin: {
    username: 'admin',
    password: 'admin'
  },
  supervisor: {
    username: 'supervisor',
    password: 'supervisor'
  },
  user: {
    username: 'user',
    password: 'user'
  }
};

// Setup API for tests
export const setupE2ETests = () => {
  beforeAll(() => {
    // @ts-ignore - accessing private property for testing
    if (apiService.api) {
      apiService.api.defaults.baseURL = TEST_API_URL;
    }
  });

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Reset API configuration
    // @ts-ignore
    if (apiService.api) {
      apiService.api.defaults.baseURL = TEST_API_URL;
    }
  });

  afterEach(() => {
    // Cleanup
    localStorage.clear();
  });
};

// Render app with all providers
export const renderApp = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          {component}
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
};

// Login helper
export const loginUser = async (username: string, password: string) => {
  const response = await fetch(`${TEST_API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();
  localStorage.setItem('hr_auth_token', data.token);
  return data;
};

// Wait for element with retry
export const waitForElement = async (
  finder: () => HTMLElement | null,
  options = { timeout: 5000 }
) => {
  return waitFor(finder, options);
};

// Navigate helper
export const navigateTo = async (user: ReturnType<typeof userEvent.setup>, linkText: string) => {
  const link = screen.getByRole('link', { name: new RegExp(linkText, 'i') });
  await user.click(link);
};

// Form fill helper
export const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  fields: Record<string, string>
) => {
  for (const [label, value] of Object.entries(fields)) {
    const input = screen.getByLabelText(new RegExp(label, 'i'));
    await user.clear(input);
    await user.type(input, value);
  }
};

// Button click helper
export const clickButton = async (
  user: ReturnType<typeof userEvent.setup>,
  buttonText: string
) => {
  const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await user.click(button);
};

// Check notification
export const expectNotification = async (message: string, type: 'success' | 'error' = 'success') => {
  await waitFor(() => {
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(message);
    if (type === 'success') {
      expect(alert).toHaveClass('MuiAlert-standardSuccess');
    } else {
      expect(alert).toHaveClass('MuiAlert-standardError');
    }
  });
};

// Check page title
export const expectPageTitle = (title: string) => {
  const heading = screen.getByRole('heading', { level: 1 });
  expect(heading).toHaveTextContent(title);
};

// Logout helper
export const logout = async (user: ReturnType<typeof userEvent.setup>) => {
  // Click user menu
  const userButton = screen.getByRole('button', { name: /admin|user|supervisor/i });
  await user.click(userButton);
  
  // Click logout
  const logoutOption = screen.getByText('로그아웃');
  await user.click(logoutOption);
  
  // Wait for redirect
  await waitFor(() => {
    expect(localStorage.getItem('hr_auth_token')).toBeNull();
  });
};
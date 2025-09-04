/**
 * AuthProvider Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthProvider';

// Mock the api service
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    setAuthToken: vi.fn(),
  },
  ApiService: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    setAuthToken: vi.fn(),
  })),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component that uses auth context
const TestComponent: React.FC = () => {
  const { user, login, logout, loading, refreshUser } = useAuth();
  
  return (
    <div>
      {loading && <div data-testid="loading">Loading...</div>}
      {user ? (
        <div>
          <div data-testid="user-info">
            User: {user.username} ({user.role})
          </div>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>
          <div data-testid="no-user">Not logged in</div>
          <button onClick={() => login('testuser', 'password')}>Login</button>
        </div>
      )}
      <button onClick={refreshUser}>Refresh User</button>
    </div>
  );
};

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('AuthProvider Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('provides auth context to children', () => {
    renderWithProvider(<TestComponent />);
    
    expect(screen.getByTestId('no-user')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh User' })).toBeInTheDocument();
  });

  it('shows loading state initially when token exists', () => {
    localStorageMock.getItem.mockReturnValue('fake-token');
    
    renderWithProvider(<TestComponent />);
    
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    const mockApiService = (await import('../services/api')).default;
    mockApiService.post = vi.fn().mockResolvedValue({
      data: {
        token: 'test-token',
        user: {
          id: '1',
          username: 'testuser',
          role: 'user',
          name: 'Test User',
        },
      },
    });
    
    renderWithProvider(<TestComponent />);
    
    const loginButton = screen.getByRole('button', { name: 'Login' });
    
    await act(async () => {
      loginButton.click();
    });
    
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'test-token');
    });
  });

  it('handles logout', async () => {
    // Set initial logged in state
    localStorageMock.getItem.mockReturnValue('test-token');
    
    const mockApiService = (await import('../services/api')).default;
    mockApiService.get = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: '1',
          username: 'testuser',
          role: 'user',
          name: 'Test User',
        },
      },
    });
    
    mockApiService.post = vi.fn().mockResolvedValue({ data: { success: true } });
    
    renderWithProvider(<TestComponent />);
    
    // Wait for auth check to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });
    
    if (screen.queryByRole('button', { name: 'Logout' })) {
      const logoutButton = screen.getByRole('button', { name: 'Logout' });
      
      await act(async () => {
        logoutButton.click();
      });
      
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      });
    }
  });

  it('handles failed login', async () => {
    const mockApiService = (await import('../services/api')).default;
    mockApiService.post = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    
    renderWithProvider(<TestComponent />);
    
    const loginButton = screen.getByRole('button', { name: 'Login' });
    
    await act(async () => {
      loginButton.click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('no-user')).toBeInTheDocument();
    });
    
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith('token', expect.anything());
  });

  it('checks authentication on mount when token exists', async () => {
    localStorageMock.getItem.mockReturnValue('test-token');
    
    const mockApiService = (await import('../services/api')).default;
    mockApiService.get = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: '1',
          username: 'testuser',
          role: 'user',
          name: 'Test User',
        },
      },
    });
    
    renderWithProvider(<TestComponent />);
    
    await waitFor(() => {
      expect(mockApiService.get).toHaveBeenCalledWith('/auth/check');
    });
  });

  it('clears token when auth check fails', async () => {
    localStorageMock.getItem.mockReturnValue('invalid-token');
    
    const mockApiService = (await import('../services/api')).default;
    mockApiService.get = vi.fn().mockRejectedValue(new Error('Unauthorized'));
    
    renderWithProvider(<TestComponent />);
    
    await waitFor(() => {
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });
  });
});
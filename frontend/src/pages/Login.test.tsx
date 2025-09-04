/**
 * Login Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthProvider
const mockLogin = vi.fn();
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    login: mockLogin,
    logout: vi.fn(),
    user: null,
    loading: false,
    checkAuth: vi.fn(),
  }),
}));

// Mock NotificationProvider
vi.mock('@/components/NotificationProvider', () => ({
  useNotification: () => ({
    showNotification: vi.fn(),
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with all required fields', () => {
    renderLogin();
    
    // Check for input fields by name attribute
    const usernameInput = document.querySelector('input[name="username"]');
    const passwordInput = document.querySelector('input[name="password"]');
    
    expect(usernameInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    renderLogin();
    
    const loginButton = screen.getByRole('button', { name: '로그인' });
    fireEvent.click(loginButton);
    
    // HTML5 validation will prevent submission, so check for required attributes
    const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
    expect(usernameInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('required');
  });

  it('calls login function with correct credentials', async () => {
    const user = userEvent.setup();
    renderLogin();
    
    const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
    const loginButton = screen.getByRole('button', { name: '로그인' });
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
    });
  });

  it('displays error message on login failure', async () => {
    mockLogin.mockResolvedValueOnce(false);
    const user = userEvent.setup();
    renderLogin();
    
    const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
    const loginButton = screen.getByRole('button', { name: '로그인' });
    
    await user.type(usernameInput, 'wronguser');
    await user.type(passwordInput, 'wrongpass');
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText(/사용자명 또는 비밀번호가 올바르지 않습니다/)).toBeInTheDocument();
    });
  });

  it('navigates to dashboard on successful login', async () => {
    mockLogin.mockResolvedValueOnce({
      id: '1',
      username: 'testuser',
      role: 'user',
      name: 'Test User'
    });
    
    const user = userEvent.setup();
    renderLogin();
    
    const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
    const loginButton = screen.getByRole('button', { name: '로그인' });
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('disables form inputs while logging in', async () => {
    // Mock a slow login
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    const user = userEvent.setup();
    renderLogin();
    
    const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
    const loginButton = screen.getByRole('button', { name: '로그인' });
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);
    
    // Check that inputs are disabled during login
    expect(usernameInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(loginButton).toBeDisabled();
  });

  it('shows loading spinner during authentication', async () => {
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    const user = userEvent.setup();
    renderLogin();
    
    const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
    const loginButton = screen.getByRole('button', { name: '로그인' });
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);
    
    // Check for loading indicator
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles Enter key press to submit form', async () => {
    const user = userEvent.setup();
    renderLogin();
    
    const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123{Enter}');
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
    });
  });
});
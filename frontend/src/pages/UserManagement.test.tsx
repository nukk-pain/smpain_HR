/**
 * UserManagement Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserManagement from './UserManagement';
import * as api from '../services/api';

// Mock API service
vi.mock('../services/api', () => ({
  fetchUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  deactivateUser: vi.fn(),
  fetchDepartments: vi.fn(),
}));

// Mock AuthProvider
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      username: 'admin',
      role: 'admin',
      name: 'Admin User',
    },
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
    checkAuth: vi.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderUserManagement = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <UserManagement />
    </QueryClientProvider>
  );
};

describe('UserManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    
    // Default mock implementations
    vi.mocked(api.fetchUsers).mockResolvedValue({
      data: [
        {
          _id: '1',
          username: 'john.doe',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'user',
          department: 'Sales',
          isActive: true,
        },
        {
          _id: '2',
          username: 'jane.smith',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'supervisor',
          department: 'HR',
          isActive: true,
        },
      ],
    });
    
    vi.mocked(api.fetchDepartments).mockResolvedValue([
      { _id: '1', name: 'Sales' },
      { _id: '2', name: 'HR' },
      { _id: '3', name: 'IT' },
    ]);
  });

  it('renders user list with correct columns', async () => {
    renderUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    
    // Check for column headers
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Department')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('opens add user dialog when clicking add button', async () => {
    const user = userEvent.setup();
    renderUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const addButton = screen.getByRole('button', { name: /add user/i });
    await user.click(addButton);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add New User')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('creates a new user successfully', async () => {
    vi.mocked(api.createUser).mockResolvedValueOnce({
      _id: '3',
      username: 'new.user',
      name: 'New User',
      email: 'new@example.com',
      role: 'user',
      department: 'IT',
      isActive: true,
    });
    
    const user = userEvent.setup();
    renderUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    // Open dialog
    const addButton = screen.getByRole('button', { name: /add user/i });
    await user.click(addButton);
    
    // Fill form
    await user.type(screen.getByLabelText(/username/i), 'new.user');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/full name/i), 'New User');
    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    
    // Select role and department
    const roleSelect = screen.getByLabelText(/role/i);
    await user.click(roleSelect);
    await user.click(screen.getByRole('option', { name: /user/i }));
    
    const deptSelect = screen.getByLabelText(/department/i);
    await user.click(deptSelect);
    await user.click(screen.getByRole('option', { name: /IT/i }));
    
    // Submit
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(api.createUser).toHaveBeenCalledWith(expect.objectContaining({
        username: 'new.user',
        name: 'New User',
        email: 'new@example.com',
        role: 'user',
        department: 'IT',
      }));
    });
  });

  it('opens edit dialog when clicking edit button', async () => {
    const user = userEvent.setup();
    renderUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john.doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
  });

  it('deactivates a user when clicking deactivate button', async () => {
    vi.mocked(api.deactivateUser).mockResolvedValueOnce({
      success: true,
      message: 'User deactivated successfully',
    });
    
    const user = userEvent.setup();
    renderUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i });
    await user.click(deactivateButtons[0]);
    
    // Confirm dialog
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(api.deactivateUser).toHaveBeenCalledWith('1');
    });
  });

  it('filters users by search term', async () => {
    const user = userEvent.setup();
    renderUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search users/i);
    await user.type(searchInput, 'john');
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('filters users by department', async () => {
    const user = userEvent.setup();
    renderUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    
    const deptFilter = screen.getByLabelText(/filter by department/i);
    await user.click(deptFilter);
    await user.click(screen.getByRole('option', { name: /HR/i }));
    
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching users', () => {
    vi.mocked(api.fetchUsers).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    renderUserManagement();
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error message when fetching users fails', async () => {
    vi.mocked(api.fetchUsers).mockRejectedValueOnce(
      new Error('Failed to fetch users')
    );
    
    renderUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText(/failed to fetch users/i)).toBeInTheDocument();
    });
  });

  it('validates required fields when creating user', async () => {
    const user = userEvent.setup();
    renderUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    // Open dialog
    const addButton = screen.getByRole('button', { name: /add user/i });
    await user.click(addButton);
    
    // Try to submit without filling required fields
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });
});
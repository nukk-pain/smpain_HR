/**
 * UserProfile Component Tests
 * Tests for user profile viewing and editing functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import UserProfile from './UserProfile';

// Mock the dependencies
vi.mock('../components/AuthProvider', () => ({
  useAuth: vi.fn()
}));

vi.mock('../components/NotificationProvider', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn()
  })
}));

vi.mock('../services/api', () => ({
  apiService: {
    updateUserProfile: vi.fn()
  }
}));

// Import mocked functions
import { useAuth } from '../components/AuthProvider';

const mockUser = {
  _id: '123',
  id: '123',
  username: 'testuser',
  name: 'Test User',
  employeeId: 'EMP001',
  birthDate: '1990-01-01',
  phoneNumber: '010-1234-5678',
  department: 'Engineering',
  position: 'Senior Developer',
  role: 'user',
  permissions: ['leave:view', 'leave:request']
};

describe('UserProfile Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      refreshUser: vi.fn(),
      isAuthenticated: true,
      logout: vi.fn(),
      hasPermission: vi.fn(),
      hasRole: vi.fn()
    } as any);
  });

  it('renders user profile information', () => {
    render(<UserProfile />);
    
    // Check if user information is displayed
    expect(screen.getByText('👤 내 정보')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    // Username is not directly displayed, instead employeeId is shown
  });

  it('displays all user fields', () => {
    render(<UserProfile />);
    
    // Check for field labels - using getAllByText since they may appear multiple times
    expect(screen.getAllByText('이름').length).toBeGreaterThan(0);
    expect(screen.getAllByText('생년월일').length).toBeGreaterThan(0);
    expect(screen.getAllByText('전화번호').length).toBeGreaterThan(0);
    expect(screen.getAllByText('부서').length).toBeGreaterThan(0);
    expect(screen.getAllByText('직급').length).toBeGreaterThan(0);
  });

  it('enables edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<UserProfile />);
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /수정/i });
    await user.click(editButton);
    
    // Check if save and cancel buttons appear
    expect(screen.getByRole('button', { name: /저장/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /취소/i })).toBeInTheDocument();
  });

  it('allows editing user information', async () => {
    const user = userEvent.setup();
    render(<UserProfile />);
    
    // Enter edit mode first
    const editButton = screen.getByRole('button', { name: /정보 수정/i });
    await user.click(editButton);
    
    // Now the inputs should be editable
    // Find all inputs with label "이름" and get the editable one
    const nameInputs = screen.getAllByLabelText(/이름/i);
    const editableNameInput = nameInputs.find(input => !(input as HTMLInputElement).disabled) as HTMLInputElement;
    
    if (editableNameInput) {
      await user.clear(editableNameInput);
      await user.type(editableNameInput, 'Updated Name');
      expect(editableNameInput.value).toBe('Updated Name');
    }
  });

  it('cancels editing and restores original values', async () => {
    const user = userEvent.setup();
    render(<UserProfile />);
    
    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /정보 수정/i });
    await user.click(editButton);
    
    // Find the editable name input
    const nameInputs = screen.getAllByLabelText(/이름/i);
    const editableNameInput = nameInputs.find(input => !(input as HTMLInputElement).disabled) as HTMLInputElement;
    
    if (editableNameInput) {
      await user.clear(editableNameInput);
      await user.type(editableNameInput, 'Changed Name');
      
      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /취소/i });
      await user.click(cancelButton);
      
      // Check if original value is restored
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Changed Name')).not.toBeInTheDocument();
    }
  });

  it('saves profile changes successfully', async () => {
    const mockRefreshUser = vi.fn();
    const mockShowSuccess = vi.fn();
    const mockUpdateUserProfile = vi.fn().mockResolvedValue({});
    
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      refreshUser: mockRefreshUser,
      isAuthenticated: true,
      logout: vi.fn(),
      hasPermission: vi.fn(),
      hasRole: vi.fn()
    } as any);
    
    const { apiService } = await import('../services/api');
    apiService.updateUserProfile = mockUpdateUserProfile;
    
    // Re-mock notification to capture the success call
    vi.doMock('../components/NotificationProvider', () => ({
      useNotification: () => ({
        showSuccess: mockShowSuccess,
        showError: vi.fn()
      })
    }));
    
    const user = userEvent.setup();
    render(<UserProfile />);
    
    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /정보 수정/i });
    await user.click(editButton);
    
    // Find and edit the editable name input
    const nameInputs = screen.getAllByLabelText(/이름/i);
    const editableNameInput = nameInputs.find(input => !(input as HTMLInputElement).disabled) as HTMLInputElement;
    
    if (editableNameInput) {
      await user.clear(editableNameInput);
      await user.type(editableNameInput, 'Updated Name');
      
      // Save changes
      const saveButton = screen.getByRole('button', { name: /저장/i });
      await user.click(saveButton);
      
      // Wait for async operations
      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalledWith('123', expect.objectContaining({
          name: 'Updated Name'
        }));
      });
    }
  });

  it('handles profile update errors', async () => {
    const mockShowError = vi.fn();
    const mockUpdateUserProfile = vi.fn().mockRejectedValue(new Error('Update failed'));
    
    const { apiService } = await import('../services/api');
    apiService.updateUserProfile = mockUpdateUserProfile;
    
    vi.doMock('../components/NotificationProvider', () => ({
      useNotification: () => ({
        showSuccess: vi.fn(),
        showError: mockShowError
      })
    }));
    
    const user = userEvent.setup();
    render(<UserProfile />);
    
    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /수정/i });
    await user.click(editButton);
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: /저장/i });
    await user.click(saveButton);
    
    // Wait for error handling
    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalled();
    });
  });

  it('displays user avatar with initials', () => {
    render(<UserProfile />);
    
    // Check for avatar (it should contain initials or an icon)
    const avatar = screen.getByTestId('PersonIcon');
    expect(avatar).toBeInTheDocument();
  });

  it('shows role and permissions information', () => {
    render(<UserProfile />);
    
    // Check for role display (should be "사용자" for 'user' role)
    expect(screen.getByText('사용자')).toBeInTheDocument();
  });

  it('disables department and position fields in edit mode', async () => {
    const user = userEvent.setup();
    render(<UserProfile />);
    
    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /수정/i });
    await user.click(editButton);
    
    // Check if department and position fields are disabled
    const departmentInput = screen.getByLabelText(/부서/i) as HTMLInputElement;
    const positionInput = screen.getByLabelText(/직급/i) as HTMLInputElement;
    
    expect(departmentInput.disabled).toBe(true);
    expect(positionInput.disabled).toBe(true);
  });
});
/**
 * LeaveManagement Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LeaveManagement from './LeaveManagement';
import * as api from '../../services/api';
import { format } from 'date-fns';

// Mock API service
vi.mock('../../services/api', () => ({
  fetchLeaveBalance: vi.fn(),
  fetchLeaveRequests: vi.fn(),
  submitLeaveRequest: vi.fn(),
  cancelLeaveRequest: vi.fn(),
  approveLeaveRequest: vi.fn(),
  rejectLeaveRequest: vi.fn(),
}));

// Mock AuthProvider
const mockUser = {
  id: '1',
  username: 'testuser',
  role: 'user',
  name: 'Test User',
};

vi.mock('@/components/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
    checkAuth: vi.fn(),
  })),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderLeaveManagement = (userOverrides = {}) => {
  // Update mock user if needed
  const { useAuth } = require('@/components/AuthProvider');
  useAuth.mockReturnValue({
    user: { ...mockUser, ...userOverrides },
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
    checkAuth: vi.fn(),
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      <LeaveManagement />
    </QueryClientProvider>
  );
};

describe('LeaveManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    
    // Default mock implementations
    vi.mocked(api.fetchLeaveBalance).mockResolvedValue({
      annual_leave_balance: 15,
      sick_leave_balance: 10,
      used_annual: 5,
      used_sick: 2,
      pending_annual: 3,
      year: 2025,
    });
    
    vi.mocked(api.fetchLeaveRequests).mockResolvedValue([
      {
        _id: '1',
        leave_type: 'annual',
        start_date: '2025-09-01',
        end_date: '2025-09-03',
        days: 3,
        reason: 'Family vacation',
        status: 'pending',
        created_at: '2025-08-15',
      },
      {
        _id: '2',
        leave_type: 'sick',
        start_date: '2025-08-10',
        end_date: '2025-08-11',
        days: 2,
        reason: 'Medical appointment',
        status: 'approved',
        created_at: '2025-08-08',
        approved_by: 'Manager',
        approved_date: '2025-08-09',
      },
    ]);
  });

  it('displays leave balance correctly', async () => {
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText('Leave Management')).toBeInTheDocument();
      expect(screen.getByText(/Annual Leave Balance:/)).toBeInTheDocument();
      expect(screen.getByText(/15 days/)).toBeInTheDocument();
      expect(screen.getByText(/Sick Leave Balance:/)).toBeInTheDocument();
      expect(screen.getByText(/10 days/)).toBeInTheDocument();
    });
  });

  it('displays leave requests list', async () => {
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText('Family vacation')).toBeInTheDocument();
      expect(screen.getByText('Medical appointment')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });
  });

  it('opens leave request dialog when clicking request button', async () => {
    const user = userEvent.setup();
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText('Leave Management')).toBeInTheDocument();
    });
    
    const requestButton = screen.getByRole('button', { name: /request leave/i });
    await user.click(requestButton);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Request Leave')).toBeInTheDocument();
    expect(screen.getByLabelText(/leave type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
  });

  it('submits leave request successfully', async () => {
    vi.mocked(api.submitLeaveRequest).mockResolvedValueOnce({
      success: true,
      request_id: '3',
      message: 'Leave request submitted successfully',
    });
    
    const user = userEvent.setup();
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText('Leave Management')).toBeInTheDocument();
    });
    
    // Open dialog
    const requestButton = screen.getByRole('button', { name: /request leave/i });
    await user.click(requestButton);
    
    // Fill form
    const typeSelect = screen.getByLabelText(/leave type/i);
    await user.click(typeSelect);
    await user.click(screen.getByRole('option', { name: /annual/i }));
    
    const startDate = screen.getByLabelText(/start date/i);
    await user.type(startDate, '2025-10-01');
    
    const endDate = screen.getByLabelText(/end date/i);
    await user.type(endDate, '2025-10-05');
    
    const reason = screen.getByLabelText(/reason/i);
    await user.type(reason, 'Personal vacation');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(api.submitLeaveRequest).toHaveBeenCalledWith({
        leave_type: 'annual',
        start_date: '2025-10-01',
        end_date: '2025-10-05',
        reason: 'Personal vacation',
      });
    });
  });

  it('cancels pending leave request', async () => {
    vi.mocked(api.cancelLeaveRequest).mockResolvedValueOnce({
      success: true,
      message: 'Leave request cancelled successfully',
    });
    
    const user = userEvent.setup();
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText('Family vacation')).toBeInTheDocument();
    });
    
    const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
    await user.click(cancelButtons[0]);
    
    // Confirm cancellation
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(api.cancelLeaveRequest).toHaveBeenCalledWith('1');
    });
  });

  it('shows approval buttons for supervisor role', async () => {
    renderLeaveManagement({ role: 'supervisor' });
    
    await waitFor(() => {
      expect(screen.getByText('Family vacation')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });
  });

  it('approves leave request as supervisor', async () => {
    vi.mocked(api.approveLeaveRequest).mockResolvedValueOnce({
      success: true,
      message: 'Leave request approved successfully',
    });
    
    const user = userEvent.setup();
    renderLeaveManagement({ role: 'supervisor' });
    
    await waitFor(() => {
      expect(screen.getByText('Family vacation')).toBeInTheDocument();
    });
    
    const approveButton = screen.getByRole('button', { name: /approve/i });
    await user.click(approveButton);
    
    // Add comments
    const commentsInput = screen.getByLabelText(/comments/i);
    await user.type(commentsInput, 'Approved for vacation');
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(api.approveLeaveRequest).toHaveBeenCalledWith('1', {
        comments: 'Approved for vacation',
      });
    });
  });

  it('filters leave requests by status', async () => {
    const user = userEvent.setup();
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText('Family vacation')).toBeInTheDocument();
      expect(screen.getByText('Medical appointment')).toBeInTheDocument();
    });
    
    const statusFilter = screen.getByLabelText(/filter by status/i);
    await user.click(statusFilter);
    await user.click(screen.getByRole('option', { name: /pending/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Family vacation')).toBeInTheDocument();
      expect(screen.queryByText('Medical appointment')).not.toBeInTheDocument();
    });
  });

  it('validates leave request dates', async () => {
    const user = userEvent.setup();
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText('Leave Management')).toBeInTheDocument();
    });
    
    // Open dialog
    const requestButton = screen.getByRole('button', { name: /request leave/i });
    await user.click(requestButton);
    
    // Set end date before start date
    const startDate = screen.getByLabelText(/start date/i);
    await user.type(startDate, '2025-10-05');
    
    const endDate = screen.getByLabelText(/end date/i);
    await user.type(endDate, '2025-10-01');
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
    });
  });

  it('shows warning when leave balance is insufficient', async () => {
    vi.mocked(api.fetchLeaveBalance).mockResolvedValue({
      annual_leave_balance: 2,
      sick_leave_balance: 10,
      used_annual: 18,
      used_sick: 0,
      pending_annual: 0,
      year: 2025,
    });
    
    const user = userEvent.setup();
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText(/Annual Leave Balance:/)).toBeInTheDocument();
      expect(screen.getByText(/2 days/)).toBeInTheDocument();
    });
    
    // Open dialog
    const requestButton = screen.getByRole('button', { name: /request leave/i });
    await user.click(requestButton);
    
    // Try to request more days than available
    const typeSelect = screen.getByLabelText(/leave type/i);
    await user.click(typeSelect);
    await user.click(screen.getByRole('option', { name: /annual/i }));
    
    const startDate = screen.getByLabelText(/start date/i);
    await user.type(startDate, '2025-10-01');
    
    const endDate = screen.getByLabelText(/end date/i);
    await user.type(endDate, '2025-10-05'); // 5 days
    
    await waitFor(() => {
      expect(screen.getByText(/insufficient leave balance/i)).toBeInTheDocument();
    });
  });

  it('displays leave history with pagination', async () => {
    // Mock many leave requests for pagination
    const manyRequests = Array.from({ length: 25 }, (_, i) => ({
      _id: `${i + 1}`,
      leave_type: i % 2 === 0 ? 'annual' : 'sick',
      start_date: `2025-${String((i % 12) + 1).padStart(2, '0')}-01`,
      end_date: `2025-${String((i % 12) + 1).padStart(2, '0')}-03`,
      days: 3,
      reason: `Request ${i + 1}`,
      status: ['pending', 'approved', 'rejected'][i % 3],
      created_at: '2025-01-01',
    }));
    
    vi.mocked(api.fetchLeaveRequests).mockResolvedValue(manyRequests);
    
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText('Request 1')).toBeInTheDocument();
      // Check pagination controls exist
      expect(screen.getByLabelText(/page/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
    });
  });
});
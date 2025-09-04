/**
 * LeaveManagement Page Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import LeaveManagement from './LeaveManagement';

// Mock the api service - must be defined before vi.mock
vi.mock('@/services/api', () => {
  const mockApiService = {
    fetchLeaveBalance: vi.fn(),
    fetchLeaveRequests: vi.fn(),
    submitLeaveRequest: vi.fn(),
    cancelLeaveRequest: vi.fn(),
    approveLeaveRequest: vi.fn(),
    rejectLeaveRequest: vi.fn(),
    updateLeaveRequest: vi.fn(),
    fetchUsers: vi.fn(),
    fetchDepartments: vi.fn(),
    getLeaveBalance: vi.fn(),
    getLeaveRequests: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  
  return {
    ApiService: vi.fn(() => mockApiService),
    apiService: mockApiService,
  };
});

// Import after mock to get the mocked version
import { apiService } from '@/services/api';
const mockApiService = apiService as any;

// Mock AuthProvider
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      username: 'testuser',
      role: 'user',
      name: 'Test User',
    },
    login: vi.fn(),
    logout: vi.fn(),
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

const renderLeaveManagement = () => {
  return render(
    <BrowserRouter>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <LeaveManagement />
      </LocalizationProvider>
    </BrowserRouter>
  );
};

describe('LeaveManagement Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockApiService.getLeaveBalance.mockResolvedValue({
      data: {
        annual: 15,
        sick: 10,
        used_annual: 5,
        used_sick: 2,
        year: 2025,
      },
    });
    
    mockApiService.getLeaveRequests.mockResolvedValue({
      data: [
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
      ],
    });
    
    mockApiService.get.mockImplementation((url) => {
      if (url.includes('/leave/balance')) {
        return Promise.resolve({
          data: {
            annual: 15,
            sick: 10,
            used_annual: 5,
            used_sick: 2,
            year: 2025,
          },
        });
      }
      if (url.includes('/leave/requests') || url.includes('/leave/my-requests')) {
        return Promise.resolve({
          data: [
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
          ],
        });
      }
      if (url.includes('/users')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes('/departments')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  it('renders leave management page title', async () => {
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText('휴가 관리')).toBeInTheDocument();
    });
  });

  it('displays leave balance information', async () => {
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getAllByText(/연차/)[0]).toBeInTheDocument();
      expect(screen.getByText(/병가/)).toBeInTheDocument();
    });
  });

  it('shows leave request button', async () => {
    renderLeaveManagement();
    
    await waitFor(() => {
      const requestButton = screen.getByRole('button', { name: /휴가 신청/i });
      expect(requestButton).toBeInTheDocument();
    });
  });

  it('displays leave requests table', async () => {
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText('Family vacation')).toBeInTheDocument();
    });
  });

  it('opens leave request dialog when clicking request button', async () => {
    const user = userEvent.setup();
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText('휴가 관리')).toBeInTheDocument();
    });
    
    const requestButton = screen.getByRole('button', { name: /휴가 신청/i });
    await user.click(requestButton);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('handles leave request submission', async () => {
    mockApiService.post.mockResolvedValueOnce({
      data: {
        success: true,
        request_id: '2',
        message: 'Leave request submitted successfully',
      },
    });
    
    const user = userEvent.setup();
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText('휴가 관리')).toBeInTheDocument();
    });
    
    // Open dialog
    const requestButton = screen.getByRole('button', { name: /휴가 신청/i });
    await user.click(requestButton);
    
    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /신청/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockApiService.post).toHaveBeenCalled();
    });
  });

  it('displays loading state while fetching data', () => {
    mockApiService.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderLeaveManagement();
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockApiService.get.mockRejectedValueOnce(new Error('Server error'));
    
    renderLeaveManagement();
    
    await waitFor(() => {
      expect(screen.getByText(/오류/i)).toBeInTheDocument();
    });
  });
});
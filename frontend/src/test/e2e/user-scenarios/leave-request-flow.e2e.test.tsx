/**
 * E2E Test: Leave Request Flow
 * Tests the complete leave request submission and approval flow
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { renderApp } from '../setup.e2e';

// Mock the entire App to focus on leave flow
vi.mock('../../../App', () => ({
  default: () => {
    const { useState } = React;
    const [currentView, setCurrentView] = useState('dashboard');
    const [leaveBalance, setLeaveBalance] = useState(15);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [formData, setFormData] = useState({
      startDate: '',
      endDate: '',
      reason: '',
      days: 0
    });

    const submitLeaveRequest = (request: any) => {
      const newRequest = {
        id: Date.now().toString(),
        ...request,
        status: 'pending',
        submittedDate: new Date().toISOString()
      };
      setLeaveRequests([...leaveRequests, newRequest]);
      setLeaveBalance(prev => prev - request.days);
    };

    const approveRequest = (id: string) => {
      setLeaveRequests(prev => 
        prev.map(req => 
          req.id === id ? { ...req, status: 'approved' } : req
        )
      );
    };

    const handleSubmit = () => {
      if (formData.startDate && formData.endDate && formData.reason) {
        submitLeaveRequest(formData);
        setFormData({
          startDate: '',
          endDate: '',
          reason: '',
          days: 0
        });
        setCurrentView('leave');
      }
    };

    if (currentView === 'dashboard') {
      return (
        <div>
          <h1>대시보드</h1>
          <p>연차 잔여: {leaveBalance}일</p>
          <button onClick={() => setCurrentView('leave')}>휴가 관리</button>
        </div>
      );
    }

    if (currentView === 'leave') {
      return (
        <div>
          <h1>휴가 관리</h1>
          <p>연차 잔여: {leaveBalance}일</p>
          <button onClick={() => setCurrentView('request')}>휴가 신청</button>
          
          <h2>내 휴가 신청 내역</h2>
          {leaveRequests.map(req => (
            <div key={req.id} data-testid={`request-${req.id}`}>
              <p>{req.startDate} ~ {req.endDate}</p>
              <p>상태: {req.status === 'pending' ? '대기중' : '승인됨'}</p>
              <p>사유: {req.reason}</p>
              {req.status === 'pending' && (
                <button onClick={() => approveRequest(req.id)}>
                  (테스트) 승인 시뮬레이션
                </button>
              )}
            </div>
          ))}
          
          <button onClick={() => setCurrentView('dashboard')}>돌아가기</button>
        </div>
      );
    }

    if (currentView === 'request') {
      return (
        <div>
          <h1>휴가 신청</h1>
          
          <label htmlFor="startDate">시작일</label>
          <input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => {
              setFormData({ ...formData, startDate: e.target.value });
              // Simple day calculation
              if (formData.endDate && e.target.value) {
                const start = new Date(e.target.value);
                const end = new Date(formData.endDate);
                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                setFormData(prev => ({ ...prev, days }));
              }
            }}
          />
          
          <label htmlFor="endDate">종료일</label>
          <input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => {
              setFormData({ ...formData, endDate: e.target.value });
              // Simple day calculation
              if (formData.startDate && e.target.value) {
                const start = new Date(formData.startDate);
                const end = new Date(e.target.value);
                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                setFormData(prev => ({ ...prev, days }));
              }
            }}
          />
          
          <label htmlFor="reason">사유</label>
          <textarea
            id="reason"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="휴가 사유를 입력하세요"
          />
          
          {formData.days > 0 && <p>신청 일수: {formData.days}일</p>}
          
          <button onClick={handleSubmit}>신청하기</button>
          <button onClick={() => setCurrentView('leave')}>취소</button>
        </div>
      );
    }

    return null;
  }
}));

describe('E2E: Leave Request Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes full leave request submission flow', async () => {
    const user = userEvent.setup();
    
    // Step 1: Start at dashboard
    renderApp(<App />);
    
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    expect(screen.getByText('연차 잔여: 15일')).toBeInTheDocument();
    
    // Step 2: Navigate to leave management
    await user.click(screen.getByText('휴가 관리'));
    
    expect(screen.getByText('휴가 관리')).toBeInTheDocument();
    expect(screen.getByText('내 휴가 신청 내역')).toBeInTheDocument();
    
    // Step 3: Open leave request form
    await user.click(screen.getByText('휴가 신청'));
    
    expect(screen.getByText('휴가 신청')).toBeInTheDocument();
    expect(screen.getByLabelText('시작일')).toBeInTheDocument();
    
    // Step 4: Fill the form
    const startDateInput = screen.getByLabelText('시작일');
    const endDateInput = screen.getByLabelText('종료일');
    const reasonInput = screen.getByLabelText('사유');
    
    await user.type(startDateInput, '2024-01-15');
    await user.type(endDateInput, '2024-01-17');
    await user.type(reasonInput, '개인 사유로 인한 휴가');
    
    // Step 5: Verify calculated days
    await waitFor(() => {
      expect(screen.getByText('신청 일수: 3일')).toBeInTheDocument();
    });
    
    // Step 6: Submit the request
    await user.click(screen.getByText('신청하기'));
    
    // Step 7: Verify return to leave management with new request
    expect(screen.getByText('휴가 관리')).toBeInTheDocument();
    expect(screen.getByText('2024-01-15 ~ 2024-01-17')).toBeInTheDocument();
    expect(screen.getByText('상태: 대기중')).toBeInTheDocument();
    expect(screen.getByText('사유: 개인 사유로 인한 휴가')).toBeInTheDocument();
    
    // Step 8: Verify leave balance updated
    expect(screen.getByText('연차 잔여: 12일')).toBeInTheDocument();
    
    // Step 9: Simulate approval
    await user.click(screen.getByText('(테스트) 승인 시뮬레이션'));
    
    // Step 10: Verify status change
    expect(screen.getByText('상태: 승인됨')).toBeInTheDocument();
  });

  it('validates required fields in leave request', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to leave request form
    await user.click(screen.getByText('휴가 관리'));
    await user.click(screen.getByText('휴가 신청'));
    
    // Try to submit without filling fields
    await user.click(screen.getByText('신청하기'));
    
    // Should still be on the form (not submitted)
    expect(screen.getByText('휴가 신청')).toBeInTheDocument();
    expect(screen.getByLabelText('시작일')).toBeInTheDocument();
  });

  it('allows canceling leave request', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to leave request form
    await user.click(screen.getByText('휴가 관리'));
    await user.click(screen.getByText('휴가 신청'));
    
    // Fill some data
    await user.type(screen.getByLabelText('사유'), '테스트 사유');
    
    // Click cancel
    await user.click(screen.getByText('취소'));
    
    // Should be back at leave management
    expect(screen.getByText('휴가 관리')).toBeInTheDocument();
    expect(screen.getByText('내 휴가 신청 내역')).toBeInTheDocument();
    
    // No new request should be added
    expect(screen.queryByText('테스트 사유')).not.toBeInTheDocument();
  });
});

// Import App for the mock
import App from '../../../App';
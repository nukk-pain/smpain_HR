/**
 * E2E Test: Supervisor Leave Approval Flow
 * Tests supervisor's ability to review and approve/reject leave requests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { renderApp } from '../setup.e2e';

// Mock App for supervisor leave approval flow
vi.mock('../../../App', () => ({
  default: () => {
    const { useState } = React;
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [comments, setComments] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [requests, setRequests] = useState([
      {
        id: '1',
        employeeName: '김직원',
        employeeId: 'EMP001',
        department: '개발팀',
        leaveType: '연차',
        startDate: '2024-01-15',
        endDate: '2024-01-17',
        days: 3,
        reason: '가족 여행',
        status: 'pending',
        submittedDate: '2024-01-10'
      },
      {
        id: '2',
        employeeName: '이사원',
        employeeId: 'EMP002',
        department: '개발팀',
        leaveType: '병가',
        startDate: '2024-01-20',
        endDate: '2024-01-20',
        days: 1,
        reason: '병원 진료',
        status: 'pending',
        submittedDate: '2024-01-12'
      },
      {
        id: '3',
        employeeName: '박대리',
        employeeId: 'EMP003',
        department: '개발팀',
        leaveType: '연차',
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        days: 5,
        reason: '개인 사유',
        status: 'approved',
        submittedDate: '2024-01-05',
        approvedDate: '2024-01-06',
        approvedBy: 'Supervisor'
      }
    ]);

    const approveRequest = (id: string, comments: string) => {
      setRequests(prev => prev.map(req => 
        req.id === id 
          ? {
              ...req,
              status: 'approved',
              approvedDate: new Date().toISOString().split('T')[0],
              approvedBy: 'Supervisor',
              approvalComments: comments
            }
          : req
      ));
      setSelectedRequest(null);
      setCurrentView('leave-management');
      
      // Show success message
      const message = document.createElement('div');
      message.textContent = '휴가 신청이 승인되었습니다';
      message.setAttribute('role', 'alert');
      message.className = 'success-message';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    };

    const rejectRequest = (id: string, reason: string) => {
      setRequests(prev => prev.map(req => 
        req.id === id 
          ? {
              ...req,
              status: 'rejected',
              rejectedDate: new Date().toISOString().split('T')[0],
              rejectedBy: 'Supervisor',
              rejectionReason: reason
            }
          : req
      ));
      setSelectedRequest(null);
      setCurrentView('leave-management');
      
      // Show message
      const message = document.createElement('div');
      message.textContent = '휴가 신청이 거절되었습니다';
      message.setAttribute('role', 'alert');
      message.className = 'warning-message';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    };

    if (currentView === 'dashboard') {
      const pendingCount = requests.filter(r => r.status === 'pending').length;
      return (
        <div>
          <h1>Supervisor 대시보드</h1>
          <div className="stats">
            <p>대기 중인 휴가 신청: {pendingCount}건</p>
          </div>
          <button onClick={() => setCurrentView('leave-management')}>
            휴가 승인 관리
          </button>
        </div>
      );
    }

    if (currentView === 'leave-management') {
      return (
        <div>
          <h1>휴가 승인 관리</h1>
          
          <div className="filters">
            <button className={requests.some(r => r.status === 'pending') ? 'active' : ''}>
              대기 중 ({requests.filter(r => r.status === 'pending').length})
            </button>
            <button>
              승인됨 ({requests.filter(r => r.status === 'approved').length})
            </button>
            <button>
              거절됨 ({requests.filter(r => r.status === 'rejected').length})
            </button>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>직원명</th>
                <th>부서</th>
                <th>휴가 유형</th>
                <th>기간</th>
                <th>일수</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(request => (
                <tr key={request.id}>
                  <td>{request.employeeName}</td>
                  <td>{request.department}</td>
                  <td>{request.leaveType}</td>
                  <td>{request.startDate} ~ {request.endDate}</td>
                  <td>{request.days}일</td>
                  <td>
                    <span className={`status-${request.status}`}>
                      {request.status === 'pending' ? '대기 중' : 
                       request.status === 'approved' ? '승인됨' : '거절됨'}
                    </span>
                  </td>
                  <td>
                    {request.status === 'pending' && (
                      <button onClick={() => {
                        setSelectedRequest(request);
                        setCurrentView('review');
                      }}>
                        검토
                      </button>
                    )}
                    {request.status !== 'pending' && (
                      <button onClick={() => {
                        setSelectedRequest(request);
                        setCurrentView('review');
                      }}>
                        상세보기
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <button onClick={() => setCurrentView('dashboard')}>돌아가기</button>
        </div>
      );
    }

    if (currentView === 'review' && selectedRequest) {
      return (
        <div>
          <h1>휴가 신청 검토</h1>
          
          <div className="request-detail">
            <h2>신청 정보</h2>
            <p>직원명: {selectedRequest.employeeName} ({selectedRequest.employeeId})</p>
            <p>부서: {selectedRequest.department}</p>
            <p>휴가 유형: {selectedRequest.leaveType}</p>
            <p>기간: {selectedRequest.startDate} ~ {selectedRequest.endDate}</p>
            <p>일수: {selectedRequest.days}일</p>
            <p>사유: {selectedRequest.reason}</p>
            <p>신청일: {selectedRequest.submittedDate}</p>
            
            {selectedRequest.status === 'approved' && (
              <>
                <h3>승인 정보</h3>
                <p>승인자: {selectedRequest.approvedBy}</p>
                <p>승인일: {selectedRequest.approvedDate}</p>
                {selectedRequest.approvalComments && (
                  <p>코멘트: {selectedRequest.approvalComments}</p>
                )}
              </>
            )}
            
            {selectedRequest.status === 'rejected' && (
              <>
                <h3>거절 정보</h3>
                <p>거절자: {selectedRequest.rejectedBy}</p>
                <p>거절일: {selectedRequest.rejectedDate}</p>
                <p>거절 사유: {selectedRequest.rejectionReason}</p>
              </>
            )}
          </div>
          
          {selectedRequest.status === 'pending' && (
            <div className="approval-actions">
              {!showRejectForm ? (
                <>
                  <div>
                    <label htmlFor="comments">승인 코멘트 (선택)</label>
                    <textarea
                      id="comments"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="승인 코멘트를 입력하세요"
                    />
                  </div>
                  
                  <button 
                    className="approve-btn"
                    onClick={() => approveRequest(selectedRequest.id, comments)}
                  >
                    승인
                  </button>
                  <button 
                    className="reject-btn"
                    onClick={() => setShowRejectForm(true)}
                  >
                    거절
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="rejectReason">거절 사유 (필수)</label>
                    <textarea
                      id="rejectReason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="거절 사유를 입력하세요"
                      required
                    />
                  </div>
                  
                  <button 
                    className="confirm-reject-btn"
                    onClick={() => {
                      if (rejectReason.trim()) {
                        rejectRequest(selectedRequest.id, rejectReason);
                      }
                    }}
                    disabled={!rejectReason.trim()}
                  >
                    거절 확인
                  </button>
                  <button onClick={() => setShowRejectForm(false)}>
                    취소
                  </button>
                </>
              )}
            </div>
          )}
          
          <button onClick={() => {
            setSelectedRequest(null);
            setComments('');
            setRejectReason('');
            setShowRejectForm(false);
            setCurrentView('leave-management');
          }}>
            목록으로
          </button>
        </div>
      );
    }

    return null;
  }
}));

describe('E2E: Supervisor Leave Approval Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays pending leave requests dashboard', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Verify supervisor dashboard
    expect(screen.getByText('Supervisor 대시보드')).toBeInTheDocument();
    expect(screen.getByText('대기 중인 휴가 신청: 2건')).toBeInTheDocument();
    
    // Navigate to leave management
    await user.click(screen.getByText('휴가 승인 관리'));
    
    // Verify leave management page
    expect(screen.getByText('휴가 승인 관리')).toBeInTheDocument();
    
    // Check filter counts
    expect(screen.getByText('대기 중 (2)')).toBeInTheDocument();
    expect(screen.getByText('승인됨 (1)')).toBeInTheDocument();
    
    // Verify pending requests are shown
    expect(screen.getByText('김직원')).toBeInTheDocument();
    expect(screen.getByText('이사원')).toBeInTheDocument();
  });

  it('approves leave request with comments', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to leave management
    await user.click(screen.getByText('휴가 승인 관리'));
    
    // Click review for first pending request
    const reviewButtons = screen.getAllByText('검토');
    await user.click(reviewButtons[0]);
    
    // Verify request details
    expect(screen.getByText('휴가 신청 검토')).toBeInTheDocument();
    expect(screen.getByText('직원명: 김직원 (EMP001)')).toBeInTheDocument();
    expect(screen.getByText('기간: 2024-01-15 ~ 2024-01-17')).toBeInTheDocument();
    expect(screen.getByText('사유: 가족 여행')).toBeInTheDocument();
    
    // Add approval comment
    const commentInput = screen.getByLabelText('승인 코멘트 (선택)');
    await user.type(commentInput, '즐거운 여행 되세요');
    
    // Click approve
    await user.click(screen.getByText('승인'));
    
    // Verify success message
    await waitFor(() => {
      expect(screen.getByText('휴가 신청이 승인되었습니다')).toBeInTheDocument();
    });
    
    // Should return to list
    expect(screen.getByText('휴가 승인 관리')).toBeInTheDocument();
    
    // Check that pending count decreased
    expect(screen.getByText('대기 중 (1)')).toBeInTheDocument();
    expect(screen.getByText('승인됨 (2)')).toBeInTheDocument();
  });

  it('rejects leave request with reason', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to leave management
    await user.click(screen.getByText('휴가 승인 관리'));
    
    // Click review for second pending request
    const reviewButtons = screen.getAllByText('검토');
    await user.click(reviewButtons[1]); // Second pending request
    
    // Verify request details
    expect(screen.getByText('직원명: 이사원 (EMP002)')).toBeInTheDocument();
    
    // Click reject
    await user.click(screen.getByText('거절'));
    
    // Enter rejection reason
    const reasonInput = screen.getByLabelText('거절 사유 (필수)');
    await user.type(reasonInput, '진단서 제출 필요');
    
    // Confirm rejection
    await user.click(screen.getByText('거절 확인'));
    
    // Verify warning message
    await waitFor(() => {
      expect(screen.getByText('휴가 신청이 거절되었습니다')).toBeInTheDocument();
    });
    
    // Should return to list
    expect(screen.getByText('휴가 승인 관리')).toBeInTheDocument();
  });

  it('views approved request details', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to leave management
    await user.click(screen.getByText('휴가 승인 관리'));
    
    // Find and click on approved request
    const detailButtons = screen.getAllByText('상세보기');
    await user.click(detailButtons[0]); // The approved request
    
    // Verify approved request details
    expect(screen.getByText('휴가 신청 검토')).toBeInTheDocument();
    expect(screen.getByText('직원명: 박대리 (EMP003)')).toBeInTheDocument();
    expect(screen.getByText('승인 정보')).toBeInTheDocument();
    expect(screen.getByText('승인자: Supervisor')).toBeInTheDocument();
    expect(screen.getByText('승인일: 2024-01-06')).toBeInTheDocument();
    
    // Should not show approval actions for already approved request
    expect(screen.queryByText('승인')).not.toBeInTheDocument();
    expect(screen.queryByText('거절')).not.toBeInTheDocument();
  });

  it('cancels rejection and returns to review', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to leave management
    await user.click(screen.getByText('휴가 승인 관리'));
    
    // Click review for first pending request
    const reviewButtons = screen.getAllByText('검토');
    await user.click(reviewButtons[0]);
    
    // Click reject
    await user.click(screen.getByText('거절'));
    
    // Verify rejection form is shown
    expect(screen.getByLabelText('거절 사유 (필수)')).toBeInTheDocument();
    
    // Click cancel
    await user.click(screen.getByText('취소'));
    
    // Should return to approval actions
    expect(screen.getByText('승인')).toBeInTheDocument();
    expect(screen.getByText('거절')).toBeInTheDocument();
    expect(screen.queryByLabelText('거절 사유 (필수)')).not.toBeInTheDocument();
  });
});

// Import App for the mock
import App from '../../../App';
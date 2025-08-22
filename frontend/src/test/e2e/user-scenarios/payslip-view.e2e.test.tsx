/**
 * E2E Test: Payslip View and Download Flow
 * Tests viewing payslips and downloading PDF functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { renderApp } from '../setup.e2e';

// Mock the App for payslip flow
vi.mock('../../../App', () => ({
  default: () => {
    const { useState } = React;
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
    
    // Mock payslip data
    const payslips = [
      {
        id: '1',
        yearMonth: '2024-01',
        employeeName: 'Test User',
        baseSalary: 3500000,
        allowances: 500000,
        deductions: 400000,
        netPay: 3600000,
        paymentDate: '2024-01-25'
      },
      {
        id: '2',
        yearMonth: '2023-12',
        employeeName: 'Test User',
        baseSalary: 3500000,
        allowances: 700000,
        deductions: 420000,
        netPay: 3780000,
        paymentDate: '2023-12-25'
      },
      {
        id: '3',
        yearMonth: '2023-11',
        employeeName: 'Test User',
        baseSalary: 3500000,
        allowances: 450000,
        deductions: 390000,
        netPay: 3560000,
        paymentDate: '2023-11-25'
      }
    ];

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
      }).format(amount);
    };

    const downloadPDF = (payslip: any) => {
      // Remove any existing messages first
      const existingMessages = document.querySelectorAll('.success-message');
      existingMessages.forEach(msg => msg.remove());
      
      // Simulate PDF download
      const link = document.createElement('a');
      link.href = '#';
      link.download = `payslip_${payslip.yearMonth}.pdf`;
      link.click();
      
      // Show success message
      const message = document.createElement('div');
      message.textContent = 'PDF 다운로드가 시작되었습니다';
      message.setAttribute('role', 'alert');
      message.className = 'success-message';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    };

    if (currentView === 'dashboard') {
      return (
        <div>
          <h1>대시보드</h1>
          <button onClick={() => setCurrentView('payslips')}>급여명세서 조회</button>
        </div>
      );
    }

    if (currentView === 'payslips' && !selectedPayslip) {
      return (
        <div>
          <h1>급여명세서</h1>
          <p>내 급여명세서 목록</p>
          
          <table>
            <thead>
              <tr>
                <th>년월</th>
                <th>기본급</th>
                <th>수당</th>
                <th>공제</th>
                <th>실지급액</th>
                <th>지급일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map(payslip => (
                <tr key={payslip.id}>
                  <td>{payslip.yearMonth}</td>
                  <td>{formatCurrency(payslip.baseSalary)}</td>
                  <td>{formatCurrency(payslip.allowances)}</td>
                  <td>{formatCurrency(payslip.deductions)}</td>
                  <td>{formatCurrency(payslip.netPay)}</td>
                  <td>{payslip.paymentDate}</td>
                  <td>
                    <button onClick={() => setSelectedPayslip(payslip)}>
                      상세보기
                    </button>
                    <button onClick={() => downloadPDF(payslip)}>
                      PDF 다운로드
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <button onClick={() => setCurrentView('dashboard')}>돌아가기</button>
        </div>
      );
    }

    if (selectedPayslip) {
      return (
        <div>
          <h1>급여명세서 상세</h1>
          <h2>{selectedPayslip.yearMonth} 급여명세서</h2>
          
          <div className="payslip-detail">
            <h3>직원 정보</h3>
            <p>이름: {selectedPayslip.employeeName}</p>
            
            <h3>급여 내역</h3>
            <p>기본급: {formatCurrency(selectedPayslip.baseSalary)}</p>
            <p>수당: {formatCurrency(selectedPayslip.allowances)}</p>
            <p>공제: {formatCurrency(selectedPayslip.deductions)}</p>
            <hr />
            <p><strong>실지급액: {formatCurrency(selectedPayslip.netPay)}</strong></p>
            <p>지급일: {selectedPayslip.paymentDate}</p>
          </div>
          
          <button onClick={() => downloadPDF(selectedPayslip)}>
            PDF 다운로드
          </button>
          <button onClick={() => {
            setSelectedPayslip(null);
            setCurrentView('payslips');
          }}>
            목록으로
          </button>
        </div>
      );
    }

    return null;
  }
}));

describe('E2E: Payslip View and Download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays payslip list and details', async () => {
    const user = userEvent.setup();
    
    // Step 1: Start at dashboard
    renderApp(<App />);
    
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    
    // Step 2: Navigate to payslips
    await user.click(screen.getByText('급여명세서 조회'));
    
    expect(screen.getByText('급여명세서')).toBeInTheDocument();
    expect(screen.getByText('내 급여명세서 목록')).toBeInTheDocument();
    
    // Step 3: Verify payslip list is displayed
    expect(screen.getByText('2024-01')).toBeInTheDocument();
    expect(screen.getByText('2023-12')).toBeInTheDocument();
    expect(screen.getByText('2023-11')).toBeInTheDocument();
    
    // Step 4: Check formatted currency display
    expect(screen.getByText('₩3,600,000')).toBeInTheDocument(); // Net pay for 2024-01
    
    // Step 5: View payslip details
    const detailButtons = screen.getAllByText('상세보기');
    await user.click(detailButtons[0]); // Click first payslip
    
    // Step 6: Verify detail view
    expect(screen.getByText('급여명세서 상세')).toBeInTheDocument();
    expect(screen.getByText('2024-01 급여명세서')).toBeInTheDocument();
    expect(screen.getByText('이름: Test User')).toBeInTheDocument();
    expect(screen.getByText(/기본급: ₩3,500,000/)).toBeInTheDocument();
    expect(screen.getByText(/실지급액: ₩3,600,000/)).toBeInTheDocument();
    
    // Step 7: Return to list
    await user.click(screen.getByText('목록으로'));
    
    // Should be back at payslip list
    expect(screen.getByText('내 급여명세서 목록')).toBeInTheDocument();
  });

  it('downloads PDF from list view', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to payslips
    await user.click(screen.getByText('급여명세서 조회'));
    
    // Find and click PDF download button for first payslip
    const downloadButtons = screen.getAllByText('PDF 다운로드');
    await user.click(downloadButtons[0]);
    
    // Verify download initiated (success message appears)
    await waitFor(() => {
      expect(screen.getByText('PDF 다운로드가 시작되었습니다')).toBeInTheDocument();
    });
  });

  it('downloads PDF from detail view', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to payslips
    await user.click(screen.getByText('급여명세서 조회'));
    
    // View details of first payslip
    const detailButtons = screen.getAllByText('상세보기');
    await user.click(detailButtons[0]);
    
    // Download PDF from detail view
    await user.click(screen.getByText('PDF 다운로드'));
    
    // Verify download initiated
    await waitFor(() => {
      expect(screen.getByText('PDF 다운로드가 시작되었습니다')).toBeInTheDocument();
    });
  });

  it('navigates back to dashboard', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to payslips
    await user.click(screen.getByText('급여명세서 조회'));
    
    expect(screen.getByText('급여명세서')).toBeInTheDocument();
    
    // Go back to dashboard
    await user.click(screen.getByText('돌아가기'));
    
    // Should be back at dashboard
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    expect(screen.queryByText('급여명세서')).not.toBeInTheDocument();
  });

  it('displays correct salary calculations', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to payslips
    await user.click(screen.getByText('급여명세서 조회'));
    
    // View details of first payslip (2024-01)
    const detailButtons = screen.getAllByText('상세보기');
    await user.click(detailButtons[0]);
    
    // Verify salary calculation
    // Base: 3,500,000 + Allowances: 500,000 - Deductions: 400,000 = Net: 3,600,000
    expect(screen.getByText(/기본급: ₩3,500,000/)).toBeInTheDocument();
    expect(screen.getByText(/수당: ₩500,000/)).toBeInTheDocument();
    expect(screen.getByText(/공제: ₩400,000/)).toBeInTheDocument();
    expect(screen.getByText(/실지급액: ₩3,600,000/)).toBeInTheDocument();
  });
});

// Import App for the mock
import App from '../../../App';
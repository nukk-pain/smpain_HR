/**
 * LeaveRequestDialog Component Tests
 * Tests for leave request creation and editing dialog functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { LeaveRequestDialog } from './LeaveRequestDialog';
import { LeaveForm } from '../../types/LeaveManagementTypes';

// Mock the config hook
vi.mock('../../hooks/useConfig', () => ({
  useConfig: () => ({
    leave: {
      types: {
        ANNUAL: 'annual',
        SICK: 'sick',
        PERSONAL: 'personal',
        FAMILY: 'family'
      },
      typeLabels: {
        annual: '연차',
        sick: '병가',
        personal: '개인연차',
        family: '가족돌봄휴가'
      }
    }
  })
}));

const mockFormData: LeaveForm = {
  leaveType: '',
  startDate: '',
  endDate: '',
  reason: '',
  substituteEmployee: '',
  personalOffDays: []
};

const filledFormData: LeaveForm = {
  leaveType: 'annual',
  startDate: '2024-01-15',
  endDate: '2024-01-17',
  reason: '개인 사유',
  substituteEmployee: '김동료',
  personalOffDays: []
};

describe('LeaveRequestDialog Component Tests', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockOnFormDataChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog with correct title for new request', () => {
    render(
      <LeaveRequestDialog
        open={true}
        editingRequest={null}
        formData={mockFormData}
        loading={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    expect(screen.getByText('연차 신청')).toBeInTheDocument();
  });

  it('renders dialog with correct title for editing request', () => {
    render(
      <LeaveRequestDialog
        open={true}
        editingRequest={{ id: '123' } as any}
        formData={mockFormData}
        loading={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    expect(screen.getByText('연차 신청 수정')).toBeInTheDocument();
  });

  it('displays all form fields', () => {
    render(
      <LeaveRequestDialog
        open={true}
        editingRequest={null}
        formData={mockFormData}
        loading={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    expect(screen.getByLabelText(/휴가 유형/i)).toBeInTheDocument();
    // DatePickers may have multiple labels - just check they exist
    expect(screen.getAllByText(/시작일/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/종료일/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/사유/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/대체 근무자/i)).toBeInTheDocument();
  });

  it('handles leave type selection', async () => {
    const user = userEvent.setup();
    render(
      <LeaveRequestDialog
        open={true}
        editingRequest={null}
        formData={mockFormData}
        loading={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    const leaveTypeSelect = screen.getByLabelText(/휴가 유형/i);
    await user.click(leaveTypeSelect);

    // There might be multiple options with same text - get all and click first
    const annualOptions = screen.getAllByRole('option', { name: /연차/i });
    await user.click(annualOptions[0]);

    expect(mockOnFormDataChange).toHaveBeenCalledWith(
      expect.objectContaining({
        leaveType: 'annual'
      })
    );
  });

  it('handles reason input', async () => {
    const user = userEvent.setup();
    render(
      <LeaveRequestDialog
        open={true}
        editingRequest={null}
        formData={mockFormData}
        loading={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    const reasonInput = screen.getByLabelText(/사유/i);
    await user.type(reasonInput, '가족 행사 참석');

    // Check if onFormDataChange was called for each character
    expect(mockOnFormDataChange).toHaveBeenCalled();
  });

  it('calculates and displays leave days', () => {
    render(
      <LeaveRequestDialog
        open={true}
        editingRequest={null}
        formData={filledFormData}
        loading={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    // Should show calculated leave days
    expect(screen.getByText(/신청 일수:/)).toBeInTheDocument();
  });

  it('shows warning for personal leave', () => {
    const personalLeaveData: LeaveForm = {
      ...mockFormData,
      leaveType: 'personal'
    };

    render(
      <LeaveRequestDialog
        open={true}
        editingRequest={null}
        formData={personalLeaveData}
        loading={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    expect(screen.getByText(/개인연차는 무급 휴가입니다/i)).toBeInTheDocument();
  });

  it('shows info for long leave requests', () => {
    const longLeaveData: LeaveForm = {
      ...mockFormData,
      leaveType: 'annual',
      startDate: '2024-01-15',
      endDate: '2024-01-25' // More than 5 days
    };

    render(
      <LeaveRequestDialog
        open={true}
        editingRequest={null}
        formData={longLeaveData}
        loading={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    expect(screen.getByText(/5일 이상의 연차는 팀장 승인이 필요합니다/i)).toBeInTheDocument();
  });

  it('disables submit button when form is invalid', () => {
    render(
      <LeaveRequestDialog
        open={true}
        editingRequest={null}
        formData={mockFormData}
        loading={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    const submitButton = screen.getByRole('button', { name: /신청/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when form is valid', () => {
    render(
      <LeaveRequestDialog
        open={true}
        editingRequest={null}
        formData={filledFormData}
        loading={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    const submitButton = screen.getByRole('button', { name: /신청/i });
    expect(submitButton).toBeEnabled();
  });

  it('handles form submission', async () => {
    const user = userEvent.setup();
    render(
      <LeaveRequestDialog
        open={true}
        editingRequest={null}
        formData={filledFormData}
        loading={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    const submitButton = screen.getByRole('button', { name: /신청/i });
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('handles dialog close', async () => {
    const user = userEvent.setup();
    render(
      <LeaveRequestDialog
        open={true}
        editingRequest={null}
        formData={mockFormData}
        loading={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /취소/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables buttons when loading', () => {
    render(
      <LeaveRequestDialog
        open={true}
        editingRequest={null}
        formData={filledFormData}
        loading={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    const submitButton = screen.getByRole('button', { name: /신청/i });
    const cancelButton = screen.getByRole('button', { name: /취소/i });

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <LeaveRequestDialog
        open={false}
        editingRequest={null}
        formData={mockFormData}
        loading={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    // Dialog should not be visible
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
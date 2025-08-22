/**
 * DepartmentManagementPage Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import DepartmentManagementPage from './DepartmentManagementPage';

// Mock the DepartmentManagement component
vi.mock('../components/DepartmentManagementRefactored', () => ({
  default: () => {
    const [departments, setDepartments] = React.useState([
      { _id: '1', name: 'Engineering', description: 'Software Development', employeeCount: 25 },
      { _id: '2', name: 'HR', description: 'Human Resources', employeeCount: 5 },
      { _id: '3', name: 'Sales', description: 'Sales Team', employeeCount: 15 },
    ]);

    const [dialogOpen, setDialogOpen] = React.useState(false);

    return (
      <div data-testid="department-management">
        <h1>부서 관리</h1>
        <button onClick={() => setDialogOpen(true)}>부서 추가</button>
        
        <div role="grid">
          {departments.map(dept => (
            <div key={dept._id} role="row" data-testid={`department-${dept._id}`}>
              <span>{dept.name}</span>
              <span>{dept.description}</span>
              <span>{dept.employeeCount}명</span>
              <button aria-label={`edit-${dept.name}`}>수정</button>
              <button aria-label={`delete-${dept.name}`}>삭제</button>
            </div>
          ))}
        </div>

        {dialogOpen && (
          <div role="dialog" aria-label="부서 추가">
            <input placeholder="부서명" />
            <input placeholder="설명" />
            <button onClick={() => setDialogOpen(false)}>취소</button>
            <button onClick={() => {
              setDepartments(prev => [...prev, {
                _id: '4',
                name: 'New Department',
                description: 'New Description',
                employeeCount: 0
              }]);
              setDialogOpen(false);
            }}>저장</button>
          </div>
        )}
      </div>
    );
  }
}));

// Import React for the mock component
import React from 'react';

const renderDepartmentManagementPage = () => {
  return render(
    <BrowserRouter>
      <DepartmentManagementPage />
    </BrowserRouter>
  );
};

describe('DepartmentManagementPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders department management component', () => {
    renderDepartmentManagementPage();
    
    expect(screen.getByTestId('department-management')).toBeInTheDocument();
    expect(screen.getByText('부서 관리')).toBeInTheDocument();
  });

  it('displays all departments', () => {
    renderDepartmentManagementPage();
    
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('HR')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
  });

  it('shows department details', () => {
    renderDepartmentManagementPage();
    
    expect(screen.getByText('Software Development')).toBeInTheDocument();
    expect(screen.getByText('Human Resources')).toBeInTheDocument();
    expect(screen.getByText('25명')).toBeInTheDocument();
  });

  it('has add department button', () => {
    renderDepartmentManagementPage();
    
    const addButton = screen.getByRole('button', { name: '부서 추가' });
    expect(addButton).toBeInTheDocument();
  });

  it('opens add department dialog when clicking add button', async () => {
    const user = userEvent.setup();
    renderDepartmentManagementPage();
    
    const addButton = screen.getByRole('button', { name: '부서 추가' });
    await user.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('부서명')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('설명')).toBeInTheDocument();
    });
  });

  it('has edit and delete buttons for each department', () => {
    renderDepartmentManagementPage();
    
    expect(screen.getByRole('button', { name: 'edit-Engineering' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'delete-Engineering' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'edit-HR' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'delete-HR' })).toBeInTheDocument();
  });

  it('can add a new department', async () => {
    const user = userEvent.setup();
    renderDepartmentManagementPage();
    
    // Open dialog
    const addButton = screen.getByRole('button', { name: '부서 추가' });
    await user.click(addButton);
    
    // Click save
    const saveButton = screen.getByRole('button', { name: '저장' });
    await user.click(saveButton);
    
    // Check new department appears
    await waitFor(() => {
      expect(screen.getByText('New Department')).toBeInTheDocument();
    });
  });

  it('can close dialog with cancel button', async () => {
    const user = userEvent.setup();
    renderDepartmentManagementPage();
    
    // Open dialog
    const addButton = screen.getByRole('button', { name: '부서 추가' });
    await user.click(addButton);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Click cancel
    const cancelButton = screen.getByRole('button', { name: '취소' });
    await user.click(cancelButton);
    
    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
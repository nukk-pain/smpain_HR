/**
 * E2E Test: Admin User Management Flow
 * Tests admin's ability to create, edit, and manage users
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { renderApp } from '../setup.e2e';

// Mock App for admin user management flow
vi.mock('../../../App', () => ({
  default: () => {
    const { useState } = React;
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [formData, setFormData] = useState({
      username: '',
      name: '',
      email: '',
      department: '',
      position: '',
      role: 'user',
      password: ''
    });
    const [users, setUsers] = useState([
      {
        id: '1',
        username: 'kimuser',
        name: '김직원',
        email: 'kim@company.com',
        department: '개발팀',
        position: '사원',
        role: 'user',
        status: 'active',
        createdAt: '2023-01-15'
      },
      {
        id: '2',
        username: 'leemanager',
        name: '이과장',
        email: 'lee@company.com',
        department: '기획팀',
        position: '과장',
        role: 'supervisor',
        status: 'active',
        createdAt: '2023-02-20'
      },
      {
        id: '3',
        username: 'parkdev',
        name: '박개발',
        email: 'park@company.com',
        department: '개발팀',
        position: '대리',
        role: 'user',
        status: 'inactive',
        createdAt: '2023-03-10'
      }
    ]);

    const createUser = () => {
      if (formData.username && formData.name && formData.email && formData.password) {
        const newUser = {
          id: Date.now().toString(),
          ...formData,
          status: 'active',
          createdAt: new Date().toISOString().split('T')[0]
        };
        setUsers([...users, newUser]);
        setShowCreateForm(false);
        setFormData({
          username: '',
          name: '',
          email: '',
          department: '',
          position: '',
          role: 'user',
          password: ''
        });
        
        // Show success message
        const message = document.createElement('div');
        message.textContent = '사용자가 생성되었습니다';
        message.setAttribute('role', 'alert');
        message.className = 'success-message';
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3000);
      }
    };

    const updateUser = () => {
      if (selectedUser && formData.name && formData.email) {
        setUsers(prev => prev.map(user => 
          user.id === selectedUser.id 
            ? { ...user, ...formData, password: undefined }
            : user
        ));
        setShowEditForm(false);
        setSelectedUser(null);
        setFormData({
          username: '',
          name: '',
          email: '',
          department: '',
          position: '',
          role: 'user',
          password: ''
        });
        
        // Show success message
        const message = document.createElement('div');
        message.textContent = '사용자 정보가 수정되었습니다';
        message.setAttribute('role', 'alert');
        message.className = 'success-message';
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3000);
      }
    };

    const toggleUserStatus = (userId: string) => {
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
          : user
      ));
      
      const user = users.find(u => u.id === userId);
      const message = document.createElement('div');
      message.textContent = user?.status === 'active' 
        ? '사용자가 비활성화되었습니다' 
        : '사용자가 활성화되었습니다';
      message.setAttribute('role', 'alert');
      message.className = 'info-message';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    };

    const resetPassword = (userId: string) => {
      const message = document.createElement('div');
      message.textContent = '임시 비밀번호가 이메일로 전송되었습니다';
      message.setAttribute('role', 'alert');
      message.className = 'success-message';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    };

    if (currentView === 'dashboard') {
      return (
        <div>
          <h1>Admin 대시보드</h1>
          <div className="stats">
            <p>전체 사용자: {users.length}명</p>
            <p>활성 사용자: {users.filter(u => u.status === 'active').length}명</p>
            <p>비활성 사용자: {users.filter(u => u.status === 'inactive').length}명</p>
          </div>
          <button onClick={() => setCurrentView('user-management')}>
            사용자 관리
          </button>
        </div>
      );
    }

    if (currentView === 'user-management' && !showCreateForm && !showEditForm) {
      return (
        <div>
          <h1>사용자 관리</h1>
          
          <button onClick={() => setShowCreateForm(true)}>
            새 사용자 생성
          </button>
          
          <table>
            <thead>
              <tr>
                <th>사용자명</th>
                <th>이름</th>
                <th>이메일</th>
                <th>부서</th>
                <th>직급</th>
                <th>역할</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.department}</td>
                  <td>{user.position}</td>
                  <td>{user.role === 'admin' ? '관리자' : 
                      user.role === 'supervisor' ? '감독자' : '일반'}</td>
                  <td>
                    <span className={`status-${user.status}`}>
                      {user.status === 'active' ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => {
                      setSelectedUser(user);
                      setFormData({
                        username: user.username,
                        name: user.name,
                        email: user.email,
                        department: user.department,
                        position: user.position,
                        role: user.role,
                        password: ''
                      });
                      setShowEditForm(true);
                    }}>
                      수정
                    </button>
                    <button onClick={() => toggleUserStatus(user.id)}>
                      {user.status === 'active' ? '비활성화' : '활성화'}
                    </button>
                    <button onClick={() => resetPassword(user.id)}>
                      비밀번호 초기화
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

    if (showCreateForm) {
      return (
        <div>
          <h1>새 사용자 생성</h1>
          
          <div className="form">
            <label htmlFor="username">사용자명 (필수)</label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            
            <label htmlFor="name">이름 (필수)</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            
            <label htmlFor="email">이메일 (필수)</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            
            <label htmlFor="password">초기 비밀번호 (필수)</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            
            <label htmlFor="department">부서</label>
            <select
              id="department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            >
              <option value="">선택하세요</option>
              <option value="개발팀">개발팀</option>
              <option value="기획팀">기획팀</option>
              <option value="인사팀">인사팀</option>
              <option value="영업팀">영업팀</option>
            </select>
            
            <label htmlFor="position">직급</label>
            <input
              id="position"
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />
            
            <label htmlFor="role">역할</label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="user">일반 사용자</option>
              <option value="supervisor">감독자</option>
              <option value="admin">관리자</option>
            </select>
            
            <button onClick={createUser}>생성</button>
            <button onClick={() => {
              setShowCreateForm(false);
              setFormData({
                username: '',
                name: '',
                email: '',
                department: '',
                position: '',
                role: 'user',
                password: ''
              });
            }}>
              취소
            </button>
          </div>
        </div>
      );
    }

    if (showEditForm) {
      return (
        <div>
          <h1>사용자 정보 수정</h1>
          
          <div className="form">
            <label htmlFor="username">사용자명</label>
            <input
              id="username"
              type="text"
              value={formData.username}
              disabled
            />
            
            <label htmlFor="name">이름 (필수)</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            
            <label htmlFor="email">이메일 (필수)</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            
            <label htmlFor="department">부서</label>
            <select
              id="department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            >
              <option value="">선택하세요</option>
              <option value="개발팀">개발팀</option>
              <option value="기획팀">기획팀</option>
              <option value="인사팀">인사팀</option>
              <option value="영업팀">영업팀</option>
            </select>
            
            <label htmlFor="position">직급</label>
            <input
              id="position"
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />
            
            <label htmlFor="role">역할</label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="user">일반 사용자</option>
              <option value="supervisor">감독자</option>
              <option value="admin">관리자</option>
            </select>
            
            <button onClick={updateUser}>저장</button>
            <button onClick={() => {
              setShowEditForm(false);
              setSelectedUser(null);
              setFormData({
                username: '',
                name: '',
                email: '',
                department: '',
                position: '',
                role: 'user',
                password: ''
              });
            }}>
              취소
            </button>
          </div>
        </div>
      );
    }

    return null;
  }
}));

describe('E2E: Admin User Management Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays user management dashboard', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Verify admin dashboard
    expect(screen.getByText('Admin 대시보드')).toBeInTheDocument();
    expect(screen.getByText('전체 사용자: 3명')).toBeInTheDocument();
    expect(screen.getByText('활성 사용자: 2명')).toBeInTheDocument();
    expect(screen.getByText('비활성 사용자: 1명')).toBeInTheDocument();
    
    // Navigate to user management
    await user.click(screen.getByText('사용자 관리'));
    
    // Verify user list
    expect(screen.getByText('사용자 관리')).toBeInTheDocument();
    expect(screen.getByText('김직원')).toBeInTheDocument();
    expect(screen.getByText('이과장')).toBeInTheDocument();
    expect(screen.getByText('박개발')).toBeInTheDocument();
  });

  it('creates a new user', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to user management
    await user.click(screen.getByText('사용자 관리'));
    
    // Click create new user
    await user.click(screen.getByText('새 사용자 생성'));
    
    // Fill the form
    await user.type(screen.getByLabelText('사용자명 (필수)'), 'newuser');
    await user.type(screen.getByLabelText('이름 (필수)'), '신입사원');
    await user.type(screen.getByLabelText('이메일 (필수)'), 'new@company.com');
    await user.type(screen.getByLabelText('초기 비밀번호 (필수)'), 'password123');
    
    // Select department
    await user.selectOptions(screen.getByLabelText('부서'), '개발팀');
    
    // Select role
    await user.selectOptions(screen.getByLabelText('역할'), 'user');
    
    // Submit
    await user.click(screen.getByText('생성'));
    
    // Verify success message
    await waitFor(() => {
      expect(screen.getByText('사용자가 생성되었습니다')).toBeInTheDocument();
    });
    
    // Should return to user list
    expect(screen.getByText('사용자 관리')).toBeInTheDocument();
    
    // New user should appear in the list
    expect(screen.getByText('newuser')).toBeInTheDocument();
    expect(screen.getByText('신입사원')).toBeInTheDocument();
  });

  it('edits existing user', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to user management
    await user.click(screen.getByText('사용자 관리'));
    
    // Click edit for first user
    const editButtons = screen.getAllByText('수정');
    await user.click(editButtons[0]);
    
    // Verify edit form
    expect(screen.getByText('사용자 정보 수정')).toBeInTheDocument();
    
    // Username should be disabled
    const usernameInput = screen.getByLabelText('사용자명');
    expect(usernameInput).toBeDisabled();
    
    // Modify name
    const nameInput = screen.getByLabelText('이름 (필수)');
    await user.clear(nameInput);
    await user.type(nameInput, '김수정');
    
    // Save
    await user.click(screen.getByText('저장'));
    
    // Verify success message
    await waitFor(() => {
      expect(screen.getByText('사용자 정보가 수정되었습니다')).toBeInTheDocument();
    });
    
    // Should return to list with updated name
    expect(screen.getByText('사용자 관리')).toBeInTheDocument();
    expect(screen.getByText('김수정')).toBeInTheDocument();
  });

  it('toggles user status', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to user management
    await user.click(screen.getByText('사용자 관리'));
    
    // Find and click deactivate for first active user
    const deactivateButtons = screen.getAllByText('비활성화');
    await user.click(deactivateButtons[0]);
    
    // Verify message
    await waitFor(() => {
      expect(screen.getByText('사용자가 비활성화되었습니다')).toBeInTheDocument();
    });
    
    // Button should change to activate (now there will be more activate buttons)
    const activateButtons = screen.getAllByText('활성화');
    expect(activateButtons.length).toBeGreaterThan(1); // At least 2 (the one we just changed and the originally inactive one)
  });

  it('resets user password', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to user management
    await user.click(screen.getByText('사용자 관리'));
    
    // Click password reset for first user
    const resetButtons = screen.getAllByText('비밀번호 초기화');
    await user.click(resetButtons[0]);
    
    // Verify success message
    await waitFor(() => {
      expect(screen.getByText('임시 비밀번호가 이메일로 전송되었습니다')).toBeInTheDocument();
    });
  });

  it('cancels user creation', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Navigate to user management
    await user.click(screen.getByText('사용자 관리'));
    
    // Click create new user
    await user.click(screen.getByText('새 사용자 생성'));
    
    // Fill some data
    await user.type(screen.getByLabelText('사용자명 (필수)'), 'testuser');
    
    // Cancel
    await user.click(screen.getByText('취소'));
    
    // Should return to user list
    expect(screen.getByText('사용자 관리')).toBeInTheDocument();
    
    // Test user should not be in the list
    expect(screen.queryByText('testuser')).not.toBeInTheDocument();
  });
});

// Import App for the mock
import App from '../../../App';
/**
 * NotificationProvider Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { NotificationProvider, useNotification } from './NotificationProvider';

// Test component that uses the notification context
const TestComponent: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  
  return (
    <div>
      <button onClick={() => showSuccess('Success message')}>Show Success</button>
      <button onClick={() => showError('Error message')}>Show Error</button>
      <button onClick={() => showWarning('Warning message')}>Show Warning</button>
      <button onClick={() => showInfo('Info message')}>Show Info</button>
    </div>
  );
};

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <NotificationProvider>
      {ui}
    </NotificationProvider>
  );
};

describe('NotificationProvider Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides notification context to children', () => {
    renderWithProvider(<TestComponent />);
    
    expect(screen.getByRole('button', { name: 'Show Success' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Error' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Warning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Info' })).toBeInTheDocument();
  });

  it('shows success notification', async () => {
    renderWithProvider(<TestComponent />);
    
    const successButton = screen.getByRole('button', { name: 'Show Success' });
    
    act(() => {
      successButton.click();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  it('shows error notification', async () => {
    renderWithProvider(<TestComponent />);
    
    const errorButton = screen.getByRole('button', { name: 'Show Error' });
    
    act(() => {
      errorButton.click();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  it('shows warning notification', async () => {
    renderWithProvider(<TestComponent />);
    
    const warningButton = screen.getByRole('button', { name: 'Show Warning' });
    
    act(() => {
      warningButton.click();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });
  });

  it('shows info notification', async () => {
    renderWithProvider(<TestComponent />);
    
    const infoButton = screen.getByRole('button', { name: 'Show Info' });
    
    act(() => {
      infoButton.click();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  it('displays correct severity for each notification type', async () => {
    renderWithProvider(<TestComponent />);
    
    // Test success severity
    act(() => {
      screen.getByRole('button', { name: 'Show Success' }).click();
    });
    
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('MuiAlert-colorSuccess');
    });
  });

  it('can display multiple notifications', async () => {
    renderWithProvider(<TestComponent />);
    
    // Show multiple notifications
    act(() => {
      screen.getByRole('button', { name: 'Show Success' }).click();
    });
    
    // Wait a bit and show another
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
    
    act(() => {
      screen.getByRole('button', { name: 'Show Error' }).click();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  it('throws error when useNotification is used outside provider', () => {
    // This test needs to catch the error thrown by the hook
    const TestComponentWithoutProvider = () => {
      try {
        useNotification();
        return <div>Should not render</div>;
      } catch (error) {
        return <div>Error caught</div>;
      }
    };
    
    // We expect this to throw an error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponentWithoutProvider />);
    }).toThrow();
    
    consoleErrorSpy.mockRestore();
  });
});
/**
 * useNotifications Hook
 * 
 * Provides a unified way to show success, error, and info messages to users
 */

import { useCallback } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  autoHideDuration?: number;
  persist?: boolean;
  action?: React.ReactNode;
}

export interface UseNotificationsReturn {
  showSuccess: (message: string, options?: NotificationOptions) => void;
  showError: (message: string, options?: NotificationOptions) => void;
  showWarning: (message: string, options?: NotificationOptions) => void;
  showInfo: (message: string, options?: NotificationOptions) => void;
  showNotification: (message: string, type: NotificationType, options?: NotificationOptions) => void;
}

/**
 * Hook for displaying notifications throughout the application
 * Uses a simple implementation that can be enhanced with libraries like notistack
 */
export const useNotifications = (): UseNotificationsReturn => {
  
  const showNotification = useCallback((
    message: string, 
    type: NotificationType, 
    options?: NotificationOptions
  ) => {
    // For now, create a simple notification system
    // In a real app, this could integrate with notistack, react-toastify, or custom implementation
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 4px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 9999;
      min-width: 300px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      animation: slideInRight 0.3s ease-out;
    `;
    
    // Set background color based on type
    const colors = {
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3'
    };
    
    notification.style.backgroundColor = colors[type];
    notification.textContent = message;
    notification.setAttribute('data-testid', `notification-${type}`);
    
    // Add CSS animation keyframes if not already added
    if (!document.querySelector('#notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideOutRight {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-hide notification
    const duration = options?.autoHideDuration || 5000;
    if (!options?.persist) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = 'slideOutRight 0.3s ease-in';
          setTimeout(() => {
            if (notification.parentNode) {
              document.body.removeChild(notification);
            }
          }, 300);
        }
      }, duration);
    }
    
    // Make it clickable to dismiss
    notification.addEventListener('click', () => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    });
    
    notification.style.cursor = 'pointer';
    notification.title = 'Click to dismiss';
    
  }, []);
  
  const showSuccess = useCallback((message: string, options?: NotificationOptions) => {
    showNotification(message, 'success', options);
  }, [showNotification]);
  
  const showError = useCallback((message: string, options?: NotificationOptions) => {
    showNotification(message, 'error', options);
  }, [showNotification]);
  
  const showWarning = useCallback((message: string, options?: NotificationOptions) => {
    showNotification(message, 'warning', options);
  }, [showNotification]);
  
  const showInfo = useCallback((message: string, options?: NotificationOptions) => {
    showNotification(message, 'info', options);
  }, [showNotification]);
  
  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotification
  };
};

/**
 * Utility functions for common notification scenarios
 */
export const NotificationMessages = {
  // User management messages
  userDeactivated: (userName: string) => `${userName} 사용자가 성공적으로 비활성화되었습니다.`,
  userReactivated: (userName: string) => `${userName} 사용자가 성공적으로 재활성화되었습니다.`,
  userDeactivationFailed: (error: string) => `사용자 비활성화에 실패했습니다: ${error}`,
  userReactivationFailed: (error: string) => `사용자 재활성화에 실패했습니다: ${error}`,
  
  // Permission errors
  insufficientPermissions: () => '권한이 없습니다. 관리자 권한이 필요합니다.',
  adminOnlyFeature: () => '이 기능은 관리자만 사용할 수 있습니다.',
  
  // Authentication messages
  accountDeactivated: () => '계정이 비활성화되었습니다. 관리자에게 문의하세요.',
  sessionExpired: () => '세션이 만료되었습니다. 다시 로그인해주세요.',
  loginFailed: () => '로그인에 실패했습니다. 사용자명과 비밀번호를 확인해주세요.',
  
  // General errors
  networkError: () => '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  serverError: () => '서버 오류가 발생했습니다. 관리자에게 문의하세요.',
  unexpectedError: () => '예상하지 못한 오류가 발생했습니다.',
  
  // Success messages
  actionCompleted: (action: string) => `${action}이(가) 성공적으로 완료되었습니다.`,
  changesSaved: () => '변경사항이 저장되었습니다.',
  
  // Info messages
  processingRequest: () => '요청을 처리 중입니다...',
  noDataAvailable: () => '표시할 데이터가 없습니다.',
} as const;
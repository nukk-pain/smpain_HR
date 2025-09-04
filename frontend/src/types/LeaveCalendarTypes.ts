export interface LeaveCalendarEvent {
  id: string;
  userId: string;
  userName: string;
  userDepartment: string;
  leaveType: 'annual' | 'sick' | 'personal' | 'family';
  startDate: string;
  endDate: string;
  daysCount: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

export interface LeaveException {
  _id?: string;
  date: string;
  maxConcurrentLeaves: number;
  reason: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: LeaveCalendarEvent[];
  exception?: LeaveException;
  isManagementMode: boolean;
  onClick: (date: Date, events: LeaveCalendarEvent[]) => void;
  onManagementClick?: (date: Date) => void;
}

export interface LeaveStatistics {
  month: string;
  statistics: {
    totalApprovedLeaves: number;
    totalPendingRequests: number;
    mostCommonLeaveType: string;
    departmentWithMostLeaves: string;
    averageLeaveDuration: number;
    peakLeaveDays: {
      date: string;
      count: number;
    }[];
  };
}

export interface ExceptionFormData {
  maxConcurrentLeaves: number;
  reason: string;
}

export interface EventDetailsDialogProps {
  open: boolean;
  date: Date | null;
  events: LeaveCalendarEvent[];
  onClose: () => void;
}

export interface ExceptionDialogProps {
  open: boolean;
  date: Date | null;
  formData: ExceptionFormData;
  existingException?: LeaveException;
  onClose: () => void;
  onSave: (data: ExceptionFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  onFormChange: (data: ExceptionFormData) => void;
}
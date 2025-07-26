// Date utility functions for HR system frontend

/**
 * Format date to Korean locale string
 */
export function formatDateKorean(date: Date | string | null, options: Intl.DateTimeFormatOptions = {}): string {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  };

  return dateObj.toLocaleDateString('ko-KR', defaultOptions);
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toISOString().split('T')[0];
}

/**
 * Format date for display in UI
 */
export function formatDateForDisplay(date: Date | string | null, includeTime: boolean = false): string {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  if (includeTime) {
    return dateObj.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return formatDateKorean(date);
}

/**
 * Format date for form inputs (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date | string | null): string {
  return formatDateISO(date);
}

/**
 * Get year-month string (YYYY-MM)
 */
export function getYearMonth(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  
  return `${year}-${month}`;
}

/**
 * Get current year-month string
 */
export function getCurrentYearMonth(): string {
  return getYearMonth(new Date());
}

/**
 * Parse year-month string to get year and month
 */
export function parseYearMonth(yearMonth: string): { year: number | null; month: number | null } {
  if (!yearMonth || typeof yearMonth !== 'string') {
    return { year: null, month: null };
  }

  const [year, month] = yearMonth.split('-');
  return {
    year: parseInt(year, 10),
    month: parseInt(month, 10)
  };
}

/**
 * Calculate difference in days between two dates
 */
export function getDaysDifference(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate business days between two dates (excluding weekends)
 */
export function getBusinessDays(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  let businessDays = 0;
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      businessDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return businessDays;
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date | string): boolean {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return false;

  const day = dateObj.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Check if a date is Saturday
 */
export function isSaturday(date: Date | string): boolean {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return false;

  return dateObj.getDay() === 6;
}

/**
 * Add days to a date
 */
export function addDays(date: Date | string, days: number): Date {
  const result = new Date(date);
  if (isNaN(result.getTime())) return new Date();

  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 */
export function addMonths(date: Date | string, months: number): Date {
  const result = new Date(date);
  if (isNaN(result.getTime())) return new Date();

  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get start of month
 */
export function getStartOfMonth(date: Date | string): Date {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return new Date();

  return new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
}

/**
 * Get end of month
 */
export function getEndOfMonth(date: Date | string): Date {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return new Date();

  return new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
}

/**
 * Get start of year
 */
export function getStartOfYear(date: Date | string): Date {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return new Date();

  return new Date(dateObj.getFullYear(), 0, 1);
}

/**
 * Get end of year
 */
export function getEndOfYear(date: Date | string): Date {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return new Date();

  return new Date(dateObj.getFullYear(), 11, 31);
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = new Date(date);
  const today = new Date();
  
  return dateObj.toDateString() === today.toDateString();
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string): boolean {
  const dateObj = new Date(date);
  const today = new Date();
  
  dateObj.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return dateObj < today;
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const dateObj = new Date(date);
  const today = new Date();
  
  dateObj.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return dateObj > today;
}

/**
 * Get age from birth date
 */
export function getAge(birthDate: Date | string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  
  if (isNaN(birth.getTime())) return 0;
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Validate date string
 */
export function isValidDate(dateString: string | null): boolean {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Create date from year, month, day
 */
export function createDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

/**
 * Get relative time string (e.g., "2 days ago", "in 3 hours")
 */
export function getRelativeTime(date: Date | string): string {
  const dateObj = new Date(date);
  const now = new Date();
  
  if (isNaN(dateObj.getTime())) return '';
  
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (Math.abs(diffSeconds) < 60) {
    return '방금 전';
  } else if (Math.abs(diffMinutes) < 60) {
    return diffMinutes > 0 ? `${diffMinutes}분 전` : `${Math.abs(diffMinutes)}분 후`;
  } else if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `${diffHours}시간 전` : `${Math.abs(diffHours)}시간 후`;
  } else if (Math.abs(diffDays) < 7) {
    return diffDays > 0 ? `${diffDays}일 전` : `${Math.abs(diffDays)}일 후`;
  } else {
    return formatDateKorean(dateObj);
  }
}

/**
 * Get Korean holidays for a given year
 */
export function getKoreanHolidays(year: number): Date[] {
  // Basic Korean holidays (this could be expanded with lunar calendar holidays)
  return [
    createDate(year, 1, 1),   // New Year's Day
    createDate(year, 3, 1),   // Independence Movement Day
    createDate(year, 5, 5),   // Children's Day
    createDate(year, 6, 6),   // Memorial Day
    createDate(year, 8, 15),  // Liberation Day
    createDate(year, 10, 3),  // National Foundation Day
    createDate(year, 10, 9),  // Hangul Day
    createDate(year, 12, 25), // Christmas
  ];
}

/**
 * Check if date is a Korean holiday
 */
export function isKoreanHoliday(date: Date | string): boolean {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return false;

  const year = dateObj.getFullYear();
  const holidays = getKoreanHolidays(year);
  
  return holidays.some(holiday => 
    holiday.toDateString() === dateObj.toDateString()
  );
}

/**
 * Get date range array between two dates
 */
export function getDateRange(startDate: Date | string, endDate: Date | string): Date[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: Date[] = [];
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return dates;
  }
  
  const currentDate = new Date(start);
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

/**
 * Format time duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}일 ${hours % 24}시간`;
  } else if (hours > 0) {
    return `${hours}시간 ${minutes % 60}분`;
  } else if (minutes > 0) {
    return `${minutes}분 ${seconds % 60}초`;
  } else {
    return `${seconds}초`;
  }
}

/**
 * Get month name in Korean
 */
export function getKoreanMonthName(month: number): string {
  const months = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];
  
  return months[month - 1] || '';
}

/**
 * Get day name in Korean
 */
export function getKoreanDayName(date: Date | string): string {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[dateObj.getDay()];
}
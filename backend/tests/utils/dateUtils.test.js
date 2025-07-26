// Unit tests for dateUtils
const {
  formatDateKorean,
  formatDateISO,
  formatDateForDisplay,
  getYearMonth,
  getCurrentYearMonth,
  parseYearMonth,
  getDaysDifference,
  getBusinessDays,
  isWeekend,
  isSaturday,
  addDays,
  addMonths,
  getStartOfMonth,
  getEndOfMonth,
  isToday,
  isPast,
  isFuture,
  getAge,
  isValidDate,
  createDate,
  getKoreanHolidays,
  isKoreanHoliday
} = require('../../utils/dateUtils');

describe('dateUtils', () => {
  describe('formatDateKorean', () => {
    it('should format date in Korean locale', () => {
      const date = new Date('2025-01-26');
      const formatted = formatDateKorean(date);
      
      expect(formatted).toBe('2025. 01. 26.');
    });

    it('should handle string input', () => {
      const formatted = formatDateKorean('2025-01-26');
      expect(formatted).toBe('2025. 01. 26.');
    });

    it('should return empty string for invalid date', () => {
      const formatted = formatDateKorean('invalid-date');
      expect(formatted).toBe('');
    });

    it('should return empty string for null input', () => {
      const formatted = formatDateKorean(null);
      expect(formatted).toBe('');
    });

    it('should accept custom options', () => {
      const date = new Date('2025-01-26');
      const formatted = formatDateKorean(date, { month: 'long' });
      
      expect(formatted).toContain('1월');
    });
  });

  describe('formatDateISO', () => {
    it('should format date as ISO string (YYYY-MM-DD)', () => {
      const date = new Date('2025-01-26T10:30:00Z');
      const formatted = formatDateISO(date);
      
      expect(formatted).toBe('2025-01-26');
    });

    it('should handle string input', () => {
      const formatted = formatDateISO('2025-01-26');
      expect(formatted).toBe('2025-01-26');
    });

    it('should return empty string for invalid date', () => {
      const formatted = formatDateISO('invalid');
      expect(formatted).toBe('');
    });
  });

  describe('getYearMonth', () => {
    it('should return year-month string', () => {
      const date = new Date('2025-01-26');
      const yearMonth = getYearMonth(date);
      
      expect(yearMonth).toBe('2025-01');
    });

    it('should handle December correctly', () => {
      const date = new Date('2024-12-15');
      const yearMonth = getYearMonth(date);
      
      expect(yearMonth).toBe('2024-12');
    });

    it('should return empty string for invalid date', () => {
      const yearMonth = getYearMonth('invalid');
      expect(yearMonth).toBe('');
    });
  });

  describe('getCurrentYearMonth', () => {
    it('should return current year-month', () => {
      const currentYearMonth = getCurrentYearMonth();
      const now = new Date();
      const expectedYearMonth = getYearMonth(now);
      
      expect(currentYearMonth).toBe(expectedYearMonth);
    });
  });

  describe('parseYearMonth', () => {
    it('should parse valid year-month string', () => {
      const result = parseYearMonth('2025-01');
      
      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
    });

    it('should handle invalid input', () => {
      const result = parseYearMonth('invalid');
      
      expect(result.year).toBeNull();
      expect(result.month).toBeNull();
    });

    it('should handle null input', () => {
      const result = parseYearMonth(null);
      
      expect(result.year).toBeNull();
      expect(result.month).toBeNull();
    });
  });

  describe('getDaysDifference', () => {
    it('should calculate difference between two dates', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-05');
      const diff = getDaysDifference(start, end);
      
      expect(diff).toBe(4);
    });

    it('should handle string inputs', () => {
      const diff = getDaysDifference('2025-01-01', '2025-01-10');
      expect(diff).toBe(9);
    });

    it('should return 0 for invalid dates', () => {
      const diff = getDaysDifference('invalid', '2025-01-01');
      expect(diff).toBe(0);
    });

    it('should return absolute difference', () => {
      const diff = getDaysDifference('2025-01-10', '2025-01-05');
      expect(diff).toBe(5);
    });
  });

  describe('getBusinessDays', () => {
    it('should calculate business days excluding weekends', () => {
      // Monday to Friday (5 business days)
      const businessDays = getBusinessDays('2025-01-06', '2025-01-10');
      expect(businessDays).toBe(5);
    });

    it('should exclude weekends', () => {
      // Monday to Sunday (5 business days, excluding Saturday and Sunday)
      const businessDays = getBusinessDays('2025-01-06', '2025-01-12');
      expect(businessDays).toBe(5);
    });

    it('should handle single day', () => {
      // Single weekday
      const businessDays = getBusinessDays('2025-01-06', '2025-01-06');
      expect(businessDays).toBe(1);
    });

    it('should handle weekend days', () => {
      // Saturday to Sunday
      const businessDays = getBusinessDays('2025-01-11', '2025-01-12');
      expect(businessDays).toBe(0);
    });
  });

  describe('isWeekend', () => {
    it('should identify Saturday as weekend', () => {
      const saturday = new Date('2025-01-11'); // Saturday
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should identify Sunday as weekend', () => {
      const sunday = new Date('2025-01-12'); // Sunday
      expect(isWeekend(sunday)).toBe(true);
    });

    it('should identify weekday as not weekend', () => {
      const monday = new Date('2025-01-06'); // Monday
      expect(isWeekend(monday)).toBe(false);
    });

    it('should handle string input', () => {
      expect(isWeekend('2025-01-11')).toBe(true); // Saturday
      expect(isWeekend('2025-01-06')).toBe(false); // Monday
    });
  });

  describe('isSaturday', () => {
    it('should identify Saturday correctly', () => {
      const saturday = new Date('2025-01-11');
      expect(isSaturday(saturday)).toBe(true);
    });

    it('should return false for non-Saturday', () => {
      const sunday = new Date('2025-01-12');
      expect(isSaturday(sunday)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('should add days to date', () => {
      const date = new Date('2025-01-01');
      const newDate = addDays(date, 10);
      
      expect(formatDateISO(newDate)).toBe('2025-01-11');
    });

    it('should handle negative days (subtract)', () => {
      const date = new Date('2025-01-15');
      const newDate = addDays(date, -5);
      
      expect(formatDateISO(newDate)).toBe('2025-01-10');
    });

    it('should handle month boundary', () => {
      const date = new Date('2025-01-30');
      const newDate = addDays(date, 5);
      
      expect(formatDateISO(newDate)).toBe('2025-02-04');
    });
  });

  describe('addMonths', () => {
    it('should add months to date', () => {
      const date = new Date('2025-01-15');
      const newDate = addMonths(date, 3);
      
      expect(getYearMonth(newDate)).toBe('2025-04');
    });

    it('should handle year boundary', () => {
      const date = new Date('2024-10-15');
      const newDate = addMonths(date, 4);
      
      expect(getYearMonth(newDate)).toBe('2025-02');
    });
  });

  describe('getStartOfMonth', () => {
    it('should return first day of month', () => {
      const date = new Date('2025-01-15');
      const startOfMonth = getStartOfMonth(date);
      
      expect(formatDateISO(startOfMonth)).toBe('2025-01-01');
    });
  });

  describe('getEndOfMonth', () => {
    it('should return last day of month', () => {
      const date = new Date('2025-01-15');
      const endOfMonth = getEndOfMonth(date);
      
      expect(formatDateISO(endOfMonth)).toBe('2025-01-31');
    });

    it('should handle February', () => {
      const date = new Date('2025-02-15');
      const endOfMonth = getEndOfMonth(date);
      
      expect(formatDateISO(endOfMonth)).toBe('2025-02-28');
    });

    it('should handle leap year February', () => {
      const date = new Date('2024-02-15');
      const endOfMonth = getEndOfMonth(date);
      
      expect(formatDateISO(endOfMonth)).toBe('2024-02-29');
    });
  });

  describe('isToday', () => {
    it('should identify today correctly', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = addDays(new Date(), -1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = addDays(new Date(), 1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('isPast', () => {
    it('should identify past date correctly', () => {
      const pastDate = addDays(new Date(), -1);
      expect(isPast(pastDate)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = addDays(new Date(), 1);
      expect(isPast(futureDate)).toBe(false);
    });

    it('should return false for today', () => {
      const today = new Date();
      expect(isPast(today)).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should identify future date correctly', () => {
      const futureDate = addDays(new Date(), 1);
      expect(isFuture(futureDate)).toBe(true);
    });

    it('should return false for past date', () => {
      const pastDate = addDays(new Date(), -1);
      expect(isFuture(pastDate)).toBe(false);
    });

    it('should return false for today', () => {
      const today = new Date();
      expect(isFuture(today)).toBe(false);
    });
  });

  describe('getAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('1990-01-26');
      const age = getAge(birthDate);
      
      // Age should be approximately 35 (as of 2025)
      expect(age).toBeGreaterThanOrEqual(34);
      expect(age).toBeLessThanOrEqual(35);
    });

    it('should handle birthday not yet passed this year', () => {
      const currentYear = new Date().getFullYear();
      const futureBirthday = new Date(currentYear, 11, 31); // December 31st this year
      
      if (new Date().getMonth() < 11) { // If not December yet
        const age = getAge(new Date(currentYear - 25, 11, 31));
        expect(age).toBe(24); // Birthday hasn't passed yet
      }
    });
  });

  describe('isValidDate', () => {
    it('should validate correct date string', () => {
      expect(isValidDate('2025-01-26')).toBe(true);
      expect(isValidDate('2025/01/26')).toBe(true);
    });

    it('should invalidate incorrect date string', () => {
      expect(isValidDate('invalid-date')).toBe(false);
      expect(isValidDate('2025-13-01')).toBe(false);
      expect(isValidDate('')).toBe(false);
      expect(isValidDate(null)).toBe(false);
    });
  });

  describe('createDate', () => {
    it('should create date from year, month, day', () => {
      const date = createDate(2025, 1, 26);
      
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // 0-indexed
      expect(date.getDate()).toBe(26);
    });
  });

  describe('getKoreanHolidays', () => {
    it('should return Korean holidays for given year', () => {
      const holidays = getKoreanHolidays(2025);
      
      expect(holidays).toHaveLength(8);
      expect(holidays.some(h => 
        h.getMonth() === 0 && h.getDate() === 1 // New Year's Day
      )).toBe(true);
      expect(holidays.some(h => 
        h.getMonth() === 11 && h.getDate() === 25 // Christmas
      )).toBe(true);
    });
  });

  describe('isKoreanHoliday', () => {
    it('should identify Korean holidays correctly', () => {
      expect(isKoreanHoliday('2025-01-01')).toBe(true); // New Year
      expect(isKoreanHoliday('2025-12-25')).toBe(true); // Christmas
      expect(isKoreanHoliday('2025-05-05')).toBe(true); // Children's Day
    });

    it('should return false for non-holidays', () => {
      expect(isKoreanHoliday('2025-01-02')).toBe(false);
      expect(isKoreanHoliday('2025-07-15')).toBe(false);
    });
  });
});
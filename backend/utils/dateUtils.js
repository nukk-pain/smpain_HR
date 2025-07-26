// Date utility functions for HR system

/**
 * Format date to Korean locale string
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
function formatDateKorean(date, options = {}) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  };

  return dateObj.toLocaleDateString('ko-KR', defaultOptions);
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param {Date|string} date - Date to format
 * @returns {string} ISO date string
 */
function formatDateISO(date) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toISOString().split('T')[0];
}

/**
 * Format date for display in UI
 * @param {Date|string} date - Date to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
function formatDateForDisplay(date, includeTime = false) {
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
 * Get year-month string (YYYY-MM)
 * @param {Date|string} date - Date to format
 * @returns {string} Year-month string
 */
function getYearMonth(date) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  
  return `${year}-${month}`;
}

/**
 * Get current year-month string
 * @returns {string} Current year-month string
 */
function getCurrentYearMonth() {
  return getYearMonth(new Date());
}

/**
 * Parse year-month string to get year and month
 * @param {string} yearMonth - Year-month string (YYYY-MM)
 * @returns {Object} Object with year and month
 */
function parseYearMonth(yearMonth) {
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
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Difference in days
 */
function getDaysDifference(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate business days between two dates (excluding weekends)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Business days count
 */
function getBusinessDays(startDate, endDate) {
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
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if weekend
 */
function isWeekend(date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return false;

  const day = dateObj.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Check if a date is Saturday
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if Saturday
 */
function isSaturday(date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return false;

  return dateObj.getDay() === 6;
}

/**
 * Add days to a date
 * @param {Date|string} date - Base date
 * @param {number} days - Days to add
 * @returns {Date} New date
 */
function addDays(date, days) {
  const result = new Date(date);
  if (isNaN(result.getTime())) return new Date();

  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 * @param {Date|string} date - Base date
 * @param {number} months - Months to add
 * @returns {Date} New date
 */
function addMonths(date, months) {
  const result = new Date(date);
  if (isNaN(result.getTime())) return new Date();

  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get start of month
 * @param {Date|string} date - Date
 * @returns {Date} Start of month
 */
function getStartOfMonth(date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return new Date();

  return new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
}

/**
 * Get end of month
 * @param {Date|string} date - Date
 * @returns {Date} End of month
 */
function getEndOfMonth(date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return new Date();

  return new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
}

/**
 * Get start of year
 * @param {Date|string} date - Date
 * @returns {Date} Start of year
 */
function getStartOfYear(date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return new Date();

  return new Date(dateObj.getFullYear(), 0, 1);
}

/**
 * Get end of year
 * @param {Date|string} date - Date
 * @returns {Date} End of year
 */
function getEndOfYear(date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return new Date();

  return new Date(dateObj.getFullYear(), 11, 31);
}

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if today
 */
function isToday(date) {
  const dateObj = new Date(date);
  const today = new Date();
  
  return dateObj.toDateString() === today.toDateString();
}

/**
 * Check if date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if in the past
 */
function isPast(date) {
  const dateObj = new Date(date);
  const today = new Date();
  
  dateObj.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return dateObj < today;
}

/**
 * Check if date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if in the future
 */
function isFuture(date) {
  const dateObj = new Date(date);
  const today = new Date();
  
  dateObj.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return dateObj > today;
}

/**
 * Get age from birth date
 * @param {Date|string} birthDate - Birth date
 * @returns {number} Age in years
 */
function getAge(birthDate) {
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
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid
 */
function isValidDate(dateString) {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Create date from year, month, day
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {number} day - Day
 * @returns {Date} Created date
 */
function createDate(year, month, day) {
  return new Date(year, month - 1, day);
}

/**
 * Get Korean holidays for a given year
 * @param {number} year - Year
 * @returns {Array} Array of holiday dates
 */
function getKoreanHolidays(year) {
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
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if holiday
 */
function isKoreanHoliday(date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return false;

  const year = dateObj.getFullYear();
  const holidays = getKoreanHolidays(year);
  
  return holidays.some(holiday => 
    holiday.toDateString() === dateObj.toDateString()
  );
}

module.exports = {
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
  getStartOfYear,
  getEndOfYear,
  isToday,
  isPast,
  isFuture,
  getAge,
  isValidDate,
  createDate,
  getKoreanHolidays,
  isKoreanHoliday
};
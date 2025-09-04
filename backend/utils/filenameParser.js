/**
 * Utility functions for parsing employee information from payslip filenames
 */

/**
 * Parse employee information from a payslip filename
 * @param {string} filename - The original filename (can include Korean characters)
 * @returns {object} Parsed employee information
 */
function parseEmployeeFromFilename(filename) {
  // Remove .pdf extension
  const nameWithoutExt = filename.replace(/\.pdf$/i, '');
  
  // Pattern 1: 회사명_고용형태YYYYMM_직원명.pdf
  // Example: 연세신명마취통증의학과의원_정규202410_홍길동.pdf
  const pattern1 = /^(.+?)_(.+?)(\d{6})_(.+?)$/;
  const match1 = nameWithoutExt.match(pattern1);
  if (match1) {
    return {
      company: match1[1],
      employmentType: match1[2],
      yearMonth: match1[3],
      name: match1[4]
    };
  }
  
  // Pattern 2: 회사명_YYYY-MM_직원명.pdf
  // Example: 연세신명마취통증의학과의원_2024-10_홍길동.pdf
  const pattern2 = /^(.+?)_(\d{4})-(\d{2})_(.+?)$/;
  const match2 = nameWithoutExt.match(pattern2);
  if (match2) {
    return {
      company: match2[1],
      yearMonth: match2[2] + match2[3],
      name: match2[4]
    };
  }
  
  // Pattern 3: 회사명_직원명_YYYYMMDD.pdf
  // Example: 연세신명마취통증의학과의원_홍길동_20241015.pdf
  const pattern3 = /^(.+?)_(.+?)_(\d{8})$/;
  const match3 = nameWithoutExt.match(pattern3);
  if (match3) {
    return {
      company: match3[1],
      name: match3[2],
      yearMonth: match3[3].substring(0, 6)
    };
  }
  
  // Pattern 4: 회사명_YYYYMM_직원명.pdf (without employment type)
  // Example: 연세신명마취통증의학과의원_202410_홍길동.pdf
  const pattern4 = /^(.+?)_(\d{6})_(.+?)$/;
  const match4 = nameWithoutExt.match(pattern4);
  if (match4) {
    return {
      company: match4[1],
      yearMonth: match4[2],
      name: match4[3],
      employmentType: null
    };
  }
  
  // Pattern 5: Simple format - 직원명_YYYYMM.pdf
  // Example: 홍길동_202410.pdf
  const pattern5 = /^(.+?)_(\d{6})$/;
  const match5 = nameWithoutExt.match(pattern5);
  if (match5) {
    return {
      name: match5[1],
      yearMonth: match5[2],
      company: null,
      employmentType: null
    };
  }
  
  // Fallback: Extract last part as name
  const parts = nameWithoutExt.split('_');
  return {
    name: parts[parts.length - 1] || filename,
    yearMonth: null,
    company: parts.length > 1 ? parts[0] : null,
    employmentType: null
  };
}

/**
 * Normalize Korean filename for safe storage while preserving readability
 * @param {string} filename - The original filename
 * @returns {string} Normalized filename
 */
function normalizeFilename(filename) {
  // Replace problematic characters while keeping Korean characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')  // Replace invalid filesystem characters
    .replace(/\s+/g, '_')  // Replace spaces with underscores
    .replace(/_+/g, '_')   // Collapse multiple underscores
    .trim();
}

/**
 * Extract year and month from various date formats
 * @param {string} dateStr - Date string in various formats
 * @returns {object} Object with year and month
 */
function extractYearMonth(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };
  }
  
  // Format: YYYYMM or YYYYMMDD
  if (/^\d{6,8}$/.test(dateStr)) {
    return {
      year: parseInt(dateStr.substring(0, 4)),
      month: parseInt(dateStr.substring(4, 6))
    };
  }
  
  // Format: YYYY-MM or YYYY-MM-DD
  if (/^\d{4}-\d{2}/.test(dateStr)) {
    const parts = dateStr.split('-');
    return {
      year: parseInt(parts[0]),
      month: parseInt(parts[1])
    };
  }
  
  // Default to current year/month
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  };
}

module.exports = {
  parseEmployeeFromFilename,
  normalizeFilename,
  extractYearMonth
};
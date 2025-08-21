#!/usr/bin/env node

/**
 * Clean unused endpoints from reports.js
 * Removes only the 7 confirmed unused endpoints
 */

const fs = require('fs');
const path = require('path');

const reportsFile = path.join(__dirname, '../backend/routes/reports.js');

// Read the file
let content = fs.readFileSync(reportsFile, 'utf8');
const originalLines = content.split('\n').length;

console.log(`Processing ${reportsFile}...`);
console.log(`Original file: ${originalLines} lines\n`);

// Remove each unused endpoint using exact line ranges
const removals = [
  { name: 'GET /payroll/:year_month/excel', startLine: 241, endLine: 262 },
  { name: 'GET /comparison/:upload_id/:year_month/excel', startLine: 264, endLine: 291 },
  { name: 'GET /payslip/:userId/:year_month/excel', startLine: 293, endLine: 336 },
  { name: 'GET /leave/:year_month', startLine: 338, endLine: 408 },
  { name: 'POST /payroll/:id/payslip/upload', startLine: 410, endLine: 531 },
  { name: 'GET /payroll/:id/payslip', startLine: 533, endLine: 634 },
  { name: 'DELETE /payroll/:id/payslip', startLine: 636, endLine: 732 }
];

// Process removals in reverse order to maintain line numbers
removals.reverse();

let totalRemoved = 0;
for (const removal of removals) {
  const lines = content.split('\n');
  
  // Adjust for 0-based indexing
  const startIdx = removal.startLine - 1;
  const endIdx = removal.endLine;
  
  const removedCount = endIdx - startIdx;
  console.log(`Removing ${removal.name}: lines ${removal.startLine}-${removal.endLine} (${removedCount} lines)`);
  
  // Remove the lines
  lines.splice(startIdx, removedCount);
  content = lines.join('\n');
  totalRemoved += removedCount;
}

// Clean up excessive blank lines
const lines = content.split('\n');
const cleaned = [];
let prevBlank = false;

for (const line of lines) {
  const isBlank = line.trim() === '';
  // Don't add multiple consecutive blank lines
  if (!(isBlank && prevBlank)) {
    cleaned.push(line);
  }
  prevBlank = isBlank;
}

content = cleaned.join('\n');

// Write the result
fs.writeFileSync(reportsFile, content);

const newLines = content.split('\n').length;
console.log(`\n✅ Removed 7 unused endpoints`);
console.log(`📊 File size: ${originalLines} lines → ${newLines} lines (removed ${totalRemoved} lines)`);
console.log(`📁 Backup available at: ${reportsFile}.backup`);
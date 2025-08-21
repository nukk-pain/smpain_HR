#!/usr/bin/env node

/**
 * Script to remove unused endpoints from reports.js
 * Based on analysis from REFACTOR-02-reports-plan.md
 */

const fs = require('fs');
const path = require('path');

const reportsFile = path.join(__dirname, '../backend/routes/reports.js');
const backupFile = path.join(__dirname, '../backend/routes/reports.js.backup');

// Read the file
let content = fs.readFileSync(reportsFile, 'utf8');
const originalLines = content.split('\n').length;

// Endpoints to remove (with their start and approximate end patterns)
const endpointsToRemove = [
  {
    name: 'GET /payroll/:year_month/excel',
    startPattern: /\/\/ Download payroll report as Excel \(mock implementation\)/,
    endPattern: /^\s*\}\)\);?\s*$/,
    endCount: 2  // How many closing brackets to count
  },
  {
    name: 'GET /comparison/:upload_id/:year_month/excel',
    startPattern: /\/\/ Download comparison report/,
    endPattern: /^\s*\}\)\);?\s*$/,
    endCount: 2
  },
  {
    name: 'GET /payslip/:userId/:year_month/excel',
    startPattern: /\/\/ Download payslip for individual employee/,
    endPattern: /^\s*\}\)\);?\s*$/,
    endCount: 2
  },
  {
    name: 'GET /leave/:year_month',
    startPattern: /\/\/ Leave report/,
    endPattern: /^\s*\}\)\);?\s*$/,
    endCount: 2
  },
  {
    name: 'POST /payroll/:id/payslip/upload',
    startPattern: /\/\*\*\s*\n\s*\* POST \/api\/reports\/payroll\/:id\/payslip\/upload/,
    endPattern: /^\s*\}\s*\)\s*\);?\s*$/,
    endCount: 1
  },
  {
    name: 'GET /payroll/:id/payslip',
    startPattern: /\/\*\*\s*\n\s*\* GET \/api\/reports\/payroll\/:id\/payslip - Download PDF payslip/,
    endPattern: /^\s*\}\s*\)\s*\);?\s*$/,
    endCount: 1
  },
  {
    name: 'DELETE /payroll/:id/payslip',
    startPattern: /\/\*\*\s*\n\s*\* DELETE \/api\/reports\/payroll\/:id\/payslip/,
    endPattern: /^\s*\}\s*\)\s*\);?\s*$/,
    endCount: 1
  }
];

console.log(`Processing ${reportsFile}...`);
console.log(`Original file: ${originalLines} lines\n`);

let removedCount = 0;
let removedLines = 0;

// Process each endpoint
for (const endpoint of endpointsToRemove) {
  const lines = content.split('\n');
  let startIndex = -1;
  let endIndex = -1;
  
  // Find start
  for (let i = 0; i < lines.length; i++) {
    if (endpoint.startPattern.test(lines[i])) {
      startIndex = i;
      // For comment-based patterns, go back to include JSDoc if present
      if (endpoint.name.includes('payslip')) {
        // Check if there's a JSDoc comment above
        let j = i - 1;
        while (j >= 0 && (lines[j].trim().startsWith('*') || lines[j].trim() === '/**')) {
          startIndex = j;
          j--;
        }
      }
      break;
    }
  }
  
  if (startIndex === -1) {
    console.log(`❌ Could not find start of: ${endpoint.name}`);
    continue;
  }
  
  // Find end by counting brackets
  let bracketCount = 0;
  let foundRouter = false;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for router. pattern
    if (/router\.(get|post|delete|put|patch)/.test(line)) {
      foundRouter = true;
    }
    
    if (foundRouter) {
      // Count opening brackets
      bracketCount += (line.match(/\{/g) || []).length;
      // Count closing brackets
      bracketCount -= (line.match(/\}/g) || []).length;
      
      // Check if we've closed all brackets and found the end pattern
      if (bracketCount <= 0 && endpoint.endPattern.test(line)) {
        endIndex = i;
        break;
      }
    }
  }
  
  if (endIndex === -1) {
    console.log(`❌ Could not find end of: ${endpoint.name}`);
    continue;
  }
  
  // Remove the endpoint
  const removedSection = lines.slice(startIndex, endIndex + 1);
  console.log(`✅ Removing ${endpoint.name}: lines ${startIndex + 1}-${endIndex + 1} (${removedSection.length} lines)`);
  
  // Remove the lines and add a single newline if needed
  lines.splice(startIndex, endIndex - startIndex + 1);
  
  // Clean up extra blank lines
  let cleaned = [];
  let prevBlank = false;
  for (const line of lines) {
    const isBlank = line.trim() === '';
    if (!(isBlank && prevBlank)) {
      cleaned.push(line);
    }
    prevBlank = isBlank;
  }
  
  content = cleaned.join('\n');
  removedCount++;
  removedLines += removedSection.length;
}

// Write the cleaned file
fs.writeFileSync(reportsFile, content);

const newLines = content.split('\n').length;
console.log(`\n✅ Removed ${removedCount} endpoints`);
console.log(`📊 File size: ${originalLines} lines → ${newLines} lines (removed ${removedLines} lines)`);
console.log(`📁 Backup saved to: ${backupFile}`);
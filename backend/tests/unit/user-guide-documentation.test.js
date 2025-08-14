/*
 * AI-HEADER
 * Intent: Test for user guide documentation creation
 * Domain Meaning: Ensures user documentation exists and is comprehensive
 * Misleading Names: None
 * Data Contracts: Markdown documentation format
 * PII: No PII data - documentation only
 * Invariants: Documentation must be complete and accessible
 * RAG Keywords: user guide test, documentation test, markdown validation
 */

const fs = require('fs');
const path = require('path');

describe('User Guide Documentation', () => {
  const userGuidePath = path.join(__dirname, '../../../docs/USER_GUIDE.md');

  test('should have a user guide file', () => {
    expect(fs.existsSync(userGuidePath)).toBe(true);
  });

  test('should contain essential sections', () => {
    const content = fs.readFileSync(userGuidePath, 'utf8');
    
    // Check for main sections
    expect(content).toContain('# User Guide');
    expect(content).toContain('## Getting Started');
    expect(content).toContain('## Excel Upload Process');
    expect(content).toContain('## Preview Feature');
    expect(content).toContain('## Common Tasks');
    expect(content).toContain('## Troubleshooting');
  });

  test('should have payroll upload instructions', () => {
    const content = fs.readFileSync(userGuidePath, 'utf8');
    
    expect(content).toContain('Step 1:');
    expect(content).toContain('Step 2:');
    expect(content).toContain('Step 3:');
    expect(content).toContain('preview');
    expect(content).toContain('confirm');
  });

  test('should include error handling guidance', () => {
    const content = fs.readFileSync(userGuidePath, 'utf8');
    
    expect(content).toContain('error');
    expect(content).toContain('warning');
    expect(content).toContain('fix');
  });

  test('should have screenshots or examples section', () => {
    const content = fs.readFileSync(userGuidePath, 'utf8');
    
    expect(content.toLowerCase()).toMatch(/example|screenshot|sample/);
  });
});
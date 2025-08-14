/*
 * AI-HEADER
 * Intent: Test for troubleshooting guide documentation creation
 * Domain Meaning: Ensures troubleshooting documentation exists and is comprehensive
 * Misleading Names: None
 * Data Contracts: Markdown documentation format
 * PII: No PII data - documentation only
 * Invariants: Documentation must provide clear problem-solution pairs
 * RAG Keywords: troubleshooting guide test, problem resolution, error documentation
 */

const fs = require('fs');
const path = require('path');

describe('Troubleshooting Guide Documentation', () => {
  const troubleshootingGuidePath = path.join(__dirname, '../../../docs/TROUBLESHOOTING_GUIDE.md');

  test('should have a troubleshooting guide file', () => {
    expect(fs.existsSync(troubleshootingGuidePath)).toBe(true);
  });

  test('should contain common error sections', () => {
    const content = fs.readFileSync(troubleshootingGuidePath, 'utf8');
    
    // Check for main sections
    expect(content).toContain('# Troubleshooting Guide');
    expect(content).toContain('## Common Errors');
    expect(content).toContain('## Upload Issues');
    expect(content).toContain('## Authentication Problems');
    expect(content).toContain('## Performance Issues');
    expect(content).toContain('## Database Errors');
  });

  test('should have Excel upload specific troubleshooting', () => {
    const content = fs.readFileSync(troubleshootingGuidePath, 'utf8');
    
    expect(content).toContain('preview');
    expect(content).toContain('token expired');
    expect(content).toContain('file format');
    expect(content.toLowerCase()).toContain('employee matching');
  });

  test('should include error codes and solutions', () => {
    const content = fs.readFileSync(troubleshootingGuidePath, 'utf8');
    
    expect(content).toContain('Error:');
    expect(content).toContain('Solution:');
    expect(content).toContain('Cause:');
  });

  test('should have quick reference section', () => {
    const content = fs.readFileSync(troubleshootingGuidePath, 'utf8');
    
    expect(content.toLowerCase()).toMatch(/quick reference|quick fixes|common solutions/);
  });

  test('should include contact information', () => {
    const content = fs.readFileSync(troubleshootingGuidePath, 'utf8');
    
    expect(content.toLowerCase()).toMatch(/contact|support|help/);
  });
});
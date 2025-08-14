/*
 * AI-HEADER
 * Intent: Test for admin guide documentation creation
 * Domain Meaning: Ensures administrator documentation exists and is comprehensive
 * Misleading Names: None
 * Data Contracts: Markdown documentation format
 * PII: No PII data - documentation only
 * Invariants: Documentation must be complete and accessible for admins
 * RAG Keywords: admin guide test, administrator documentation, system management guide
 */

const fs = require('fs');
const path = require('path');

describe('Admin Guide Documentation', () => {
  const adminGuidePath = path.join(__dirname, '../../../docs/ADMIN_GUIDE.md');

  test('should have an admin guide file', () => {
    expect(fs.existsSync(adminGuidePath)).toBe(true);
  });

  test('should contain essential admin sections', () => {
    const content = fs.readFileSync(adminGuidePath, 'utf8');
    
    // Check for main sections
    expect(content).toContain('# Administrator Guide');
    expect(content).toContain('## System Configuration');
    expect(content).toContain('## User Management');
    expect(content).toContain('## Monitoring and Maintenance');
    expect(content).toContain('## Backup and Recovery');
    expect(content).toContain('## Security Settings');
  });

  test('should have temporary data management instructions', () => {
    const content = fs.readFileSync(adminGuidePath, 'utf8');
    
    expect(content).toContain('temporary uploads');
    expect(content).toContain('cleanup');
    expect(content).toContain('TTL');
    expect(content).toContain('memory usage');
  });

  test('should include API endpoints documentation', () => {
    const content = fs.readFileSync(adminGuidePath, 'utf8');
    
    expect(content).toContain('/api/admin');
    expect(content).toContain('debug');
    expect(content).toContain('system status');
  });

  test('should have troubleshooting procedures', () => {
    const content = fs.readFileSync(adminGuidePath, 'utf8');
    
    expect(content.toLowerCase()).toContain('troubleshoot');
    expect(content).toContain('logs');
    expect(content).toContain('error');
    expect(content).toContain('performance');
  });

  test('should include deployment configuration', () => {
    const content = fs.readFileSync(adminGuidePath, 'utf8');
    
    expect(content).toContain('environment variables');
    expect(content).toContain('Google Cloud');
    expect(content).toContain('production');
  });
});
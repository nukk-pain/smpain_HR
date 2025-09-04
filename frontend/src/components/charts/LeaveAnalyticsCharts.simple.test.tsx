import { describe, it, expect } from 'vitest';

// Simple test to verify the component can be imported
describe('LeaveAnalyticsCharts Basic', () => {
  it('should be able to import the component', async () => {
    const module = await import('./LeaveAnalyticsCharts');
    expect(module.LeaveAnalyticsCharts).toBeDefined();
    expect(typeof module.LeaveAnalyticsCharts).toBe('function');
  });
});
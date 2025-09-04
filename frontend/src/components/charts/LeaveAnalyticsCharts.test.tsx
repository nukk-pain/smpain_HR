import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaveAnalyticsCharts } from './LeaveAnalyticsCharts';

describe('LeaveAnalyticsCharts', () => {
  it('should render without crashing', () => {
    const { container } = render(<LeaveAnalyticsCharts />);
    expect(container).toBeInTheDocument();
  });

  it('should display risk level distribution pie chart', () => {
    const mockData = {
      riskDistribution: {
        high: 5,
        medium: 10,
        low: 15
      }
    };
    
    const { getByTestId, getByText } = render(
      <LeaveAnalyticsCharts {...mockData} />
    );
    
    expect(getByTestId('risk-distribution-chart')).toBeInTheDocument();
    expect(getByText('위험도 분포')).toBeInTheDocument();
  });

  it('should display department usage comparison bar chart', () => {
    const mockData = {
      departmentStats: [
        { department: '개발팀', avgUsage: 65, totalEmployees: 20 },
        { department: '인사팀', avgUsage: 45, totalEmployees: 10 }
      ]
    };
    
    const { getByTestId, getByText } = render(
      <LeaveAnalyticsCharts {...mockData} />
    );
    
    expect(getByTestId('department-usage-chart')).toBeInTheDocument();
    expect(getByText('부서별 연차 사용률')).toBeInTheDocument();
  });

  it('should display key statistics cards', () => {
    const mockData = {
      statistics: {
        totalEmployees: 50,
        averageUsage: 55.5,
        highRiskCount: 8,
        pendingRequests: 3
      }
    };
    
    const { getByText } = render(
      <LeaveAnalyticsCharts {...mockData} />
    );
    
    // Check if statistics are displayed
    expect(getByText('전체 직원')).toBeInTheDocument();
    expect(getByText('50명')).toBeInTheDocument();
    expect(getByText('평균 사용률')).toBeInTheDocument();
    expect(getByText('55.5%')).toBeInTheDocument();
  });

  it('should handle empty data gracefully', () => {
    const { getByText } = render(<LeaveAnalyticsCharts />);
    expect(getByText('데이터가 없습니다')).toBeInTheDocument();
  });
});
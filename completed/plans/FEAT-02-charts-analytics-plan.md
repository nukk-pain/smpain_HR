# UnifiedLeaveOverview Charts & Analytics Implementation Plan (TDD)

## Overview
Add visual analytics and charts to the UnifiedLeaveOverview component to provide better insights into leave usage patterns, trends, and department comparisons.

## Current State Analysis
- **Existing Data**: Leave overview statistics already available (usage rates, risk levels, department stats)
- **UI Framework**: Material-UI with existing theme
- **Chart Library Options**: Need to choose between Chart.js, Recharts, or MUI X Charts
- **Data Available**: Employee leave data, department statistics, historical trends

## Technology Selection

### Chart Library Comparison
1. **Recharts** (Recommended) ✅
   - React-specific, declarative API
   - Good TypeScript support
   - Responsive by default
   - Bundle size: ~170KB
   - Easy integration with MUI

2. **Chart.js**
   - More features but requires react-chartjs-2 wrapper
   - Larger bundle size: ~200KB+
   - More complex API

3. **MUI X Charts**
   - Native MUI integration
   - Newer, less mature
   - Limited chart types

**Decision**: Use Recharts for better React integration and simplicity

## TDD Implementation Plan

### Phase 1: Install Dependencies & Setup (RED)

#### Test 1: Chart Component Exists
```typescript
// frontend/src/components/charts/LeaveAnalyticsCharts.test.tsx
import { render } from '@testing-library/react';
import { LeaveAnalyticsCharts } from './LeaveAnalyticsCharts';

describe('LeaveAnalyticsCharts', () => {
  it('should render without crashing', () => {
    const { container } = render(<LeaveAnalyticsCharts data={[]} />);
    expect(container).toBeInTheDocument();
  });
});
```

### Phase 2: Usage Rate Pie Chart (GREEN)

#### Test 2: Risk Level Distribution Chart
```typescript
it('should display risk level distribution pie chart', () => {
  const mockData = {
    high: 5,
    medium: 10,
    low: 15
  };
  
  const { getByText, getByTestId } = render(
    <LeaveAnalyticsCharts riskDistribution={mockData} />
  );
  
  expect(getByTestId('risk-distribution-chart')).toBeInTheDocument();
  expect(getByText('위험도 분포')).toBeInTheDocument();
});
```

#### Implementation:
```typescript
// frontend/src/components/charts/LeaveAnalyticsCharts.tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export const LeaveAnalyticsCharts: React.FC<Props> = ({ riskDistribution }) => {
  const COLORS = {
    high: '#f44336',
    medium: '#ff9800',
    low: '#4caf50'
  };
  
  const data = Object.entries(riskDistribution).map(([key, value]) => ({
    name: getRiskLevelLabel(key),
    value,
    color: COLORS[key]
  }));
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">위험도 분포</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

### Phase 3: Department Comparison Bar Chart

#### Test 3: Department Usage Comparison
```typescript
it('should display department usage comparison bar chart', () => {
  const mockData = [
    { department: '개발팀', avgUsage: 65, totalEmployees: 20 },
    { department: '인사팀', avgUsage: 45, totalEmployees: 10 }
  ];
  
  const { getByTestId } = render(
    <DepartmentUsageChart data={mockData} />
  );
  
  expect(getByTestId('department-usage-chart')).toBeInTheDocument();
});
```

#### Implementation:
```typescript
// frontend/src/components/charts/DepartmentUsageChart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export const DepartmentUsageChart: React.FC<Props> = ({ data }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">부서별 연차 사용률</Typography>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgUsage" fill="#8884d8" name="평균 사용률(%)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

### Phase 4: Monthly Trend Line Chart

#### Test 4: Monthly Usage Trend
```typescript
it('should display monthly usage trend line chart', () => {
  const mockData = [
    { month: '1월', usage: 10, requests: 5 },
    { month: '2월', usage: 15, requests: 8 }
  ];
  
  const { getByTestId } = render(
    <MonthlyTrendChart data={mockData} />
  );
  
  expect(getByTestId('monthly-trend-chart')).toBeInTheDocument();
});
```

### Phase 5: Statistics Summary Cards

#### Test 5: Key Metrics Display
```typescript
it('should display key statistics cards', () => {
  const mockStats = {
    totalEmployees: 50,
    averageUsage: 55.5,
    highRiskCount: 8,
    pendingRequests: 3
  };
  
  const { getByText } = render(
    <LeaveStatisticsCards stats={mockStats} />
  );
  
  expect(getByText('50')).toBeInTheDocument();
  expect(getByText('55.5%')).toBeInTheDocument();
});
```

### Phase 6: Integration with UnifiedLeaveOverview

#### Test 6: Charts Toggle in Main Component
```typescript
it('should toggle charts visibility', async () => {
  const { getByText, queryByTestId } = render(
    <UnifiedLeaveOverview />
  );
  
  // Charts hidden by default
  expect(queryByTestId('analytics-charts')).not.toBeInTheDocument();
  
  // Click analytics button
  const analyticsButton = getByText('분석 차트');
  fireEvent.click(analyticsButton);
  
  // Charts should be visible
  await waitFor(() => {
    expect(queryByTestId('analytics-charts')).toBeInTheDocument();
  });
});
```

### Phase 7: Data Processing & Calculations

#### Test 7: Data Aggregation Functions
```typescript
describe('Analytics Data Processing', () => {
  it('should calculate risk distribution correctly', () => {
    const employees = [
      { riskLevel: 'high' },
      { riskLevel: 'high' },
      { riskLevel: 'medium' },
      { riskLevel: 'low' }
    ];
    
    const result = calculateRiskDistribution(employees);
    
    expect(result).toEqual({
      high: 2,
      medium: 1,
      low: 1
    });
  });
  
  it('should calculate department averages', () => {
    const employees = [
      { department: '개발팀', usageRate: 60 },
      { department: '개발팀', usageRate: 70 },
      { department: '인사팀', usageRate: 50 }
    ];
    
    const result = calculateDepartmentAverages(employees);
    
    expect(result).toEqual([
      { department: '개발팀', avgUsage: 65, count: 2 },
      { department: '인사팀', avgUsage: 50, count: 1 }
    ]);
  });
});
```

## Component Structure

```
frontend/src/components/
├── charts/
│   ├── LeaveAnalyticsCharts.tsx       # Main charts container
│   ├── LeaveAnalyticsCharts.test.tsx  # Tests
│   ├── RiskDistributionPie.tsx        # Pie chart component
│   ├── DepartmentUsageBar.tsx         # Bar chart component
│   ├── MonthlyTrendLine.tsx           # Line chart component
│   ├── LeaveStatisticsCards.tsx       # Statistics cards
│   └── utils/
│       ├── chartHelpers.ts            # Data processing utilities
│       └── chartHelpers.test.ts       # Utility tests
└── UnifiedLeaveOverview.tsx           # Updated with charts integration
```

## UI/UX Design

### Layout Options
1. **Accordion/Collapsible Section** (Recommended)
   - Hidden by default to maintain current view
   - Expandable analytics section below main table
   - Preserves performance for users who don't need charts

2. **Tab Addition**
   - New "분석" tab alongside existing tabs
   - Full-screen charts view

3. **Dashboard Grid**
   - 2x2 grid layout for charts
   - Responsive breakpoints for mobile

### Visual Design
- Use MUI theme colors for consistency
- Ensure charts are colorblind-friendly
- Add loading skeletons while data loads
- Include data export options for each chart

## Performance Considerations

1. **Lazy Loading**
   - Load Recharts only when analytics section is opened
   - Use React.lazy() and Suspense

2. **Data Optimization**
   - Memoize calculations with useMemo
   - Limit data points for better performance
   - Aggregate data on backend if dataset is large

3. **Responsive Design**
   - Charts resize automatically
   - Mobile-optimized layouts
   - Touch-friendly interactions

## Implementation Checklist

### Setup
- [ ] Install recharts: `npm install recharts`
- [ ] Install types: `npm install -D @types/recharts`
- [ ] Create charts directory structure

### Components
- [ ] Test 1: Basic chart component setup
- [ ] Test 2: Risk distribution pie chart
- [ ] Test 3: Department usage bar chart
- [ ] Test 4: Monthly trend line chart
- [ ] Test 5: Statistics summary cards
- [ ] Test 6: Main component integration
- [ ] Test 7: Data processing utilities

### Features
- [ ] Chart responsiveness
- [ ] Loading states
- [ ] Error handling
- [ ] Empty state handling
- [ ] Export chart as image
- [ ] Print-friendly styling

### Testing
- [ ] Unit tests for all components
- [ ] Integration tests with main component
- [ ] Visual regression tests (optional)
- [ ] Performance testing with large datasets

## Success Criteria

1. All charts render correctly with real data
2. Charts are responsive and mobile-friendly
3. Performance impact < 100ms on initial load
4. All tests passing (minimum 80% coverage)
5. Accessibility standards met (WCAG 2.1 AA)
6. User can toggle charts visibility
7. Charts update when filters change

## Risk Mitigation

1. **Bundle Size**: Monitor with webpack-bundle-analyzer
2. **Performance**: Implement virtual scrolling if needed
3. **Browser Compatibility**: Test in IE11 if required
4. **Data Privacy**: Ensure no sensitive data in charts

## Timeline Estimate

- Day 1: Setup and basic components (Phase 1-2)
- Day 2: Additional charts (Phase 3-4)
- Day 3: Integration and testing (Phase 5-7)
- Day 4: Polish and optimization

Total: 3-4 days
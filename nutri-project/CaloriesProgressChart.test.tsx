// CalorieProgressChart.test.tsx
import { render, screen } from '@testing-library/react';
import CalorieProgressChart from './CalorieProgressChart';

describe('CalorieProgressChart', () => {
  const mockData = [
    { date: '10/01', calories: 2000, goal: 2200 },
    { date: '10/02', calories: 2100, goal: 2200 },
    { date: '10/03', calories: 2300, goal: 2200 },
  ];

  it('renders chart with correct title', () => {
    render(<CalorieProgressChart data={mockData} goal={2200} />);
    expect(screen.getByText('Daily Caloric Intake')).toBeInTheDocument();
  });

  it('displays educational note about variability', () => {
    render(<CalorieProgressChart data={mockData} goal={2200} />);
    expect(screen.getByText(/Daily needs vary based on activity level/)).toBeInTheDocument();
  });

  it('shows non-judgmental language', () => {
    render(<CalorieProgressChart data={mockData} goal={2200} />);
    const text = screen.getByText(/help identify patterns over time/);
    expect(text).toBeInTheDocument();
    expect(screen.queryByText(/bad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import InsightsDayCard from '../../components/InsightsDayCard';

describe('InsightsDayCard', () => {
  it('caps the progress ring at a full circle when percentage exceeds 100%', () => {
    const day = {
      date: '2024-11-01',
      mealCount: 2,
      progress: {
        calories: {
          current: 2966,
          target: 1500,
          unit: 'kcal',
          percentage: 198, // over target
          remaining: 0,
          status: 'met',
        },
      },
    };

    render(<InsightsDayCard day={day} />);

    const caloriesCard = screen.getByText('Calories').closest('.insights-ring-card');
    expect(caloriesCard).toBeInTheDocument();

    const progressCircle = caloriesCard.querySelector('.insights-ring-progress');
    expect(progressCircle).toBeInTheDocument();

    const dashOffset = parseFloat(progressCircle.getAttribute('stroke-dashoffset'));
    expect(dashOffset).toBeCloseTo(0, 4);
  });
});

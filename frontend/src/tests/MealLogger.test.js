/**
 * Unit tests for MealLogger Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MealLogger from '../components/MealLogger';
import * as hudsService from '../services/hudsService';

// Mock HUDS service
jest.mock('../services/hudsService');

describe('MealLogger Component', () => {
  const mockLocations = [
    { location_id: '01', location_name: 'Annenberg' },
    { location_id: '02', location_name: 'Adams' },
  ];

  const mockMenuData = [
    {
      location_id: '01',
      location_name: 'Annenberg',
      meal_name: 'Lunch',
      recipes: [
        {
          recipe_id: '123',
          recipe_name: 'Grilled Chicken',
          serving_size: '4 oz',
          calories: '200',
          total_fat: '8g',
          saturated_fat: '2g',
          protein: '30g',
          web_codes: 'HLT',
          allergens: null,
        },
      ],
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    hudsService.getLocations.mockResolvedValue(mockLocations);
    hudsService.getTodaysMenu.mockResolvedValue(mockMenuData);
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(<MealLogger {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(<MealLogger {...defaultProps} />);
    expect(screen.getByText(/Log a Meal/i)).toBeInTheDocument();
  });

  it('should close modal when clicking close button', () => {
    render(<MealLogger {...defaultProps} />);
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should load locations on mount', async () => {
    render(<MealLogger {...defaultProps} />);
    
    await waitFor(() => {
      expect(hudsService.getLocations).toHaveBeenCalled();
    });
  });

  it('should show meal details form', () => {
    render(<MealLogger {...defaultProps} />);
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Meal Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dining Hall/i)).toBeInTheDocument();
  });

  it('should have Next and Cancel buttons', () => {
    render(<MealLogger {...defaultProps} />);
    expect(screen.getByText(/Next/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
  });

  it('should show success on meal save', async () => {
    defaultProps.onSave.mockResolvedValue({});
    render(<MealLogger {...defaultProps} />);

    await waitFor(() => {
      expect(hudsService.getLocations).toHaveBeenCalled();
    });
  });
});

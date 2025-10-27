/**
 * Unit tests for Home component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Home from './Home';
import * as hudsService from '../services/hudsService';

// Mock the HUDS service
jest.mock('../services/hudsService');

// Mock useAuth hook
const mockUser = {
  firstName: 'John',
  email: 'john@test.com',
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const renderWithAuth = (component) => {
  return render(component);
};

describe('Home Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display loading state initially', () => {
    hudsService.getLocations.mockReturnValue(new Promise(() => {}));
    hudsService.getTodaysMenu.mockReturnValue(new Promise(() => {}));

    renderWithAuth(<Home />);

    expect(screen.getByText(/Loading today's menu/i)).toBeInTheDocument();
  });

  it('should display user welcome message', async () => {
    hudsService.getLocations.mockResolvedValue([]);
    hudsService.getTodaysMenu.mockResolvedValue([]);

    renderWithAuth(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome,/i)).toBeInTheDocument();
      expect(screen.getByText(/John/i)).toBeInTheDocument();
    });
  });

  it('should fetch and display menu data', async () => {
    const mockLocations = [
      { location_number: '01', location_name: 'Annenberg' },
      { location_number: '05', location_name: 'Adams' },
    ];

    const mockMenu = [
      {
        locationNumber: '01',
        locationName: 'Annenberg',
        meals: {
          '1': {
            mealNumber: '1',
            mealName: 'Breakfast',
            categories: {
              '10': {
                categoryNumber: '10',
                categoryName: 'Entrees',
                recipes: [
                  {
                    ID: 1,
                    Recipe_Name: 'Scrambled Eggs',
                    Recipe_Print_As_Name: 'Scrambled Eggs',
                    Calories: '200',
                    Recipe_Web_Codes: 'VGT',
                    Allergens: 'Eggs',
                  },
                ],
              },
            },
          },
        },
      },
    ];

    hudsService.getLocations.mockResolvedValue(mockLocations);
    hudsService.getTodaysMenu.mockResolvedValue(mockMenu);

    renderWithAuth(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Annenberg')).toBeInTheDocument();
      expect(screen.getByText('Breakfast')).toBeInTheDocument();
      expect(screen.getByText('Entrees')).toBeInTheDocument();
      expect(screen.getByText('Scrambled Eggs')).toBeInTheDocument();
      expect(screen.getByText('200 cal')).toBeInTheDocument();
    });
  });

  it('should display location filter dropdown', async () => {
    const mockLocations = [
      { location_number: '01', location_name: 'Annenberg' },
      { location_number: '05', location_name: 'Adams' },
    ];

    hudsService.getLocations.mockResolvedValue(mockLocations);
    hudsService.getTodaysMenu.mockResolvedValue([]);

    renderWithAuth(<Home />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Filter by Dining Hall/i)).toBeInTheDocument();
      expect(screen.getByText('All Locations')).toBeInTheDocument();
      expect(screen.getByText('Annenberg')).toBeInTheDocument();
      expect(screen.getByText('Adams')).toBeInTheDocument();
    });
  });

  it('should filter menu by location when location is selected', async () => {
    const mockLocations = [
      { location_number: '01', location_name: 'Annenberg' },
      { location_number: '05', location_name: 'Adams' },
    ];

    hudsService.getLocations.mockResolvedValue(mockLocations);
    hudsService.getTodaysMenu.mockResolvedValue([]);

    renderWithAuth(<Home />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Filter by Dining Hall/i)).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Filter by Dining Hall/i);
    await userEvent.selectOptions(select, '05');

    await waitFor(() => {
      expect(hudsService.getTodaysMenu).toHaveBeenCalledWith('05');
    });
  });

  it('should display no menu message when menu is empty', async () => {
    hudsService.getLocations.mockResolvedValue([]);
    hudsService.getTodaysMenu.mockResolvedValue([]);

    renderWithAuth(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/No menu available for today/i)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    hudsService.getLocations.mockRejectedValue(new Error('API Error'));
    hudsService.getTodaysMenu.mockRejectedValue(new Error('API Error'));

    renderWithAuth(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to load today's menu/i)).toBeInTheDocument();
    });
  });

  it('should open nutrition modal when recipe card is clicked', async () => {
    const mockMenu = [
      {
        locationNumber: '01',
        locationName: 'Annenberg',
        meals: {
          '1': {
            mealNumber: '1',
            mealName: 'Breakfast',
            categories: {
              '10': {
                categoryNumber: '10',
                categoryName: 'Entrees',
                recipes: [
                  {
                    ID: 1,
                    Recipe_Name: 'Scrambled Eggs',
                    Recipe_Print_As_Name: 'Scrambled Eggs',
                    Calories: '200',
                    Serving_Size: '1 cup',
                    Total_Fat: '10g',
                    Protein: '15g',
                    Allergens: 'Eggs',
                  },
                ],
              },
            },
          },
        },
      },
    ];

    hudsService.getLocations.mockResolvedValue([]);
    hudsService.getTodaysMenu.mockResolvedValue(mockMenu);

    renderWithAuth(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Scrambled Eggs')).toBeInTheDocument();
    });

    const recipeCard = screen.getByText('Scrambled Eggs').closest('.recipe-card');
    await userEvent.click(recipeCard);

    await waitFor(() => {
      expect(screen.getByText('Nutrition Facts')).toBeInTheDocument();
      expect(screen.getByText(/Serving Size: 1 cup/i)).toBeInTheDocument();
    });
  });

  it('should close nutrition modal when close button is clicked', async () => {
    const mockMenu = [
      {
        locationNumber: '01',
        locationName: 'Annenberg',
        meals: {
          '1': {
            mealNumber: '1',
            mealName: 'Breakfast',
            categories: {
              '10': {
                categoryNumber: '10',
                categoryName: 'Entrees',
                recipes: [
                  {
                    ID: 1,
                    Recipe_Name: 'Scrambled Eggs',
                    Calories: '200',
                  },
                ],
              },
            },
          },
        },
      },
    ];

    hudsService.getLocations.mockResolvedValue([]);
    hudsService.getTodaysMenu.mockResolvedValue(mockMenu);

    renderWithAuth(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Scrambled Eggs')).toBeInTheDocument();
    });

    // Open modal
    const recipeCard = screen.getByText('Scrambled Eggs').closest('.recipe-card');
    await userEvent.click(recipeCard);

    await waitFor(() => {
      expect(screen.getByText('Nutrition Facts')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByText('×');
    await userEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Nutrition Facts')).not.toBeInTheDocument();
    });
  });

  it('should display dietary badges when present', async () => {
    const mockMenu = [
      {
        locationNumber: '01',
        locationName: 'Annenberg',
        meals: {
          '1': {
            mealNumber: '1',
            mealName: 'Breakfast',
            categories: {
              '10': {
                categoryNumber: '10',
                categoryName: 'Entrees',
                recipes: [
                  {
                    ID: 1,
                    Recipe_Name: 'Fruit Salad',
                    Calories: '100',
                    Recipe_Web_Codes: 'VGN VGT WGRN',
                  },
                ],
              },
            },
          },
        },
      },
    ];

    hudsService.getLocations.mockResolvedValue([]);
    hudsService.getTodaysMenu.mockResolvedValue(mockMenu);

    renderWithAuth(<Home />);

    await waitFor(() => {
      expect(screen.getByText('VGN')).toBeInTheDocument();
      expect(screen.getByText('VGT')).toBeInTheDocument();
      expect(screen.getByText('WGRN')).toBeInTheDocument();
    });
  });

  it('should display allergen warning when present', async () => {
    const mockMenu = [
      {
        locationNumber: '01',
        locationName: 'Annenberg',
        meals: {
          '1': {
            mealNumber: '1',
            mealName: 'Breakfast',
            categories: {
              '10': {
                categoryNumber: '10',
                categoryName: 'Entrees',
                recipes: [
                  {
                    ID: 1,
                    Recipe_Name: 'Peanut Butter Toast',
                    Calories: '300',
                    Allergens: 'Peanuts, Wheat',
                  },
                ],
              },
            },
          },
        },
      },
    ];

    hudsService.getLocations.mockResolvedValue([]);
    hudsService.getTodaysMenu.mockResolvedValue(mockMenu);

    renderWithAuth(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/Allergens/i)).toBeInTheDocument();
    });
  });
});


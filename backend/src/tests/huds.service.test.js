/**
 * Unit tests for HUDS API Service
 */

const axios = require('axios');
const hudsService = require('../services/hudsService');

// Mock axios
jest.mock('axios');

describe('HUDS Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocations', () => {
    it('should fetch all dining locations', async () => {
      const mockLocations = [
        { location_number: '01', location_name: 'Annenberg' },
        { location_number: '05', location_name: 'Adams' },
      ];

      axios.get.mockResolvedValue({ data: mockLocations });

      const result = await hudsService.getLocations();

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/locations'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockLocations);
    });

    it('should handle API errors', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(hudsService.getLocations()).rejects.toThrow('Network error');
    });
  });

  describe('getRecipes', () => {
    it('should fetch recipes without filters', async () => {
      const mockRecipes = [
        { ID: 1, Recipe_Name: 'Chicken' },
        { ID: 2, Recipe_Name: 'Rice' },
      ];

      axios.get.mockResolvedValue({ data: mockRecipes });

      const result = await hudsService.getRecipes();

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/recipes'),
        expect.objectContaining({
          params: {},
        })
      );
      expect(result).toEqual(mockRecipes);
    });

    it('should fetch recipes with date filter', async () => {
      const mockRecipes = [{ ID: 1, Recipe_Name: 'Chicken' }];
      const testDate = new Date('2025-10-27T00:00:00.000Z');

      axios.get.mockResolvedValue({ data: mockRecipes });

      await hudsService.getRecipes(testDate);

      const callArgs = axios.get.mock.calls[0][1];
      expect(callArgs.params).toHaveProperty('date');
      expect(callArgs.params.date).toMatch(/10\/2[67]\/2025/); // Allow for timezone differences
    });

    it('should fetch recipes with location filter', async () => {
      const mockRecipes = [{ ID: 1, Recipe_Name: 'Chicken' }];

      axios.get.mockResolvedValue({ data: mockRecipes });

      await hudsService.getRecipes(null, '05');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/recipes'),
        expect.objectContaining({
          params: { locationId: '05' },
        })
      );
    });

    it('should fetch recipes with both date and location filters', async () => {
      const mockRecipes = [{ ID: 1, Recipe_Name: 'Chicken' }];
      const testDate = new Date('2025-10-27T12:00:00.000Z');

      axios.get.mockResolvedValue({ data: mockRecipes });

      await hudsService.getRecipes(testDate, '05');

      const callArgs = axios.get.mock.calls[0][1];
      expect(callArgs.params).toHaveProperty('date');
      expect(callArgs.params).toHaveProperty('locationId', '05');
    });
  });

  describe('getRecipeById', () => {
    it('should fetch a single recipe by ID', async () => {
      const mockRecipe = { ID: 123, Recipe_Name: 'Chicken Parmesan' };

      axios.get.mockResolvedValue({ data: mockRecipe });

      const result = await hudsService.getRecipeById(123);

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/123'),
        expect.any(Object)
      );
      expect(result).toEqual(mockRecipe);
    });
  });

  describe('getTodaysMenu', () => {
    it('should organize menu data by location, meal, and category', async () => {
      const mockRecipes = [
        {
          ID: 1,
          Recipe_Name: 'Scrambled Eggs',
          Location_Number: '01',
          Location_Name: 'Annenberg',
          Meal_Number: '1',
          Meal_Name: 'Breakfast',
          Menu_Category_Number: '10',
          Menu_Category_Name: 'Entrees',
        },
        {
          ID: 2,
          Recipe_Name: 'Toast',
          Location_Number: '01',
          Location_Name: 'Annenberg',
          Meal_Number: '1',
          Meal_Name: 'Breakfast',
          Menu_Category_Number: '20',
          Menu_Category_Name: 'Sides',
        },
        {
          ID: 3,
          Recipe_Name: 'Chicken',
          Location_Number: '01',
          Location_Name: 'Annenberg',
          Meal_Number: '2',
          Meal_Name: 'Lunch',
          Menu_Category_Number: '10',
          Menu_Category_Name: 'Entrees',
        },
      ];

      const mockEvents = [];

      axios.get
        .mockResolvedValueOnce({ data: mockRecipes })
        .mockResolvedValueOnce({ data: mockEvents });

      const result = await hudsService.getTodaysMenu();

      expect(result).toHaveLength(1); // One location
      expect(result[0].locationName).toBe('Annenberg');
      expect(Object.keys(result[0].meals)).toHaveLength(2); // Breakfast and Lunch

      const breakfast = result[0].meals['1'];
      expect(breakfast.mealName).toBe('Breakfast');
      expect(Object.keys(breakfast.categories)).toHaveLength(2); // Entrees and Sides

      const breakfastEntrees = breakfast.categories['10'];
      expect(breakfastEntrees.recipes).toHaveLength(1);
      expect(breakfastEntrees.recipes[0].Recipe_Name).toBe('Scrambled Eggs');
    });

    it('should filter by location when locationId is provided', async () => {
      const mockRecipes = [];
      const mockEvents = [];

      axios.get
        .mockResolvedValueOnce({ data: mockRecipes })
        .mockResolvedValueOnce({ data: mockEvents });

      await hudsService.getTodaysMenu('05');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/recipes'),
        expect.objectContaining({
          params: expect.objectContaining({ locationId: '05' }),
        })
      );
    });

    it('should handle empty menu data', async () => {
      axios.get
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] });

      const result = await hudsService.getTodaysMenu();

      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('API Error'));

      await expect(hudsService.getTodaysMenu()).rejects.toThrow('API Error');
    });
  });

  describe('getEvents', () => {
    it('should fetch events without filters', async () => {
      const mockEvents = [
        { event_id: 1, event_name: 'Breakfast' },
      ];

      axios.get.mockResolvedValue({ data: mockEvents });

      const result = await hudsService.getEvents();

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/events'),
        expect.objectContaining({
          params: {},
        })
      );
      expect(result).toEqual(mockEvents);
    });

    it('should fetch events with date and location filters', async () => {
      const mockEvents = [];
      const testDate = new Date('2025-10-27T12:00:00.000Z');

      axios.get.mockResolvedValue({ data: mockEvents });

      await hudsService.getEvents(testDate, '05');

      const callArgs = axios.get.mock.calls[0][1];
      expect(callArgs.params).toHaveProperty('date');
      expect(callArgs.params).toHaveProperty('locationId', '05');
    });
  });
});


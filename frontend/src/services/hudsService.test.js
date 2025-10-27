/**
 * Unit tests for Frontend HUDS Service
 */

import { getLocations, getTodaysMenu, getRecipes, getRecipeById } from './hudsService';

// Mock fetch
global.fetch = jest.fn();

describe('Frontend HUDS Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocations', () => {
    it('should fetch all dining locations', async () => {
      const mockLocations = [
        { location_number: '01', location_name: 'Annenberg' },
        { location_number: '05', location_name: 'Adams' },
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockLocations,
      });

      const result = await getLocations();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/api/huds/locations'),
        }),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        })
      );
      expect(result).toEqual(mockLocations);
    });

    it('should throw error on failed request', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(getLocations()).rejects.toThrow('HUDS API error: 500');
    });
  });

  describe('getTodaysMenu', () => {
    it('should fetch today\'s menu without location filter', async () => {
      const mockMenu = [
        {
          locationNumber: '01',
          locationName: 'Annenberg',
          meals: {},
        },
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockMenu,
      });

      const result = await getTodaysMenu();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/api/huds/menu/today'),
        }),
        expect.any(Object)
      );
      expect(result).toEqual(mockMenu);
    });

    it('should fetch today\'s menu with location filter', async () => {
      const mockMenu = [
        {
          locationNumber: '05',
          locationName: 'Adams',
          meals: {},
        },
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockMenu,
      });

      const result = await getTodaysMenu('05');

      const fetchCall = global.fetch.mock.calls[0][0];
      expect(fetchCall.href).toContain('/api/huds/menu/today');
      expect(fetchCall.href).toContain('locationId=05');
      expect(result).toEqual(mockMenu);
    });
  });

  describe('getRecipes', () => {
    it('should fetch recipes without filters', async () => {
      const mockRecipes = [
        { ID: 1, Recipe_Name: 'Chicken' },
        { ID: 2, Recipe_Name: 'Rice' },
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockRecipes,
      });

      const result = await getRecipes();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/api/huds/recipes'),
        }),
        expect.any(Object)
      );
      expect(result).toEqual(mockRecipes);
    });

    it('should fetch recipes with date filter', async () => {
      const mockRecipes = [{ ID: 1, Recipe_Name: 'Chicken' }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockRecipes,
      });

      const result = await getRecipes('10/27/2025');

      const fetchCall = global.fetch.mock.calls[0][0];
      expect(fetchCall.href).toContain('date=10%2F27%2F2025');
      expect(result).toEqual(mockRecipes);
    });

    it('should fetch recipes with location filter', async () => {
      const mockRecipes = [{ ID: 1, Recipe_Name: 'Chicken' }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockRecipes,
      });

      const result = await getRecipes(null, '05');

      const fetchCall = global.fetch.mock.calls[0][0];
      expect(fetchCall.href).toContain('locationId=05');
      expect(result).toEqual(mockRecipes);
    });
  });

  describe('getRecipeById', () => {
    it('should fetch a single recipe by ID', async () => {
      const mockRecipe = { ID: 123, Recipe_Name: 'Chicken Parmesan' };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockRecipe,
      });

      const result = await getRecipeById(123);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/api/huds/recipes/123'),
        }),
        expect.any(Object)
      );
      expect(result).toEqual(mockRecipe);
    });
  });
});


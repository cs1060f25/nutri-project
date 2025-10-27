/**
 * Unit tests for Frontend Meal Log Service
 */

import { saveMealLog, getMealLogs, updateMealLog, deleteMealLog } from '../services/mealLogService';

// Mock fetch globally
global.fetch = jest.fn();

describe('Frontend Meal Log Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  });

  describe('saveMealLog', () => {
    it('should save a meal log successfully', async () => {
      const mealData = {
        mealDate: '2025-10-27',
        mealType: 'lunch',
        locationId: '01',
        locationName: 'Annenberg',
        items: [
          { recipeId: '123', recipeName: 'Chicken', quantity: 1 },
        ],
      };

      const mockResponse = {
        message: 'Meal logged successfully',
        meal: { id: 'meal123', ...mealData },
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await saveMealLog(mealData, 'test-token');

      expect(global.fetch).toHaveBeenCalledWith('/api/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(mealData),
      });

      expect(result).toEqual(mockResponse);
    });

    it('should throw error on failed request', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid meal data' }),
      });

      await expect(saveMealLog({}, 'test-token')).rejects.toThrow('Invalid meal data');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await expect(saveMealLog({}, 'test-token')).rejects.toThrow('Network error');
    });

    it('should work without access token', async () => {
      const mealData = { mealDate: '2025-10-27' };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await saveMealLog(mealData);

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBeUndefined();
    });
  });

  describe('getMealLogs', () => {
    it('should fetch meal logs with filters', async () => {
      const mockLogs = [
        { id: 'meal1', mealType: 'breakfast' },
        { id: 'meal2', mealType: 'lunch' },
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ meals: mockLogs, count: 2 }),
      });

      const filters = {
        startDate: '2025-10-01',
        endDate: '2025-10-31',
        mealType: 'lunch',
      };

      const result = await getMealLogs(filters, 'test-token');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/meals?'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );

      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('startDate=2025-10-01');
      expect(calledUrl).toContain('endDate=2025-10-31');
      expect(calledUrl).toContain('mealType=lunch');

      expect(result.meals).toEqual(mockLogs);
    });

    it('should fetch all meals without filters', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ meals: [], count: 0 }),
      });

      await getMealLogs({}, 'test-token');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/meals',
        expect.any(Object)
      );
    });

    it('should handle fetch errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      await expect(getMealLogs({}, 'test-token')).rejects.toThrow();
    });
  });

  describe('updateMealLog', () => {
    it('should update a meal log', async () => {
      const updates = {
        mealType: 'dinner',
        items: [{ recipeId: '456', quantity: 2 }],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Updated', meal: { id: 'meal123', ...updates } }),
      });

      const result = await updateMealLog('meal123', updates, 'test-token');

      expect(global.fetch).toHaveBeenCalledWith('/api/meals/meal123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(updates),
      });

      expect(result.meal.id).toBe('meal123');
    });

    it('should handle update errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Meal not found' }),
      });

      await expect(updateMealLog('meal123', {}, 'test-token')).rejects.toThrow('Meal not found');
    });
  });

  describe('deleteMealLog', () => {
    it('should delete a meal log', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Deleted', id: 'meal123' }),
      });

      const result = await deleteMealLog('meal123', 'test-token');

      expect(global.fetch).toHaveBeenCalledWith('/api/meals/meal123', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(result.id).toBe('meal123');
    });

    it('should handle delete errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Meal not found' }),
      });

      await expect(deleteMealLog('meal123', 'test-token')).rejects.toThrow('Meal not found');
    });
  });
});


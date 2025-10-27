/**
 * Unit tests for Meal Log Controller
 */

const mealLogController = require('../controllers/mealLogController');
const mealLogService = require('../services/mealLogService');

// Mock the service
jest.mock('../services/mealLogService');

describe('Meal Log Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      query: {},
      params: {},
      user: {
        uid: 'user123',
        email: 'user@test.com',
      },
    };
    
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('createMealLog', () => {
    it('should create a meal log successfully', async () => {
      const mealData = {
        mealDate: '2025-10-27',
        mealType: 'lunch',
        locationId: '01',
        locationName: 'Annenberg',
        items: [
          { recipeId: '123', recipeName: 'Chicken', quantity: 1, calories: '200' },
        ],
      };

      mockReq.body = mealData;

      const mockMealLog = {
        id: 'meal123',
        ...mealData,
        userId: 'user123',
        totals: { calories: 200 },
      };

      mealLogService.createMealLog.mockResolvedValue(mockMealLog);

      await mealLogController.createMealLog(mockReq, mockRes);

      expect(mealLogService.createMealLog).toHaveBeenCalledWith(
        'user123',
        'user@test.com',
        mealData
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Meal logged successfully',
        meal: mockMealLog,
      });
    });

    it('should return 400 when required fields are missing', async () => {
      mockReq.body = {
        mealDate: '2025-10-27',
        // missing mealType, locationId, items
      };

      await mealLogController.createMealLog(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.stringContaining('Missing required fields'),
      });
    });

    it('should return 400 when items array is empty', async () => {
      mockReq.body = {
        mealDate: '2025-10-27',
        mealType: 'lunch',
        locationId: '01',
        items: [],
      };

      await mealLogController.createMealLog(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.stringContaining('Missing required fields'),
      });
    });

    it('should return 400 for invalid meal type', async () => {
      mockReq.body = {
        mealDate: '2025-10-27',
        mealType: 'snack', // invalid
        locationId: '01',
        items: [{ recipeId: '123' }],
      };

      await mealLogController.createMealLog(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.stringContaining('Invalid mealType'),
      });
    });

    it('should handle service errors', async () => {
      mockReq.body = {
        mealDate: '2025-10-27',
        mealType: 'lunch',
        locationId: '01',
        items: [{ recipeId: '123' }],
      };

      mealLogService.createMealLog.mockRejectedValue(new Error('Database error'));

      await mealLogController.createMealLog(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to create meal log',
      });
    });
  });

  describe('getMealLogs', () => {
    it('should return user\'s meal logs', async () => {
      const mockMeals = [
        { id: 'meal1', mealType: 'breakfast' },
        { id: 'meal2', mealType: 'lunch' },
      ];

      mealLogService.getMealLogs.mockResolvedValue(mockMeals);

      await mealLogController.getMealLogs(mockReq, mockRes);

      expect(mealLogService.getMealLogs).toHaveBeenCalledWith('user123', {});
      expect(mockRes.json).toHaveBeenCalledWith({
        meals: mockMeals,
        count: 2,
      });
    });

    it('should pass filters to service', async () => {
      mockReq.query = {
        startDate: '2025-10-01',
        endDate: '2025-10-31',
        mealType: 'lunch',
        limit: '10',
      };

      mealLogService.getMealLogs.mockResolvedValue([]);

      await mealLogController.getMealLogs(mockReq, mockRes);

      expect(mealLogService.getMealLogs).toHaveBeenCalledWith('user123', {
        startDate: '2025-10-01',
        endDate: '2025-10-31',
        mealType: 'lunch',
        limit: 10,
      });
    });

    it('should handle service errors', async () => {
      mealLogService.getMealLogs.mockRejectedValue(new Error('Database error'));

      await mealLogController.getMealLogs(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMealLogById', () => {
    it('should return a specific meal log', async () => {
      mockReq.params.id = 'meal123';
      const mockMeal = { id: 'meal123', mealType: 'breakfast' };

      mealLogService.getMealLogById.mockResolvedValue(mockMeal);

      await mealLogController.getMealLogById(mockReq, mockRes);

      expect(mealLogService.getMealLogById).toHaveBeenCalledWith('user123', 'meal123');
      expect(mockRes.json).toHaveBeenCalledWith(mockMeal);
    });

    it('should return 404 when meal not found', async () => {
      mockReq.params.id = 'nonexistent';

      mealLogService.getMealLogById.mockRejectedValue(new Error('Meal log not found'));

      await mealLogController.getMealLogById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Meal log not found',
      });
    });

    it('should return 403 for unauthorized access', async () => {
      mockReq.params.id = 'meal123';

      mealLogService.getMealLogById.mockRejectedValue(
        new Error('Unauthorized access to meal log')
      );

      await mealLogController.getMealLogById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized access',
      });
    });
  });

  describe('updateMealLog', () => {
    it('should update a meal log', async () => {
      mockReq.params.id = 'meal123';
      mockReq.body = {
        mealType: 'dinner',
        items: [{ recipeId: '456', quantity: 2 }],
      };

      const mockUpdated = { id: 'meal123', ...mockReq.body };
      mealLogService.updateMealLog.mockResolvedValue(mockUpdated);

      await mealLogController.updateMealLog(mockReq, mockRes);

      expect(mealLogService.updateMealLog).toHaveBeenCalledWith(
        'user123',
        'meal123',
        mockReq.body
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Meal log updated successfully',
        meal: mockUpdated,
      });
    });

    it('should not allow updating userId', async () => {
      mockReq.params.id = 'meal123';
      mockReq.body = {
        userId: 'hacker456', // Attempt to change user
        mealType: 'dinner',
      };

      mealLogService.updateMealLog.mockResolvedValue({ id: 'meal123' });

      await mealLogController.updateMealLog(mockReq, mockRes);

      // userId should be stripped out
      const callArgs = mealLogService.updateMealLog.mock.calls[0][2];
      expect(callArgs.userId).toBeUndefined();
    });

    it('should return 404 when meal not found', async () => {
      mockReq.params.id = 'nonexistent';
      mockReq.body = { mealType: 'dinner' };

      mealLogService.updateMealLog.mockRejectedValue(new Error('Meal log not found'));

      await mealLogController.updateMealLog(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteMealLog', () => {
    it('should delete a meal log', async () => {
      mockReq.params.id = 'meal123';

      mealLogService.deleteMealLog.mockResolvedValue({ id: 'meal123', deleted: true });

      await mealLogController.deleteMealLog(mockReq, mockRes);

      expect(mealLogService.deleteMealLog).toHaveBeenCalledWith('user123', 'meal123');
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Meal log deleted successfully',
        id: 'meal123',
      });
    });

    it('should return 404 when meal not found', async () => {
      mockReq.params.id = 'nonexistent';

      mealLogService.deleteMealLog.mockRejectedValue(new Error('Meal log not found'));

      await mealLogController.deleteMealLog(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for unauthorized access', async () => {
      mockReq.params.id = 'meal123';

      mealLogService.deleteMealLog.mockRejectedValue(
        new Error('Unauthorized access to meal log')
      );

      await mealLogController.deleteMealLog(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getDailySummary', () => {
    it('should return daily nutritional summary', async () => {
      mockReq.params.date = '2025-10-27';

      const mockSummary = {
        date: '2025-10-27',
        mealCount: 3,
        dailyTotals: { calories: 2000 },
      };

      mealLogService.getDailySummary.mockResolvedValue(mockSummary);

      await mealLogController.getDailySummary(mockReq, mockRes);

      expect(mealLogService.getDailySummary).toHaveBeenCalledWith('user123', '2025-10-27');
      expect(mockRes.json).toHaveBeenCalledWith(mockSummary);
    });

    it('should handle service errors', async () => {
      mockReq.params.date = '2025-10-27';

      mealLogService.getDailySummary.mockRejectedValue(new Error('Database error'));

      await mealLogController.getDailySummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});


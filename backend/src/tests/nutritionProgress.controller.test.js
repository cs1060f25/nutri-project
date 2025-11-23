/**
 * Unit tests for Nutrition Progress Controller
 */

const nutritionProgressController = require('../controllers/nutritionProgressController');
const nutritionPlanService = require('../services/nutritionPlanService');
const mealLogService = require('../services/mealLogService');

// Mock the services
jest.mock('../services/nutritionPlanService');
jest.mock('../services/mealLogService');

describe('Nutrition Progress Controller', () => {
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

  describe('getTodayProgress - Date Calculation', () => {
    it('should use Eastern Time (America/New_York) for today\'s date, not server time', async () => {
      // Mock active plan
      const mockPlan = {
        id: 'plan123',
        presetName: 'Balanced',
        metrics: {
          calories: { enabled: true, target: 2000, unit: 'kcal' },
          protein: { enabled: true, target: 150, unit: 'g' },
        },
      };
      nutritionPlanService.getActiveNutritionPlan.mockResolvedValue(mockPlan);

      // Mock daily summary
      const mockSummary = {
        date: '2025-11-23',
        mealCount: 0,
        meals: [],
        dailyTotals: {
          calories: 0,
          protein: '0.0g',
          totalFat: '0.0g',
          saturatedFat: '0.0g',
          transFat: '0.0g',
          cholesterol: '0.0mg',
          sodium: '0.0mg',
          totalCarb: '0.0g',
          dietaryFiber: '0.0g',
          sugars: '0.0g',
        },
      };
      mealLogService.getDailySummary.mockResolvedValue(mockSummary);

      await nutritionProgressController.getTodayProgress(mockReq, mockRes);

      // Verify getDailySummary was called
      expect(mealLogService.getDailySummary).toHaveBeenCalled();

      // Get the date that was passed to getDailySummary
      const calledDate = mealLogService.getDailySummary.mock.calls[0][1];

      // Calculate what Eastern Time date should be
      const now = new Date();
      const etFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = etFormatter.formatToParts(now);
      const expectedEasternDate = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;

      // Calculate what server time date would be (using UTC)
      const serverDate = now.toISOString().split('T')[0];

      // The called date should match Eastern Time, not server time
      expect(calledDate).toBe(expectedEasternDate);
      
      // If server is in a different timezone, the dates might differ
      // This test ensures we're using Eastern Time, not server time
      if (serverDate !== expectedEasternDate) {
        // If they differ, verify we're using Eastern Time (the correct one)
        expect(calledDate).toBe(expectedEasternDate);
        expect(calledDate).not.toBe(serverDate);
      }

      expect(mockRes.json).toHaveBeenCalled();
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.date).toBe(expectedEasternDate);
    });

    it('should detect bug: using server UTC time instead of Eastern Time', async () => {
      // This test specifically detects the bug where we used:
      // const today = new Date().toISOString().split('T')[0]; // WRONG - uses server UTC time
      // Instead of:
      // const today = getEasternDate(); // CORRECT - uses Eastern Time
      
      const mockPlan = {
        id: 'plan123',
        presetName: 'Balanced',
        metrics: {
          calories: { enabled: true, target: 2000, unit: 'kcal' },
        },
      };
      nutritionPlanService.getActiveNutritionPlan.mockResolvedValue(mockPlan);

      const mockSummary = {
        date: '2025-11-23',
        mealCount: 0,
        meals: [],
        dailyTotals: {
          calories: 0,
          protein: '0.0g',
          totalFat: '0.0g',
          saturatedFat: '0.0g',
          transFat: '0.0g',
          cholesterol: '0.0mg',
          sodium: '0.0mg',
          totalCarb: '0.0g',
          dietaryFiber: '0.0g',
          sugars: '0.0g',
        },
      };
      mealLogService.getDailySummary.mockResolvedValue(mockSummary);

      await nutritionProgressController.getTodayProgress(mockReq, mockRes);

      const calledDate = mealLogService.getDailySummary.mock.calls[0][1];

      // Calculate what Eastern Time date should be (CORRECT)
      const now = new Date();
      const etFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = etFormatter.formatToParts(now);
      const expectedEasternDate = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;

      // Calculate what server UTC time would give (THE BUG)
      const buggyServerUtcDate = now.toISOString().split('T')[0];

      // The correct implementation should use Eastern Time
      expect(calledDate).toBe(expectedEasternDate);
      
      // If dates differ, this test would catch the bug
      if (buggyServerUtcDate !== expectedEasternDate) {
        // This proves we're using Eastern Time, not the buggy server UTC time
        expect(calledDate).not.toBe(buggyServerUtcDate);
        console.log(`✅ Bug detection: Server UTC would be ${buggyServerUtcDate}, but we correctly use Eastern ${expectedEasternDate}`);
      } else {
        console.log(`ℹ️  Server UTC and Eastern Time are the same date: ${buggyServerUtcDate}`);
      }
    });

    it('should use Eastern Time, not server UTC time', async () => {
      // Mock active plan
      const mockPlan = {
        id: 'plan123',
        presetName: 'Balanced',
        metrics: {
          calories: { enabled: true, target: 2000, unit: 'kcal' },
        },
      };
      nutritionPlanService.getActiveNutritionPlan.mockResolvedValue(mockPlan);

      // Mock daily summary
      const mockSummary = {
        date: '2025-11-23',
        mealCount: 0,
        meals: [],
        dailyTotals: {
          calories: 0,
          protein: '0.0g',
          totalFat: '0.0g',
          saturatedFat: '0.0g',
          transFat: '0.0g',
          cholesterol: '0.0mg',
          sodium: '0.0mg',
          totalCarb: '0.0g',
          dietaryFiber: '0.0g',
          sugars: '0.0g',
        },
      };
      mealLogService.getDailySummary.mockResolvedValue(mockSummary);

      await nutritionProgressController.getTodayProgress(mockReq, mockRes);

      // Get the date that was passed to getDailySummary
      const calledDate = mealLogService.getDailySummary.mock.calls[0][1];

      // Calculate what Eastern Time date should be
      const now = new Date();
      const etFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = etFormatter.formatToParts(now);
      const expectedEasternDate = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;

      // Calculate what server UTC time date would be
      const serverUtcDate = now.toISOString().split('T')[0];

      // The called date MUST match Eastern Time
      expect(calledDate).toBe(expectedEasternDate);
      
      // If server is in UTC and it's late night/early morning, dates will differ
      // This test ensures we're using Eastern Time (correct) not server time (wrong)
      // The bug we're detecting: using serverUtcDate instead of expectedEasternDate
      if (serverUtcDate !== expectedEasternDate) {
        // If they differ, we MUST be using Eastern Time, not server time
        expect(calledDate).toBe(expectedEasternDate);
        expect(calledDate).not.toBe(serverUtcDate);
        console.log(`✅ Test detected timezone difference: Server UTC=${serverUtcDate}, Eastern=${expectedEasternDate}, Using=${calledDate}`);
      } else {
        console.log(`ℹ️  Server UTC and Eastern Time are the same date: ${serverUtcDate}`);
      }
    });

    it('should use Eastern Time consistently across multiple calls', async () => {
      const mockPlan = {
        id: 'plan123',
        presetName: 'Balanced',
        metrics: {
          calories: { enabled: true, target: 2000, unit: 'kcal' },
        },
      };
      nutritionPlanService.getActiveNutritionPlan.mockResolvedValue(mockPlan);

      const mockSummary = {
        date: '2025-11-23',
        mealCount: 0,
        meals: [],
        dailyTotals: {
          calories: 0,
          protein: '0.0g',
          totalFat: '0.0g',
          saturatedFat: '0.0g',
          transFat: '0.0g',
          cholesterol: '0.0mg',
          sodium: '0.0mg',
          totalCarb: '0.0g',
          dietaryFiber: '0.0g',
          sugars: '0.0g',
        },
      };
      mealLogService.getDailySummary.mockResolvedValue(mockSummary);

      // Make multiple calls
      await nutritionProgressController.getTodayProgress(mockReq, mockRes);
      await nutritionProgressController.getTodayProgress(mockReq, mockRes);
      await nutritionProgressController.getTodayProgress(mockReq, mockRes);

      // All calls should use the same Eastern Time date
      const calls = mealLogService.getDailySummary.mock.calls;
      const dates = calls.map(call => call[1]);
      
      // All dates should be the same (Eastern Time for "now")
      expect(new Set(dates).size).toBe(1);
      
      // Verify it's Eastern Time format
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      expect(dates[0]).toMatch(datePattern);
    });
  });
});


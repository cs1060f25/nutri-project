/**
 * Integration Test: End-to-End Meal Logging and Progress Tracking Flow
 * 
 * Tests the complete flow:
 * 1. User authentication
 * 2. Create/activate nutrition plan
 * 3. Log a meal with multiple items
 * 4. Calculate nutrition totals
 * 5. Fetch today's progress
 * 6. Verify progress calculations and data persistence
 */

// Mock Firebase Admin before any imports
const mockFirestore = {
  collection: jest.fn(),
};

const mockDoc = jest.fn();
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
  add: jest.fn(),
  where: jest.fn(),
  get: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

mockFirestore.collection = mockCollection;

const mockAdmin = {
  firestore: jest.fn(() => mockFirestore),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
};

mockAdmin.firestore.FieldValue = {
  serverTimestamp: jest.fn(() => 'TIMESTAMP'),
};

jest.mock('../config/firebase', () => ({
  admin: mockAdmin,
}));

// Mock environment variables
process.env.GEMINI_API_KEY_1 = 'test-api-key';

// Mock meal log service
jest.mock('../services/mealLogService', () => ({
  createMealLog: jest.fn(),
  getDailySummary: jest.fn(),
  getMealLogs: jest.fn(),
}));

// Mock nutrition plan service
jest.mock('../services/nutritionPlanService', () => ({
  saveNutritionPlan: jest.fn(),
  getActiveNutritionPlan: jest.fn(),
}));

const mealLogController = require('../controllers/mealLogController');
const nutritionProgressController = require('../controllers/nutritionProgressController');
const nutritionPlanService = require('../services/nutritionPlanService');
const mealLogService = require('../services/mealLogService');

describe('Integration Test: Meal Logging and Progress Tracking Flow', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let userId;
  let planId;
  let mealLogId;

  beforeEach(() => {
    jest.clearAllMocks();
    
    userId = 'test-user-123';
    planId = 'plan-123';
    mealLogId = 'meal-log-123';

    // Mock request with authenticated user
    mockReq = {
      user: {
        uid: userId,
        email: 'test@example.com',
      },
      body: {},
      params: {},
      query: {},
    };

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Setup Firestore mocks
    const mockDocRef = {
      id: planId,
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      collection: jest.fn(),
    };

    const mockMealDocRef = {
      id: mealLogId,
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
    };

    const mockMealCollection = {
      doc: jest.fn(() => mockMealDocRef),
      add: jest.fn(() => Promise.resolve({ id: mealLogId })),
      where: jest.fn(() => ({
        get: jest.fn(),
        orderBy: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
      get: jest.fn(),
      orderBy: jest.fn(() => ({
        get: jest.fn(),
      })),
    };

    const mockPlanCollection = {
      doc: jest.fn(() => mockDocRef),
      add: jest.fn(() => Promise.resolve({ id: planId })),
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
      get: jest.fn(),
    };

    mockCollection.mockReturnValue(mockPlanCollection);
    mockDoc.mockReturnValue(mockDocRef);
    mockDocRef.collection = jest.fn((subcollection) => {
      if (subcollection === 'nutritionPlans') {
        return mockPlanCollection;
      }
      if (subcollection === 'meals') {
        return mockMealCollection;
      }
      return mockCollection();
    });

    // Mock nutrition plan document
    const mockPlanDoc = {
      exists: true,
      id: planId,
      data: () => ({
        preset: 'custom',
        presetName: 'Custom Plan',
        metrics: {
          calories: { enabled: true, target: 2000, unit: 'kcal' },
          protein: { enabled: true, target: 150, unit: 'g' },
          totalCarbs: { enabled: true, target: 250, unit: 'g' },
          totalFat: { enabled: true, target: 65, unit: 'g' },
        },
        isActive: true,
        createdAt: 'TIMESTAMP',
        updatedAt: 'TIMESTAMP',
      }),
    };

    mockDocRef.get.mockResolvedValue(mockPlanDoc);

    // Mock active plans query
    const mockActivePlansSnapshot = {
      forEach: jest.fn(),
    };
    mockPlanCollection.where.mockReturnValue({
      get: jest.fn().mockResolvedValue(mockActivePlansSnapshot),
    });

    // Mock batch operations
    const mockBatch = {
      update: jest.fn(),
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(),
    };
    mockFirestore.batch = jest.fn(() => mockBatch);

    // Mock meal log document
    const mockMealDoc = {
      exists: true,
      id: mealLogId,
      data: () => ({
        userId,
        userEmail: 'test@example.com',
        mealDate: '2024-01-15',
        mealType: 'lunch',
        mealName: 'Lunch',
        locationId: 'location-123',
        locationName: 'Annenberg',
        items: [
          {
            name: 'Grilled Chicken',
            quantity: 1,
            calories: '300',
            protein: '30g',
            totalCarbs: '5g',
            totalFat: '10g',
          },
          {
            name: 'Brown Rice',
            quantity: 1,
            calories: '200',
            protein: '5g',
            totalCarbs: '45g',
            totalFat: '2g',
          },
        ],
        totals: {
          calories: 500,
          protein: '35.0g',
          totalCarbs: '50.0g',
          totalFat: '12.0g',
        },
        timestamp: 'TIMESTAMP',
        createdAt: 'TIMESTAMP',
        updatedAt: 'TIMESTAMP',
      }),
    };

    mockMealDocRef.get.mockResolvedValue(mockMealDoc);
    mockMealCollection.add.mockResolvedValue({ id: mealLogId });

    // Mock meal logs query for progress calculation
    const mockMealsSnapshot = {
      empty: false,
      docs: [mockMealDoc],
    };
    mockMealCollection.where.mockReturnValue({
      orderBy: jest.fn(() => ({
        get: jest.fn().mockResolvedValue(mockMealsSnapshot),
      })),
    });
  });

  it('should complete full meal logging and progress tracking flow', async () => {
    // Step 1: Mock nutrition plan service
    const planData = {
      id: planId,
      preset: 'custom',
      presetName: 'Custom Plan',
      metrics: {
        calories: { enabled: true, target: 2000, unit: 'kcal' },
        protein: { enabled: true, target: 150, unit: 'g' },
        totalCarbs: { enabled: true, target: 250, unit: 'g' },
        totalFat: { enabled: true, target: 65, unit: 'g' },
      },
      isActive: true,
    };

    nutritionPlanService.saveNutritionPlan.mockResolvedValue(planData);
    nutritionPlanService.getActiveNutritionPlan.mockResolvedValue(planData);

    // Step 2: Mock meal log creation
    const today = '2024-01-15';
    const createdMealLog = {
      id: mealLogId,
      userId,
      userEmail: 'test@example.com',
      mealDate: today,
      mealType: 'lunch',
      mealName: 'Lunch',
      locationId: 'location-123',
      locationName: 'Annenberg',
      items: [
        {
          name: 'Grilled Chicken',
          quantity: 1,
          calories: '300',
          protein: '30g',
          totalCarbs: '5g',
          totalFat: '10g',
        },
        {
          name: 'Brown Rice',
          quantity: 1,
          calories: '200',
          protein: '5g',
          totalCarbs: '45g',
          totalFat: '2g',
        },
      ],
      totals: {
        calories: 500,
        protein: '35.0g',
        totalCarbs: '50.0g',
        totalFat: '12.0g',
      },
      timestamp: 'TIMESTAMP',
      createdAt: 'TIMESTAMP',
      updatedAt: 'TIMESTAMP',
    };

    mealLogService.createMealLog.mockResolvedValue(createdMealLog);

    // Step 3: Mock daily summary for progress calculation
    const dailySummary = {
      date: today,
      mealCount: 1,
      meals: [createdMealLog],
      dailyTotals: {
        calories: 500,
        protein: '35.0g',
        totalCarbs: '50.0g',
        totalFat: '12.0g',
      },
    };

    mealLogService.getDailySummary.mockResolvedValue(dailySummary);

    // Step 4: Log a meal with multiple items
    mockReq.body = {
      mealDate: today,
      mealType: 'lunch',
      mealName: 'Lunch',
      locationId: 'location-123',
      locationName: 'Annenberg',
      items: createdMealLog.items,
    };

    await mealLogController.createMealLog(mockReq, mockRes);

    // Verify meal log was created
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalled();
    const mealLogResponse = mockRes.json.mock.calls[0][0];
    expect(mealLogResponse.message).toBe('Meal logged successfully');
    expect(mealLogResponse.meal).toBeDefined();
    expect(mealLogService.createMealLog).toHaveBeenCalledWith(
      userId,
      'test@example.com',
      expect.objectContaining({
        mealDate: today,
        mealType: 'lunch',
        items: createdMealLog.items,
      })
    );

    // Step 5: Fetch today's progress
    await nutritionProgressController.getTodayProgress(mockReq, mockRes);

    // Verify progress was calculated
    expect(mockRes.json).toHaveBeenCalled();
    const progressResponse = mockRes.json.mock.calls[1][0];
    expect(progressResponse).toBeDefined();
    expect(progressResponse.progress).toBeDefined();
    expect(progressResponse.hasActivePlan).toBe(true);

    // Step 6: Verify progress calculations
    const progress = progressResponse.progress;
    
    // Calories: 500 consumed / 2000 target = 25%
    expect(progress.calories).toBeDefined();
    expect(progress.calories.current).toBe(500);
    expect(progress.calories.target).toBe(2000);
    expect(progress.calories.percentage).toBe(25);
    expect(progress.calories.status).toBe('below'); // 25% is below 80%

    // Protein: 35g consumed / 150g target = 23%
    expect(progress.protein).toBeDefined();
    expect(progress.protein.current).toBe(35);
    expect(progress.protein.target).toBe(150);
    expect(progress.protein.percentage).toBe(23);
    expect(progress.protein.status).toBe('below');

    // Verify nutrition totals were calculated correctly
    const createdMeal = mealLogResponse.meal;
    expect(createdMeal.totals.calories).toBe(500);
    expect(createdMeal.totals.protein).toBe('35.0g');
    expect(createdMeal.totals.totalCarbs).toBe('50.0g');
    expect(createdMeal.totals.totalFat).toBe('12.0g');
  });

  it('should handle progress calculation when target is met', async () => {
    // Mock plan with lower targets
    const planData = {
      id: planId,
      metrics: {
        calories: { enabled: true, target: 500, unit: 'kcal' },
        protein: { enabled: true, target: 35, unit: 'g' },
      },
      isActive: true,
    };

    nutritionPlanService.getActiveNutritionPlan.mockResolvedValue(planData);

    // Mock meal log
    const today = '2024-01-15';
    const createdMealLog = {
      id: mealLogId,
      userId,
      mealDate: today,
      mealType: 'lunch',
      items: [
        {
          name: 'Grilled Chicken',
          quantity: 1,
          calories: '300',
          protein: '30g',
        },
        {
          name: 'Brown Rice',
          quantity: 1,
          calories: '200',
          protein: '5g',
        },
      ],
      totals: {
        calories: 500,
        protein: '35.0g',
      },
    };

    mealLogService.createMealLog.mockResolvedValue(createdMealLog);

    // Mock daily summary
    const dailySummary = {
      date: today,
      mealCount: 1,
      meals: [createdMealLog],
      dailyTotals: {
        calories: 500,
        protein: '35.0g',
      },
    };

    mealLogService.getDailySummary.mockResolvedValue(dailySummary);

    // Log meal
    mockReq.body = {
      mealDate: today,
      mealType: 'lunch',
      locationId: 'location-123',
      items: createdMealLog.items,
    };

    await mealLogController.createMealLog(mockReq, mockRes);

    // Get progress
    await nutritionProgressController.getTodayProgress(mockReq, mockRes);

    const progressResponse = mockRes.json.mock.calls[1][0];
    const progress = progressResponse.progress;

    // Calories: 500 consumed / 500 target = 100% (met)
    expect(progress.calories.percentage).toBe(100);
    expect(progress.calories.status).toBe('met');

    // Protein: 35g consumed / 35g target = 100% (met)
    expect(progress.protein.percentage).toBe(100);
    expect(progress.protein.status).toBe('met');
  });

  it('should handle progress calculation when close to target (80-99%)', async () => {
    // Mock plan
    const planData = {
      id: planId,
      metrics: {
        calories: { enabled: true, target: 625, unit: 'kcal' }, // 500 is 80% of 625
      },
      isActive: true,
    };

    nutritionPlanService.getActiveNutritionPlan.mockResolvedValue(planData);

    // Mock meal log
    const today = '2024-01-15';
    const createdMealLog = {
      id: mealLogId,
      userId,
      mealDate: today,
      mealType: 'lunch',
      items: [
        {
          name: 'Grilled Chicken',
          quantity: 1,
          calories: '300',
        },
        {
          name: 'Brown Rice',
          quantity: 1,
          calories: '200',
        },
      ],
      totals: {
        calories: 500,
      },
    };

    mealLogService.createMealLog.mockResolvedValue(createdMealLog);

    // Mock daily summary
    const dailySummary = {
      date: today,
      mealCount: 1,
      meals: [createdMealLog],
      dailyTotals: {
        calories: 500,
      },
    };

    mealLogService.getDailySummary.mockResolvedValue(dailySummary);

    // Log meal
    mockReq.body = {
      mealDate: today,
      mealType: 'lunch',
      locationId: 'location-123',
      items: createdMealLog.items,
    };

    await mealLogController.createMealLog(mockReq, mockRes);

    // Get progress
    await nutritionProgressController.getTodayProgress(mockReq, mockRes);

    const progressResponse = mockRes.json.mock.calls[1][0];
    const progress = progressResponse.progress;

    // Calories: 500 consumed / 625 target = 80% (close)
    expect(progress.calories.percentage).toBe(80);
    expect(progress.calories.status).toBe('close');
  });
});


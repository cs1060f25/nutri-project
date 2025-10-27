/**
 * Unit tests for Meal Log Service
 */

// Mock Firebase Admin before imports
jest.mock('../config/firebase', () => {
  const mockFirestore = {
    collection: jest.fn(),
  };

  const mockAdmin = {
    firestore: jest.fn(() => mockFirestore),
  };

  // Add FieldValue to the firestore function itself
  mockAdmin.firestore.FieldValue = {
    serverTimestamp: jest.fn(() => 'TIMESTAMP'),
  };

  return {
    admin: mockAdmin,
  };
});

const mealLogService = require('../services/mealLogService');
const { admin } = require('../config/firebase');

// Get reference to the mock firestore for test setup
const mockFirestore = admin.firestore();

describe('Meal Log Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTotals', () => {
    it('should calculate nutritional totals from items', () => {
      const items = [
        {
          quantity: 1,
          calories: '200',
          totalFat: '10g',
          saturatedFat: '3g',
          cholesterol: '100mg',
          sodium: '200mg',
          totalCarb: '20g',
          protein: '15g',
        },
        {
          quantity: 2,
          calories: '150',
          totalFat: '5g',
          saturatedFat: '1g',
          cholesterol: '50mg',
          sodium: '100mg',
          totalCarb: '15g',
          protein: '10g',
        },
      ];

      const totals = mealLogService.calculateTotals(items);

      expect(totals.calories).toBe(500); // 200 + (150*2)
      expect(totals.totalFat).toBe('20.0g'); // 10 + (5*2)
      expect(totals.saturatedFat).toBe('5.0g'); // 3 + (1*2)
      expect(totals.protein).toBe('35.0g'); // 15 + (10*2)
    });

    it('should handle items with missing nutritional data', () => {
      const items = [
        {
          quantity: 1,
          calories: '200',
          totalFat: null,
          protein: undefined,
        },
      ];

      const totals = mealLogService.calculateTotals(items);

      expect(totals.calories).toBe(200);
      expect(totals.totalFat).toBe('0.0g');
      expect(totals.protein).toBe('0.0g');
    });

    it('should handle fractional quantities', () => {
      const items = [
        {
          quantity: 1.5,
          calories: '100',
          totalFat: '10g',
          protein: '20g',
        },
      ];

      const totals = mealLogService.calculateTotals(items);

      expect(totals.calories).toBe(150); // 100 * 1.5
      expect(totals.totalFat).toBe('15.0g'); // 10 * 1.5
      expect(totals.protein).toBe('30.0g'); // 20 * 1.5
    });

    it('should parse values with units correctly', () => {
      const items = [
        {
          quantity: 1,
          calories: 200, // number
          totalFat: '10g', // with unit
          sodium: '250mg', // with unit
        },
      ];

      const totals = mealLogService.calculateTotals(items);

      expect(totals.calories).toBe(200);
      expect(totals.totalFat).toBe('10.0g');
      expect(totals.sodium).toBe('250.0mg');
    });

    it('should round calories to whole number', () => {
      const items = [
        {
          quantity: 1.5,
          calories: '100',
        },
      ];

      const totals = mealLogService.calculateTotals(items);

      expect(totals.calories).toBe(150); // Not 150.0
      expect(typeof totals.calories).toBe('number');
    });
  });

  describe('createMealLog', () => {
    it('should create a meal log with calculated totals', async () => {
      const mockAdd = jest.fn().mockResolvedValue({ id: 'meal123' });
      mockFirestore.collection = jest.fn().mockReturnValue({ add: mockAdd });

      const mealData = {
        mealDate: '2025-10-27',
        mealType: 'lunch',
        locationId: '01',
        locationName: 'Annenberg',
        items: [
          {
            recipeId: '123',
            recipeName: 'Chicken',
            quantity: 1,
            calories: '200',
            totalFat: '10g',
            protein: '25g',
          },
        ],
      };

      const result = await mealLogService.createMealLog('user123', 'user@test.com', mealData);

      expect(mockFirestore.collection).toHaveBeenCalledWith('mealLogs');
      expect(mockAdd).toHaveBeenCalled();
      expect(result.id).toBe('meal123');
      expect(result.userId).toBe('user123');
      expect(result.totals.calories).toBe(200);
    });
  });

  describe('getMealLogs', () => {
    it('should fetch meal logs for a user', async () => {
      const mockDocs = [
        {
          id: 'meal1',
          data: () => ({
            userId: 'user123',
            mealType: 'breakfast',
            timestamp: { toDate: () => new Date('2025-10-27') },
          }),
        },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        forEach: (callback) => mockDocs.forEach(doc => callback(doc)),
      });

      const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
      const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      mockFirestore.collection = jest.fn().mockReturnValue({ where: mockWhere });

      const meals = await mealLogService.getMealLogs('user123');

      expect(mockFirestore.collection).toHaveBeenCalledWith('mealLogs');
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user123');
      expect(meals).toHaveLength(1);
      expect(meals[0].id).toBe('meal1');
    });

    it('should apply date filters', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        forEach: jest.fn(),
      });

      // Create a fully chainable mock query
      const createChainableMock = () => {
        const chain = {
          where: jest.fn(function() { return this; }),
          orderBy: jest.fn(function() { return this; }),
          limit: jest.fn(function() { return this; }),
          get: mockGet,
        };
        return chain;
      };
      
      const mockQuery = createChainableMock();
      mockFirestore.collection = jest.fn().mockReturnValue(mockQuery);

      await mealLogService.getMealLogs('user123', {
        startDate: '2025-10-01',
        endDate: '2025-10-31',
      });

      expect(mockQuery.where).toHaveBeenCalledWith('userId', '==', 'user123');
      expect(mockQuery.where).toHaveBeenCalledWith('mealDate', '>=', '2025-10-01');
      expect(mockQuery.where).toHaveBeenCalledWith('mealDate', '<=', '2025-10-31');
    });
  });

  describe('getDailySummary', () => {
    it('should aggregate meals for a specific day', async () => {
      const mockDocs = [
        {
          id: 'meal1',
          data: () => ({
            mealType: 'breakfast',
            items: [
              { quantity: 1, calories: '200', totalFat: '10g', protein: '15g' },
            ],
            totals: { calories: 200, totalFat: '10g', protein: '15g' },
          }),
        },
        {
          id: 'meal2',
          data: () => ({
            mealType: 'lunch',
            items: [
              { quantity: 1, calories: '300', totalFat: '15g', protein: '20g' },
            ],
            totals: { calories: 300, totalFat: '15g', protein: '20g' },
          }),
        },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        forEach: (callback) => mockDocs.forEach(doc => callback(doc)),
      });

      const mockQuery = {
        where: jest.fn(function() { return this; }),
        get: mockGet,
      };

      mockFirestore.collection = jest.fn().mockReturnValue(mockQuery);

      const summary = await mealLogService.getDailySummary('user123', '2025-10-27');

      expect(summary.date).toBe('2025-10-27');
      expect(summary.mealCount).toBe(2);
      expect(summary.dailyTotals.calories).toBe(500); // 200 + 300
    });
  });
});


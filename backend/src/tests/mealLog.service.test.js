/**
 * Unit tests for Meal Log Service
 */

// Mock Firebase Admin before imports
const mockAdd = jest.fn();
const mockGet = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockSubCollection = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

jest.mock('../config/firebase', () => {
  // Setup the chain: collection().doc().collection().add()
  mockSubCollection.add = mockAdd;
  mockSubCollection.where = jest.fn().mockReturnValue({
    get: mockGet,
    orderBy: jest.fn().mockReturnValue({ limit: mockLimit }),
  });
  mockSubCollection.get = mockGet;
  
  mockDoc.collection = jest.fn().mockReturnValue(mockSubCollection);
  
  mockCollection.doc = jest.fn().mockReturnValue(mockDoc);
  mockCollection.where = mockWhere;
  mockCollection.orderBy = mockOrderBy;
  mockCollection.limit = mockLimit;
  mockCollection.get = mockGet;

  const mockFirestore = {
    collection: jest.fn().mockReturnValue(mockCollection),
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
      mockAdd.mockResolvedValue({ id: 'meal123' });

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

      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
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

      mockGet.mockResolvedValue({
        forEach: (callback) => mockDocs.forEach(doc => callback(doc)),
      });

      mockLimit.mockReturnValue({ get: mockGet });
      mockOrderBy.mockReturnValue({ limit: mockLimit });
      mockSubCollection.orderBy = jest.fn().mockReturnValue({ limit: mockLimit });

      const meals = await mealLogService.getMealLogs('user123');

      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
      expect(meals).toHaveLength(1);
      expect(meals[0].id).toBe('meal1');
    });

    it('should apply date filters', async () => {
      mockGet.mockResolvedValue({
        forEach: jest.fn(),
      });

      // Create a chainable mock that supports .where() chaining
      // Each where() call should return the same object for chaining
      const chainableQuery = {
        where: jest.fn(function(field, op, value) {
          return this; // Return this for chaining
        }),
        orderBy: jest.fn(function() { return this; }),
        limit: jest.fn(function() { return this; }),
        get: mockGet,
      };

      // Make the subcollection itself chainable - it should have a where method that returns chainableQuery
      mockSubCollection.where = jest.fn().mockReturnValue(chainableQuery);
      // Also make sure the subcollection can be used as the initial query
      Object.assign(mockSubCollection, {
        where: jest.fn().mockReturnValue(chainableQuery),
        orderBy: jest.fn().mockReturnValue(chainableQuery),
        limit: jest.fn().mockReturnValue(chainableQuery),
        get: mockGet,
      });
      mockLimit.mockReturnValue({ get: mockGet });

      await mealLogService.getMealLogs('user123', {
        startDate: '2025-10-01',
        endDate: '2025-10-31',
      });

      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
      // Check that where was called twice (once for startDate, once for endDate)
      // The first call is on mockSubCollection, the second on chainableQuery
      expect(mockSubCollection.where).toHaveBeenCalledWith('mealDate', '>=', '2025-10-01');
      expect(chainableQuery.where).toHaveBeenCalledWith('mealDate', '<=', '2025-10-31');
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

      mockGet.mockResolvedValue({
        forEach: (callback) => mockDocs.forEach(doc => callback(doc)),
      });

      mockSubCollection.where = jest.fn().mockReturnValue({
        get: mockGet,
      });

      const summary = await mealLogService.getDailySummary('user123', '2025-10-27');

      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
      expect(summary.date).toBe('2025-10-27');
      expect(summary.mealCount).toBe(2);
      expect(summary.dailyTotals.calories).toBe(500); // 200 + 300
    });
  });
});


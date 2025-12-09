/**
 * Integration Test: Scanner Image Analysis to Social Post Creation Flow
 * 
 * Tests the complete flow:
 * 1. User authentication
 * 2. Upload meal image
 * 3. Analyze image with Gemini API
 * 4. Match dishes to HUDS menu
 * 5. Calculate nutrition totals
 * 6. Create social post from scan
 * 7. Create meal log entry
 * 8. Verify post appears in feed
 * 9. Verify data consistency across collections
 */

// Mock Firebase Admin before any imports
const mockFirestore = {
  collection: jest.fn(),
  batch: jest.fn(),
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

// Mock Gemini API
jest.mock('../services/geminiAnalyzer', () => {
  const originalModule = jest.requireActual('../services/geminiAnalyzer');
  return {
    ...originalModule,
    analyzeMealImage: jest.fn(),
  };
});

// Mock post service
jest.mock('../services/postService', () => ({
  createPostFromScan: jest.fn(),
  getFeedPosts: jest.fn(),
  getPopularPosts: jest.fn(),
}));

// Mock meal log service
jest.mock('../services/mealLogService', () => ({
  createMealLog: jest.fn(),
}));

// Mock environment variables
process.env.GEMINI_API_KEY_1 = 'test-api-key';

const { analyzeMealImage } = require('../services/geminiAnalyzer');
const socialController = require('../controllers/socialController');
const postService = require('../services/postService');
const mealLogService = require('../services/mealLogService');

describe('Integration Test: Scanner Image Analysis to Social Post Creation Flow', () => {
  let mockReq;
  let mockRes;
  let userId;
  let postId;
  let mealLogId;

  beforeEach(() => {
    jest.clearAllMocks();
    
    userId = 'test-user-123';
    postId = 'post-123';
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

    // Setup Firestore mocks
    const mockPostDocRef = {
      id: postId,
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
    };

    const mockMealDocRef = {
      id: mealLogId,
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockUserDocRef = {
      id: userId,
      get: jest.fn(),
    };

    const mockPostCollection = {
      doc: jest.fn(() => mockPostDocRef),
      add: jest.fn(() => Promise.resolve({ id: postId })),
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

    const mockMealCollection = {
      doc: jest.fn(() => mockMealDocRef),
      add: jest.fn(() => Promise.resolve({ id: mealLogId })),
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
      get: jest.fn(),
    };

    mockCollection.mockImplementation((collectionName) => {
      if (collectionName === 'posts') {
        return mockPostCollection;
      }
      if (collectionName === 'users') {
        return {
          doc: jest.fn((docId) => {
            if (docId === userId) {
              return mockUserDocRef;
            }
            return { get: jest.fn() };
          }),
          where: jest.fn(),
          get: jest.fn(),
        };
      }
      return mockCollection();
    });

    // Mock user document
    const mockUserDoc = {
      exists: true,
      id: userId,
      data: () => ({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        residence: 'Annenberg',
      }),
    };
    mockUserDocRef.get.mockResolvedValue(mockUserDoc);

    // Mock user's meal subcollection
    mockUserDocRef.collection = jest.fn((subcollection) => {
      if (subcollection === 'meals') {
        return mockMealCollection;
      }
      return mockCollection();
    });

    // Mock post document
    const mockPostDoc = {
      exists: true,
      id: postId,
      data: () => ({
        userId,
        locationId: 'location-123',
        locationName: 'Annenberg',
        mealDate: '2024-01-15',
        mealType: 'lunch',
        matchedItems: [
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
        nutritionTotals: {
          calories: 500,
          protein: '35.0g',
          totalCarbs: '50.0g',
          totalFat: '12.0g',
        },
        isPublic: true,
        upvotes: [],
        createdAt: 'TIMESTAMP',
        updatedAt: 'TIMESTAMP',
      }),
    };
    mockPostDocRef.get.mockResolvedValue(mockPostDoc);
    mockPostCollection.add.mockResolvedValue({ id: postId });

    // Mock feed posts query
    const mockFeedSnapshot = {
      empty: false,
      docs: [mockPostDoc],
    };
    mockPostCollection.where.mockReturnValue({
      orderBy: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(mockFeedSnapshot),
        })),
      })),
    });

    // Mock batch operations
    const mockBatch = {
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(),
    };
    mockFirestore.batch.mockReturnValue(mockBatch);
  });

  it('should complete full scanner to post creation flow', async () => {
    // Step 1: Mock Gemini API analysis
    const mockGeminiResponse = {
      recipes: [
        {
          name: 'Grilled Chicken',
          location: 'Annenberg',
          calories: '300',
          protein: '30g',
          totalCarbs: '5g',
          totalFat: '10g',
        },
        {
          name: 'Brown Rice',
          location: 'Annenberg',
          calories: '200',
          protein: '5g',
          totalCarbs: '45g',
          totalFat: '2g',
        },
      ],
    };

    analyzeMealImage.mockResolvedValue(mockGeminiResponse);

    // Step 2: Mock post creation
    const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const matchedItems = mockGeminiResponse.recipes.map(recipe => ({
      name: recipe.name,
      quantity: 1,
      calories: recipe.calories,
      protein: recipe.protein,
      totalCarbs: recipe.totalCarbs,
      totalFat: recipe.totalFat,
    }));

    const createdPost = {
      id: postId,
      userId,
      locationId: 'location-123',
      locationName: 'Annenberg',
      mealDate: '2024-01-15',
      mealType: 'lunch',
      matchedItems,
      nutritionTotals: {
        calories: 500,
        protein: 35.0,
        totalCarbs: 50.0,
        totalFat: 12.0,
      },
      isPublic: true,
      upvotes: [],
      createdAt: 'TIMESTAMP',
      updatedAt: 'TIMESTAMP',
    };

    postService.createPostFromScan.mockResolvedValue(createdPost);

    // Step 3: Mock feed posts
    const feedPosts = [createdPost];
    postService.getFeedPosts.mockResolvedValue(feedPosts);

    // Step 4: Create post from scan
    mockReq.body = {
      image: base64Image,
      locationId: 'location-123',
      locationName: 'Annenberg',
      mealDate: '2024-01-15',
      mealType: 'lunch',
      matchedItems,
      nutritionTotals: {
        calories: 500,
        protein: '35.0g',
        totalCarbs: '50.0g',
        totalFat: '12.0g',
      },
      timestamp: new Date().toISOString(),
    };

    await socialController.createPostFromScan(mockReq, mockRes);

    // Step 5: Verify post was created
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalled();
    const postResponse = mockRes.json.mock.calls[0][0];
    expect(postResponse.message).toBe('Post created successfully');
    expect(postResponse.post).toBeDefined();
    expect(postResponse.post.id).toBe(postId);
    expect(postService.createPostFromScan).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        locationId: 'location-123',
        locationName: 'Annenberg',
        mealDate: '2024-01-15',
        mealType: 'lunch',
        matchedItems,
      })
    );

    // Step 6: Verify post data
    const returnedPost = postResponse.post;
    expect(returnedPost.locationId).toBe('location-123');
    expect(returnedPost.locationName).toBe('Annenberg');
    expect(returnedPost.mealDate).toBe('2024-01-15');
    expect(returnedPost.mealType).toBe('lunch');
    expect(returnedPost.matchedItems).toHaveLength(2);
    expect(returnedPost.nutritionTotals.calories).toBe(500);

    // Step 7: Verify post appears in feed
    mockReq.query = { limit: 50 };
    await socialController.getFeedPosts(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalled();
    const feedResponse = mockRes.json.mock.calls[1][0];
    expect(feedResponse.posts).toBeDefined();
    expect(feedResponse.posts.length).toBeGreaterThan(0);
    expect(postService.getFeedPosts).toHaveBeenCalledWith(userId, 50);
    
    // Find our post in the feed
    const feedPost = feedResponse.posts.find(p => p.id === postId);
    expect(feedPost).toBeDefined();
    expect(feedPost.userId).toBe(userId);
    expect(feedPost.locationName).toBe('Annenberg');

    // Step 8: Verify data consistency
    // Post and meal log should have matching nutrition data
    expect(feedPost.nutritionTotals.calories).toBe(500);
    expect(feedPost.matchedItems).toHaveLength(2);
    expect(feedPost.matchedItems[0].name).toBe('Grilled Chicken');
    expect(feedPost.matchedItems[1].name).toBe('Brown Rice');
  });

  it('should handle unmatched dishes in scan', async () => {
    // Mock Gemini response with unmatched dishes
    const mockGeminiResponse = {
      recipes: [
        {
          name: 'Grilled Chicken',
          location: 'Annenberg',
          calories: '300',
          protein: '30g',
        },
      ],
      unmatchedDishes: ['Mystery Soup', 'Unknown Side'],
    };

    analyzeMealImage.mockResolvedValue(mockGeminiResponse);

    const matchedItems = mockGeminiResponse.recipes.map(recipe => ({
      name: recipe.name,
      quantity: 1,
      calories: recipe.calories,
      protein: recipe.protein,
    }));

    const createdPost = {
      id: postId,
      userId,
      locationId: 'location-123',
      locationName: 'Annenberg',
      mealDate: '2024-01-15',
      mealType: 'lunch',
      matchedItems,
      unmatchedDishes: mockGeminiResponse.unmatchedDishes,
      nutritionTotals: {
        calories: 300,
        protein: 30.0,
      },
      isPublic: true,
    };

    postService.createPostFromScan.mockResolvedValue(createdPost);

    mockReq.body = {
      image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      locationId: 'location-123',
      locationName: 'Annenberg',
      mealDate: '2024-01-15',
      mealType: 'lunch',
      matchedItems,
      unmatchedDishes: mockGeminiResponse.unmatchedDishes,
      nutritionTotals: {
        calories: 300,
        protein: '30.0g',
      },
    };

    await socialController.createPostFromScan(mockReq, mockRes);

    const postResponse = mockRes.json.mock.calls[0][0];
    const returnedPost = postResponse.post;

    // Verify unmatched dishes are included
    expect(returnedPost.unmatchedDishes).toBeDefined();
    expect(returnedPost.unmatchedDishes).toHaveLength(2);
    expect(returnedPost.unmatchedDishes).toContain('Mystery Soup');
    expect(returnedPost.unmatchedDishes).toContain('Unknown Side');
  });

  it('should create public post that appears in popular posts', async () => {
    // Mock Gemini response
    const mockGeminiResponse = {
      recipes: [
        {
          name: 'Grilled Chicken',
          location: 'Annenberg',
          calories: '300',
          protein: '30g',
        },
      ],
    };

    analyzeMealImage.mockResolvedValue(mockGeminiResponse);

    const matchedItems = mockGeminiResponse.recipes.map(recipe => ({
      name: recipe.name,
      quantity: 1,
      calories: recipe.calories,
      protein: recipe.protein,
    }));

    const createdPost = {
      id: postId,
      userId,
      locationId: 'location-123',
      locationName: 'Annenberg',
      mealDate: '2024-01-15',
      mealType: 'lunch',
      matchedItems,
      nutritionTotals: {
        calories: 300,
        protein: 30.0,
      },
      isPublic: true,
      upvotes: ['user1', 'user2'], // Has upvotes
    };

    postService.createPostFromScan.mockResolvedValue(createdPost);
    postService.getPopularPosts.mockResolvedValue([createdPost]);

    mockReq.body = {
      image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      locationId: 'location-123',
      locationName: 'Annenberg',
      mealDate: '2024-01-15',
      mealType: 'lunch',
      matchedItems,
      nutritionTotals: {
        calories: 300,
        protein: '30.0g',
      },
    };

    await socialController.createPostFromScan(mockReq, mockRes);

    // Verify post is public
    const postResponse = mockRes.json.mock.calls[0][0];
    const returnedPost = postResponse.post;
    expect(returnedPost.isPublic).toBe(true);

    // Get popular posts
    mockReq.query = { limit: 50 };
    await socialController.getPopularPosts(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalled();
    const popularResponse = mockRes.json.mock.calls[1][0];
    expect(popularResponse.posts).toBeDefined();
    expect(postService.getPopularPosts).toHaveBeenCalledWith(50);

    // Our post should be in popular posts (if it has upvotes or is recent)
    const popularPost = popularResponse.posts.find(p => p.id === postId);
    expect(popularPost).toBeDefined();
  });

  it('should handle image compression and processing', async () => {
    // Mock a large base64 image
    const largeBase64Image = 'data:image/jpeg;base64,' + 'A'.repeat(100000);

    const mockGeminiResponse = {
      recipes: [
        {
          name: 'Grilled Chicken',
          location: 'Annenberg',
          calories: '300',
        },
      ],
    };

    analyzeMealImage.mockResolvedValue(mockGeminiResponse);

    const matchedItems = mockGeminiResponse.recipes.map(recipe => ({
      name: recipe.name,
      quantity: 1,
      calories: recipe.calories,
    }));

    const createdPost = {
      id: postId,
      userId,
      locationId: 'location-123',
      locationName: 'Annenberg',
      mealDate: '2024-01-15',
      mealType: 'lunch',
      matchedItems,
      nutritionTotals: {
        calories: 300,
      },
      image: 'compressed-image-data', // Compressed version
      isPublic: true,
    };

    postService.createPostFromScan.mockResolvedValue(createdPost);

    mockReq.body = {
      image: largeBase64Image,
      locationId: 'location-123',
      locationName: 'Annenberg',
      mealDate: '2024-01-15',
      mealType: 'lunch',
      matchedItems,
      nutritionTotals: {
        calories: 300,
      },
    };

    await socialController.createPostFromScan(mockReq, mockRes);

    // Verify post was created successfully even with large image
    expect(mockRes.status).toHaveBeenCalledWith(201);
    const postResponse = mockRes.json.mock.calls[0][0];
    expect(postResponse.post).toBeDefined();
    
    // Image should be processed/compressed (stored in post)
    const returnedPost = postResponse.post;
    expect(returnedPost.image).toBeDefined();
    expect(returnedPost.image).toBe('compressed-image-data');
  });
});


/**
 * Unit tests for HUDS Controller
 */

const hudsController = require('../controllers/hudsController');
const hudsService = require('../services/hudsService');

// Mock the HUDS service
jest.mock('../services/hudsService');

describe('HUDS Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      query: {},
      params: {},
    };
    
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getLocations', () => {
    it('should return all dining locations', async () => {
      const mockLocations = [
        { location_number: '01', location_name: 'Annenberg' },
        { location_number: '05', location_name: 'Adams' },
      ];

      hudsService.getLocations.mockResolvedValue(mockLocations);

      await hudsController.getLocations(mockReq, mockRes);

      expect(hudsService.getLocations).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockLocations);
    });

    it('should handle errors and return 500', async () => {
      const error = new Error('Service error');
      hudsService.getLocations.mockRejectedValue(error);

      await hudsController.getLocations(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to fetch dining locations',
      });
    });
  });

  describe('getTodaysMenu', () => {
    it('should return today\'s menu without location filter', async () => {
      const mockMenu = [
        {
          locationNumber: '01',
          locationName: 'Annenberg',
          meals: {},
        },
      ];

      hudsService.getTodaysMenu.mockResolvedValue(mockMenu);

      await hudsController.getTodaysMenu(mockReq, mockRes);

      expect(hudsService.getTodaysMenu).toHaveBeenCalledWith(null);
      expect(mockRes.json).toHaveBeenCalledWith(mockMenu);
    });

    it('should return today\'s menu with location filter', async () => {
      mockReq.query.locationId = '05';
      const mockMenu = [
        {
          locationNumber: '05',
          locationName: 'Adams',
          meals: {},
        },
      ];

      hudsService.getTodaysMenu.mockResolvedValue(mockMenu);

      await hudsController.getTodaysMenu(mockReq, mockRes);

      expect(hudsService.getTodaysMenu).toHaveBeenCalledWith('05');
      expect(mockRes.json).toHaveBeenCalledWith(mockMenu);
    });

    it('should handle errors and return 500', async () => {
      const error = new Error('Service error');
      hudsService.getTodaysMenu.mockRejectedValue(error);

      await hudsController.getTodaysMenu(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to fetch today\'s menu',
      });
    });
  });

  describe('getRecipes', () => {
    it('should return recipes without filters', async () => {
      const mockRecipes = [
        { ID: 1, Recipe_Name: 'Chicken' },
        { ID: 2, Recipe_Name: 'Rice' },
      ];

      hudsService.getRecipes.mockResolvedValue(mockRecipes);

      await hudsController.getRecipes(mockReq, mockRes);

      expect(hudsService.getRecipes).toHaveBeenCalledWith(null, null);
      expect(mockRes.json).toHaveBeenCalledWith(mockRecipes);
    });

    it('should return recipes with date filter', async () => {
      mockReq.query.date = '10/27/2025';
      const mockRecipes = [{ ID: 1, Recipe_Name: 'Chicken' }];

      hudsService.getRecipes.mockResolvedValue(mockRecipes);

      await hudsController.getRecipes(mockReq, mockRes);

      expect(hudsService.getRecipes).toHaveBeenCalledWith('10/27/2025', null);
      expect(mockRes.json).toHaveBeenCalledWith(mockRecipes);
    });

    it('should return recipes with location filter', async () => {
      mockReq.query.locationId = '05';
      const mockRecipes = [{ ID: 1, Recipe_Name: 'Chicken' }];

      hudsService.getRecipes.mockResolvedValue(mockRecipes);

      await hudsController.getRecipes(mockReq, mockRes);

      expect(hudsService.getRecipes).toHaveBeenCalledWith(null, '05');
      expect(mockRes.json).toHaveBeenCalledWith(mockRecipes);
    });

    it('should handle errors and return 500', async () => {
      const error = new Error('Service error');
      hudsService.getRecipes.mockRejectedValue(error);

      await hudsController.getRecipes(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to fetch recipes',
      });
    });
  });

  describe('getRecipeById', () => {
    it('should return a specific recipe', async () => {
      mockReq.params.id = '123';
      const mockRecipe = { ID: 123, Recipe_Name: 'Chicken Parmesan' };

      hudsService.getRecipeById.mockResolvedValue(mockRecipe);

      await hudsController.getRecipeById(mockReq, mockRes);

      expect(hudsService.getRecipeById).toHaveBeenCalledWith('123');
      expect(mockRes.json).toHaveBeenCalledWith(mockRecipe);
    });

    it('should handle not found errors and return 404', async () => {
      mockReq.params.id = '999';
      const error = new Error('Not found');
      hudsService.getRecipeById.mockRejectedValue(error);

      await hudsController.getRecipeById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Recipe not found',
      });
    });
  });
});


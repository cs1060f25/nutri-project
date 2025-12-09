# Test Scripts

This directory contains scripts to run unit tests and integration tests for the HUDS Nutrition Analyzer backend.

## Unit Test Files

1. `scanner.test.js` - Scanner and nutrition calculation functions
2. `insights.test.js` - Insight and analytics functions
3. `nutritionPlanner.test.js` - Nutrition planner calculation functions
4. `social.test.js` - Social/post utility functions
5. `mealPlanning.test.js` - Meal planning utility functions

## Integration Test Files

1. `integration.mealLogging.test.js` - End-to-end meal logging and progress tracking flow
2. `integration.scannerToPost.test.js` - Scanner image analysis to social post creation flow

## Running the Tests

### Unit Tests Only
```bash
cd backend && npm run test:unit:functionality
```

**Note:** The script is named `test:unit:functionality` because these are unit tests for core functionality functions (scanner, insights, nutrition planner, social, and meal planning).

### Integration Tests Only
```bash
cd backend && npm run test:integration
```

### Run Both Unit and Integration Tests
```bash
cd backend && npm run test:all
```


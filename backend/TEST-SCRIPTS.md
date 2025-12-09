# Unit Test Scripts

This directory contains scripts to run the 5 unit test files we created to test the functionality of our core features.

## Test Files

1. `scanner.test.js` - Scanner and nutrition calculation functions
2. `insights.test.js` - Insight and analytics functions
3. `nutritionPlanner.test.js` - Nutrition planner calculation functions
4. `social.test.js` - Social/post utility functions
5. `mealPlanning.test.js` - Meal planning utility functions

## Running the Tests

### Option 1: Using npm script (Recommended)
```bash
cd backend
npm run test:unit:new
```

### Option 2: Using shell script
```bash
cd backend
./run-unit-tests.sh
```

### Option 3: Run all tests
```bash
cd backend
npm test
```

## Test Results

All 5 test suites should pass with a total of 117 tests:
- scanner.test.js: 22 tests
- insights.test.js: 20 tests
- nutritionPlanner.test.js: 32 tests
- social.test.js: 25 tests
- mealPlanning.test.js: 18 tests


# Git Feature Branch Workflow - Complete Command Sequence

This document provides the **exact git commands** to implement NUTRI-37, NUTRI-38, and NUTRI-40 using the feature branch workflow.

---

## Prerequisites

```bash
# Navigate to repository root
cd /Users/waseemahmad/Desktop/classes/cs1060/final_repo

# Ensure you're on main branch and up to date
git checkout main
git pull origin main
```

---

## Phase 1: NUTRI-37 (Food Recognition API)

### Step 1.1: Create Feature Branch

```bash
# Create and switch to feature branch for NUTRI-37
git checkout -b feature/NUTRI-37-food-recognition
```

### Step 1.2: Implement Feature

Files already created:
- `ml-service/app/main.py` - FastAPI endpoint with /predict
- `ml-service/tests/test_api.py` - Unit tests
- `ml-service/requirements.txt` - Dependencies

### Step 1.3: Stage and Commit

```bash
# Add all ml-service files
git add ml-service/

# Commit with Linear task ID
git commit -m "NUTRI-37: Implement food recognition model and API endpoint

- Add FastAPI /predict endpoint that accepts image uploads
- Implement DummyFoodRecognitionModel with mock predictions
- Add validation for file type (JPEG/PNG) and size (max 10MB)
- Return JSON response with food predictions and confidence scores
- Add comprehensive test suite with 10 test cases
- Test success, error handling, and edge cases"
```

### Step 1.4: Push Feature Branch

```bash
# Push to remote
git push -u origin feature/NUTRI-37-food-recognition
```

---

## Phase 2: NUTRI-38 (ML Inference API Contract)

### Step 2.1: Return to Main and Create New Branch

```bash
# Return to main branch
git checkout main

# Create and switch to feature branch for NUTRI-38
git checkout -b feature/NUTRI-38-ml-inference-api
```

### Step 2.2: Implement API Contract

Files already created:
- `ml-service/docs/ml_inference_api_contract.md` - API specification
- `ml-service/tests/test_contract.py` - Contract validation tests

### Step 2.3: Stage and Commit

```bash
# Add documentation and contract tests
git add ml-service/docs/ml_inference_api_contract.md
git add ml-service/tests/test_contract.py

# Commit with Linear task ID
git commit -m "NUTRI-38: Define ML inference API contract specification

- Create comprehensive API contract documentation
- Define /predict endpoint request/response schema
- Document error codes (400, 413, 500) with examples
- Add example usage in Python and JavaScript
- Implement contract validation test suite
- Test response structure, field types, and error handling"
```

### Step 2.4: Push Feature Branch

```bash
# Push to remote
git push -u origin feature/NUTRI-38-ml-inference-api
```

---

## Phase 3: Integrate Features into Main

### Step 3.1: Rebase NUTRI-37 onto Main

```bash
# Switch to NUTRI-37 branch
git checkout feature/NUTRI-37-food-recognition

# Rebase onto latest main
git pull --rebase origin main

# If conflicts occur, resolve them:
# 1. Edit conflicting files
# 2. git add <resolved-files>
# 3. git rebase --continue

# Verify tests still pass
cd ml-service
python3 -m pytest tests/test_api.py -v
cd ..
```

### Step 3.2: Merge NUTRI-37 into Main

```bash
# Switch to main
git checkout main

# Merge feature branch (fast-forward if possible)
git merge feature/NUTRI-37-food-recognition

# Push to remote
git push origin main
```

### Step 3.3: Rebase NUTRI-38 onto Updated Main

```bash
# Switch to NUTRI-38 branch
git checkout feature/NUTRI-38-ml-inference-api

# Rebase onto latest main (now includes NUTRI-37)
git pull --rebase origin main

# Resolve any conflicts if they occur

# Verify tests pass
cd ml-service
python3 -m pytest tests/test_contract.py -v
cd ..
```

### Step 3.4: Merge NUTRI-38 into Main

```bash
# Switch to main
git checkout main

# Merge feature branch
git merge feature/NUTRI-38-ml-inference-api

# Push to remote
git push origin main
```

---

## Phase 4: NUTRI-40 (Bug Fix - Confidence Type)

### Step 4.1: Identify the Bug

**Bug**: The `confidence` field in predictions is returned as a **string** instead of a **float**.

**Location**: `ml-service/app/main.py`, lines 26 and 58

**Expected**: `confidence: float`  
**Actual**: `confidence: str` (e.g., `"0.89"`)

### Step 4.2: Run Tests to Verify Bug

```bash
cd ml-service

# This test should FAIL, catching the bug
python3 -m pytest tests/test_contract.py::TestAPIContract::test_confidence_is_numeric_type -v

# Output will show:
# FAILED - AssertionError: confidence must be numeric type, got str
```

### Step 4.3: Create Bugfix Branch

```bash
# Return to repo root
cd ..

# Create bugfix branch from main
git checkout main
git checkout -b bugfix/NUTRI-40-confidence-type
```

### Step 4.4: Fix the Bug

Open `ml-service/app/main.py` and make these changes:

**Line 26** - Change Pydantic model:
```python
# BEFORE (bug):
confidence: str = Field(..., description="Confidence score between 0 and 1")

# AFTER (fixed):
confidence: float = Field(..., description="Confidence score between 0 and 1", ge=0.0, le=1.0)
```

**Line 58** - Change return values in DummyFoodRecognitionModel:
```python
# BEFORE (bug):
return [
    {"name": self.FOODS[seed], "confidence": "0.89"},
    {"name": self.FOODS[(seed + 1) % len(self.FOODS)], "confidence": "0.67"},
    {"name": self.FOODS[(seed + 2) % len(self.FOODS)], "confidence": "0.45"}
]

# AFTER (fixed):
return [
    {"name": self.FOODS[seed], "confidence": 0.89},
    {"name": self.FOODS[(seed + 1) % len(self.FOODS)], "confidence": 0.67},
    {"name": self.FOODS[(seed + 2) % len(self.FOODS)], "confidence": 0.45}
]
```

### Step 4.5: Verify Fix

```bash
cd ml-service

# Run the previously failing test - should now PASS
python3 -m pytest tests/test_contract.py::TestAPIContract::test_confidence_is_numeric_type -v

# Run all tests to ensure nothing broke
python3 -m pytest tests/ -v

cd ..
```

### Step 4.6: Commit Bug Fix

```bash
# Stage the fix
git add ml-service/app/main.py

# Commit with Linear bug ID
git commit -m "NUTRI-40: Fix confidence field type from string to float

Bug: The /predict endpoint was returning confidence scores as strings
instead of numeric floats, violating the API contract (NUTRI-38).

Fix:
- Changed Pydantic model field type from str to float
- Updated mock model to return float values instead of string literals
- Added field validation constraints (ge=0.0, le=1.0)

Impact: API responses now correctly return confidence as numeric type,
allowing consumers to perform mathematical operations without parsing.

Tests: test_confidence_is_numeric_type now passes"
```

### Step 4.7: Push Bugfix Branch

```bash
# Push to remote
git push -u origin bugfix/NUTRI-40-confidence-type
```

### Step 4.8: Rebase and Merge Bugfix

```bash
# Rebase onto latest main
git pull --rebase origin main

# Switch to main
git checkout main

# Merge bugfix
git merge bugfix/NUTRI-40-confidence-type

# Push to remote
git push origin main
```

---

## Phase 5: Cleanup and Documentation

### Step 5.1: Delete Merged Branches (Optional)

```bash
# Delete local branches
git branch -d feature/NUTRI-37-food-recognition
git branch -d feature/NUTRI-38-ml-inference-api
git branch -d bugfix/NUTRI-40-confidence-type

# Delete remote branches
git push origin --delete feature/NUTRI-37-food-recognition
git push origin --delete feature/NUTRI-38-ml-inference-api
git push origin --delete bugfix/NUTRI-40-confidence-type
```

### Step 5.2: Verify Final State

```bash
# Check git log
git log --oneline --graph --all -10

# Should show:
# * NUTRI-40: Fix confidence field type from string to float
# * NUTRI-38: Define ML inference API contract specification
# * NUTRI-37: Implement food recognition model and API endpoint

# Verify all tests pass
cd ml-service
python3 -m pytest tests/ -v --tb=short
```

---

## Phase 6: Take Screenshots for Linear

### What to Capture:

1. **Git Log** showing commit history with Linear IDs:
   ```bash
   git log --oneline --graph -10
   ```

2. **Test Results** showing all tests passing:
   ```bash
   cd ml-service
   pytest tests/ -v
   ```

3. **API in Action** (Swagger UI):
   ```bash
   # Start server
   uvicorn app.main:app --reload
   
   # Visit: http://localhost:8000/docs
   # Screenshot the /predict endpoint documentation
   ```

4. **Sample API Response**:
   ```bash
   # Create test image
   python3 -c "from PIL import Image; Image.new('RGB', (800,600), 'red').save('test.jpg')"
   
   # Call endpoint
   curl -X POST "http://localhost:8000/predict" \
     -F "file=@test.jpg" | python3 -m json.tool
   ```

### Add to Linear Tickets:

- **NUTRI-37**: Screenshot of test results + API response
- **NUTRI-38**: Screenshot of API contract doc + contract tests passing
- **NUTRI-40**: Screenshot of failing test before fix + passing test after fix

---

## Summary

✅ **NUTRI-37**: Implemented on `feature/NUTRI-37-food-recognition` → merged to main  
✅ **NUTRI-38**: Implemented on `feature/NUTRI-38-ml-inference-api` → merged to main  
✅ **NUTRI-40**: Fixed on `bugfix/NUTRI-40-confidence-type` → merged to main  

All commits include Linear task IDs and follow feature branch workflow with rebase strategy.

---

## Quick Reference Commands

```bash
# Create feature branch
git checkout -b feature/NUTRI-XX-name

# Commit with Linear ID
git commit -m "NUTRI-XX: Description"

# Push branch
git push -u origin feature/NUTRI-XX-name

# Rebase onto main
git checkout feature/NUTRI-XX-name
git pull --rebase origin main

# Merge to main
git checkout main
git merge feature/NUTRI-XX-name
git push origin main
```

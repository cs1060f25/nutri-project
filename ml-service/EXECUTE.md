# Execute This Workflow - Copy/Paste Commands

**⚠️ IMPORTANT**: Run these commands in order. Don't skip steps!

---

## Phase 0: Initial Setup

```bash
# Navigate to repo
cd /Users/waseemahmad/Desktop/classes/cs1060/final_repo

# Ensure on main and up to date
git checkout main
git pull origin main

# Setup Python environment
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

---

## Phase 1: NUTRI-37 (Food Recognition API)

### Create branch and add files

```bash
# Create feature branch
git checkout -b feature/NUTRI-37-food-recognition

# Add all ml-service files
git add ml-service/

# Commit
git commit -m "NUTRI-37: Implement food recognition model and API endpoint

- Add FastAPI /predict endpoint that accepts image uploads
- Implement DummyFoodRecognitionModel with mock predictions
- Add validation for file type (JPEG/PNG) and size (max 10MB)
- Return JSON response with food predictions and confidence scores
- Add comprehensive test suite with 10 test cases
- Test success, error handling, and edge cases"

# Push to remote
git push -u origin feature/NUTRI-37-food-recognition
```

### Test NUTRI-37

```bash
cd ml-service
source venv/bin/activate
pytest tests/test_api.py -v
cd ..
```

---

## Phase 2: NUTRI-38 (API Contract)

### Create new branch from main

```bash
# Return to main
git checkout main

# Create feature branch for NUTRI-38
git checkout -b feature/NUTRI-38-ml-inference-api

# Add contract docs and tests
git add ml-service/docs/ml_inference_api_contract.md
git add ml-service/tests/test_contract.py

# Commit
git commit -m "NUTRI-38: Define ML inference API contract specification

- Create comprehensive API contract documentation
- Define /predict endpoint request/response schema
- Document error codes (400, 413, 500) with examples
- Add example usage in Python and JavaScript
- Implement contract validation test suite
- Test response structure, field types, and error handling"

# Push to remote
git push -u origin feature/NUTRI-38-ml-inference-api
```

### Test NUTRI-38

```bash
cd ml-service
source venv/bin/activate
pytest tests/test_contract.py -v
cd ..
```

---

## Phase 3: Merge Features into Main

### Merge NUTRI-37

```bash
# Checkout NUTRI-37 branch
git checkout feature/NUTRI-37-food-recognition

# Rebase onto main
git pull --rebase origin main

# Switch to main
git checkout main

# Merge NUTRI-37
git merge feature/NUTRI-37-food-recognition

# Push
git push origin main
```

### Merge NUTRI-38

```bash
# Checkout NUTRI-38 branch
git checkout feature/NUTRI-38-ml-inference-api

# Rebase onto updated main (includes NUTRI-37)
git pull --rebase origin main

# Switch to main
git checkout main

# Merge NUTRI-38
git merge feature/NUTRI-38-ml-inference-api

# Push
git push origin main
```

---

## Phase 4: NUTRI-40 Bug Fix

### Verify bug exists

```bash
cd ml-service
source venv/bin/activate

# This test should FAIL (bug exists)
pytest tests/test_contract.py::TestAPIContract::test_confidence_is_numeric_type -v

cd ..
```

### Create bugfix branch

```bash
# Create bugfix branch from main
git checkout main
git checkout -b bugfix/NUTRI-40-confidence-type
```

### Apply the fix

**Open `ml-service/app/main.py` in your editor and make these changes:**

1. **Line 26** - Change from:
   ```python
   confidence: str = Field(..., description="Confidence score between 0 and 1")
   ```
   
   To:
   ```python
   confidence: float = Field(..., description="Confidence score between 0 and 1", ge=0.0, le=1.0)
   ```

2. **Lines 58-60** - Change from:
   ```python
   return [
       {"name": self.FOODS[seed], "confidence": "0.89"},
       {"name": self.FOODS[(seed + 1) % len(self.FOODS)], "confidence": "0.67"},
       {"name": self.FOODS[(seed + 2) % len(self.FOODS)], "confidence": "0.45"}
   ]
   ```
   
   To:
   ```python
   return [
       {"name": self.FOODS[seed], "confidence": 0.89},
       {"name": self.FOODS[(seed + 1) % len(self.FOODS)], "confidence": 0.67},
       {"name": self.FOODS[(seed + 2) % len(self.FOODS)], "confidence": 0.45}
   ]
   ```

### Verify fix and commit

```bash
# Test that bug is fixed
cd ml-service
source venv/bin/activate
pytest tests/test_contract.py::TestAPIContract::test_confidence_is_numeric_type -v
# Should now PASS

# Run all tests
pytest tests/ -v
cd ..

# Commit the fix
git add ml-service/app/main.py

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

# Push bugfix
git push -u origin bugfix/NUTRI-40-confidence-type
```

### Merge bugfix into main

```bash
# Rebase onto main
git pull --rebase origin main

# Switch to main
git checkout main

# Merge bugfix
git merge bugfix/NUTRI-40-confidence-type

# Push
git push origin main
```

---

## Phase 5: Cleanup

### Delete merged branches (optional)

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

### Verify final state

```bash
# View git log
git log --oneline --graph -10

# Should show:
# * NUTRI-40: Fix confidence field type from string to float
# * NUTRI-38: Define ML inference API contract specification
# * NUTRI-37: Implement food recognition model and API endpoint
```

---

## Phase 6: Take Screenshots

### 1. Git Log

```bash
git log --oneline --graph -10 > git_log.txt
cat git_log.txt
# Screenshot this
```

### 2. All Tests Passing

```bash
cd ml-service
source venv/bin/activate
pytest tests/ -v
# Screenshot the output
```

### 3. Start Server and Test API

```bash
# Start server (in ml-service directory)
uvicorn app.main:app --reload

# In another terminal:
cd /Users/waseemahmad/Desktop/classes/cs1060/final_repo/ml-service

# Create test image
python3 -c "from PIL import Image; Image.new('RGB', (800, 600), color='red').save('test.jpg')"

# Test endpoint
curl -X POST "http://localhost:8000/predict" \
  -F "file=@test.jpg" | python3 -m json.tool

# Screenshot the response showing confidence as NUMBER not string
```

### 4. Visit Swagger UI

Open browser: http://localhost:8000/docs
- Screenshot the /predict endpoint documentation

---

## ✅ Completion Checklist

- [ ] Phase 0: Setup complete
- [ ] Phase 1: NUTRI-37 branch created, committed, pushed
- [ ] Phase 2: NUTRI-38 branch created, committed, pushed
- [ ] Phase 3: Both features merged to main
- [ ] Phase 4: Bug fix applied and merged
- [ ] Phase 5: Branches cleaned up
- [ ] Phase 6: Screenshots taken
- [ ] All tests passing
- [ ] Linear tickets updated with screenshots

---

## Quick Test All

```bash
cd /Users/waseemahmad/Desktop/classes/cs1060/final_repo/ml-service
source venv/bin/activate
pytest tests/ -v --tb=short
```

**Expected**: 23 tests, all PASS ✅

---

## Troubleshooting

### If tests fail:
```bash
# Make sure you're in venv
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt

# Run tests with more detail
pytest tests/ -vv
```

### If merge conflicts:
```bash
# View conflicts
git status

# Edit conflicting files, then:
git add <resolved-files>
git rebase --continue
```

### If you need to start over:
```bash
# Reset to main
git checkout main
git fetch origin
git reset --hard origin/main

# Delete feature branches
git branch -D feature/NUTRI-37-food-recognition
git branch -D feature/NUTRI-38-ml-inference-api
git branch -D bugfix/NUTRI-40-confidence-type

# Start from Phase 1 again
```

---

**Ready to execute?** Start with Phase 0! 🚀

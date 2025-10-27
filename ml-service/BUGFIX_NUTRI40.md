# NUTRI-40: Bug Fix Instructions

## The Bug

**Issue**: The `/predict` endpoint returns `confidence` as a **string** instead of a **float**, violating the API contract (NUTRI-38).

**Severity**: Medium - breaks API contract, prevents proper JSON parsing

**Detected by**: `test_confidence_is_numeric_type` in `tests/test_contract.py`

---

## Step-by-Step Fix

### 1. Verify the Bug Exists

```bash
cd ml-service

# Run the test that catches this bug
pytest tests/test_contract.py::TestAPIContract::test_confidence_is_numeric_type -v

# Expected output:
# FAILED - AssertionError: confidence must be numeric type, got str
```

### 2. Locate the Bug

**File**: `app/main.py`

**Problem locations**:
- **Line 26**: Pydantic model declares `confidence: str`
- **Line 58-60**: Mock model returns string literals like `"0.89"`

### 3. Apply the Fix

#### Edit 1: Fix Pydantic Model (Line 26)

**Before** (BUG):
```python
class Prediction(BaseModel):
    """Single food prediction with confidence score"""
    name: str = Field(..., description="Name of the identified food item")
    confidence: str = Field(..., description="Confidence score between 0 and 1")  # BUG: Should be float
```

**After** (FIXED):
```python
class Prediction(BaseModel):
    """Single food prediction with confidence score"""
    name: str = Field(..., description="Name of the identified food item")
    confidence: float = Field(..., description="Confidence score between 0 and 1", ge=0.0, le=1.0)
```

#### Edit 2: Fix Mock Model Return Values (Lines 58-60)

**Before** (BUG):
```python
return [
    {"name": self.FOODS[seed], "confidence": "0.89"},  # BUG: String instead of float
    {"name": self.FOODS[(seed + 1) % len(self.FOODS)], "confidence": "0.67"},
    {"name": self.FOODS[(seed + 2) % len(self.FOODS)], "confidence": "0.45"}
]
```

**After** (FIXED):
```python
return [
    {"name": self.FOODS[seed], "confidence": 0.89},
    {"name": self.FOODS[(seed + 1) % len(self.FOODS)], "confidence": 0.67},
    {"name": self.FOODS[(seed + 2) % len(self.FOODS)], "confidence": 0.45}
]
```

### 4. Verify the Fix

```bash
# Run the previously failing test
pytest tests/test_contract.py::TestAPIContract::test_confidence_is_numeric_type -v

# Should now PASS

# Run all contract tests
pytest tests/test_contract.py -v

# Run full test suite
pytest tests/ -v
```

### 5. Test the API Manually

```bash
# Start the server
uvicorn app.main:app --reload

# In another terminal, test the endpoint
curl -X POST "http://localhost:8000/predict" \
  -F "file=@tests/test_image.jpg" | python3 -m json.tool

# Verify output has confidence as NUMBER (not string):
# {
#   "predictions": [
#     {
#       "name": "Grilled Chicken Breast",
#       "confidence": 0.89          <-- FLOAT, not "0.89"
#     }
#   ]
# }
```

---

## Root Cause Analysis

**Why did this happen?**

The developer initially used string type for `confidence` to simplify the mock implementation, intending to change it later. However, the type declaration remained as `str` in both the Pydantic model and the mock return values.

**Impact:**
- API consumers receive confidence as string `"0.89"` instead of float `0.89`
- JavaScript/Python clients must manually parse strings to perform math operations
- Violates API contract specification (NUTRI-38)
- Type-safe languages fail to compile against this API

**Prevention:**
- Write contract tests FIRST (test-driven development)
- Use Pydantic field validation (`ge=0.0, le=1.0`) to enforce constraints
- Run linters/type checkers (mypy) to catch type inconsistencies

---

## Regression Test

The fix is validated by `test_confidence_is_numeric_type` in `tests/test_contract.py`:

```python
def test_confidence_is_numeric_type(self):
    """Contract: 'confidence' must be a float between 0.0 and 1.0"""
    img_data = create_test_image()
    
    response = client.post(
        "/predict",
        files={"file": ("test.jpg", img_data, "image/jpeg")}
    )
    
    assert response.status_code == 200
    predictions = response.json()["predictions"]
    
    for pred in predictions:
        confidence = pred["confidence"]
        
        # Must be numeric type (float or int), not string
        assert isinstance(confidence, (float, int)), \
            f"confidence must be numeric type, got {type(confidence).__name__}"
```

This test ensures the bug cannot regress in future changes.

---

## Commit Message Template

```
NUTRI-40: Fix confidence field type from string to float

Bug: The /predict endpoint was returning confidence scores as strings
instead of numeric floats, violating the API contract (NUTRI-38).

Fix:
- Changed Pydantic model field type from str to float
- Updated mock model to return float values instead of string literals
- Added field validation constraints (ge=0.0, le=1.0)

Impact: API responses now correctly return confidence as numeric type,
allowing consumers to perform mathematical operations without parsing.

Tests: test_confidence_is_numeric_type now passes
```

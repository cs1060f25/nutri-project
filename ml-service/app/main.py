"""
NUTRI-37: Food Recognition Model & API

FastAPI endpoint that accepts dining hall food images and returns 
predictions from a mock ML model.

Dependencies:
- NUTRI-38: ML Inference API Contract (defines schema)
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List
import io
from PIL import Image

app = FastAPI(
    title="HUDS Nutrition Analyzer - ML Inference API",
    version="1.0.0",
    description="Food recognition endpoint for dining hall photos"
)


# Response schema - matches NUTRI-38 API contract
class Prediction(BaseModel):
    """Single food prediction with confidence score"""
    name: str = Field(..., description="Name of the identified food item")
    confidence: float = Field(..., description="Confidence score between 0 and 1", ge=0.0, le=1.0)

class PredictResponse(BaseModel):
    """Response model for /predict endpoint"""
    predictions: List[Prediction]


# Mock ML model - simulates food recognition
class DummyFoodRecognitionModel:
    """
    Placeholder model that returns hardcoded predictions.
    In production, this would be replaced with a real ML model (e.g., ResNet, EfficientNet).
    """
    
    # Common Harvard dining hall foods
    FOODS = [
        "Grilled Chicken Breast",
        "Caesar Salad",
        "Pasta Primavera",
        "Brown Rice",
        "Roasted Vegetables",
        "Pizza Slice",
        "Fruit Salad",
        "Chocolate Chip Cookie"
    ]
    
    def predict(self, image: Image.Image) -> List[dict]:
        """
        Simulate ML inference on an image.
        Returns top 3 food predictions with confidence scores.
        """
        # In a real implementation, this would:
        # 1. Preprocess the image (resize, normalize)
        # 2. Run through neural network
        # 3. Apply softmax to get probabilities
        # 4. Return top-k predictions
        
        # For now, return dummy predictions based on image dimensions
        width, height = image.size
        seed = (width + height) % len(self.FOODS)
        
        return [
            {"name": self.FOODS[seed], "confidence": 0.89},
            {"name": self.FOODS[(seed + 1) % len(self.FOODS)], "confidence": 0.67},
            {"name": self.FOODS[(seed + 2) % len(self.FOODS)], "confidence": 0.45}
        ]


# Initialize model
model = DummyFoodRecognitionModel()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "service": "ml-inference-api"}


@app.post("/predict", response_model=PredictResponse)
async def predict_food(file: UploadFile = File(...)):
    """
    NUTRI-37: Food recognition endpoint
    
    Accepts an uploaded image and returns predicted food items with confidence scores.
    
    Args:
        file: Uploaded image file (JPEG, PNG)
    
    Returns:
        JSON with predictions array containing food names and confidence scores
    
    Raises:
        400: Invalid file type or missing file
        413: File too large
        500: Internal processing error
    """
    
    # Validate file is provided
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )
    
    # Validate file size (max 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")
    
    try:
        # Load image
        image = Image.open(io.BytesIO(contents))
        
        # Validate image can be opened
        image.verify()
        
        # Reopen after verify (verify closes the file)
        image = Image.open(io.BytesIO(contents))
        
        # NUTRI-44: Validate image dimensions
        width, height = image.size
        MIN_DIMENSION = 32  # Minimum 32x32 pixels
        MAX_DIMENSION = 8192  # Maximum 8192x8192 pixels
        
        if width < MIN_DIMENSION or height < MIN_DIMENSION:
            raise HTTPException(
                status_code=400,
                detail=f"Image dimensions too small. Minimum: {MIN_DIMENSION}x{MIN_DIMENSION} pixels"
            )
        
        if width > MAX_DIMENSION or height > MAX_DIMENSION:
            raise HTTPException(
                status_code=400,
                detail=f"Image dimensions too large. Maximum: {MAX_DIMENSION}x{MAX_DIMENSION} pixels"
            )
        
        # Run inference
        predictions = model.predict(image)
        
        return PredictResponse(predictions=predictions)
        
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )


# === TEST PLAN ===
#
# Unit Tests (tests/test_api.py):
# 1. test_predict_with_valid_image - Upload valid JPEG, expect 200 with predictions
# 2. test_predict_missing_file - No file uploaded, expect 400 error
# 3. test_predict_invalid_file_type - Upload .txt file, expect 400 error
# 4. test_predict_file_too_large - Upload >10MB file, expect 413 error
# 5. test_predict_corrupted_image - Upload corrupted image data, expect 500 error
#
# Integration Test:
# - Start server with uvicorn
# - curl -X POST http://localhost:8000/predict -F "file=@test_image.jpg"
# - Verify JSON response has predictions array with name and confidence fields
#
# Manual Test:
# 1. Visit http://localhost:8000/docs for Swagger UI
# 2. Test /predict endpoint with sample dining hall photo
# 3. Verify predictions are relevant food items

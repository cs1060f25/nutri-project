"""
NUTRI-37: Test suite for Food Recognition API

Tests the /predict endpoint with various scenarios including
success cases, error handling, and edge cases.
"""

import pytest
from fastapi.testclient import TestClient
from PIL import Image
import io

from app.main import app

client = TestClient(app)


def create_test_image(width=800, height=600, format="JPEG"):
    """Helper function to create a test image in memory"""
    image = Image.new('RGB', (width, height), color='red')
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format=format)
    img_byte_arr.seek(0)
    return img_byte_arr


def test_health_check():
    """Test the root endpoint returns OK status"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_predict_with_valid_jpeg():
    """
    Test successful prediction with valid JPEG image.
    Should return 200 with predictions array.
    """
    img_data = create_test_image(format="JPEG")
    
    response = client.post(
        "/predict",
        files={"file": ("test.jpg", img_data, "image/jpeg")}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify response structure
    assert "predictions" in data
    assert isinstance(data["predictions"], list)
    assert len(data["predictions"]) > 0
    
    # Verify prediction fields
    for pred in data["predictions"]:
        assert "name" in pred
        assert "confidence" in pred
        assert isinstance(pred["name"], str)
        assert len(pred["name"]) > 0


def test_predict_with_valid_png():
    """Test prediction with PNG format"""
    img_data = create_test_image(format="PNG")
    
    response = client.post(
        "/predict",
        files={"file": ("test.png", img_data, "image/png")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "predictions" in data


def test_predict_missing_file():
    """
    Test error handling when no file is provided.
    Should return 400 Bad Request.
    """
    response = client.post("/predict")
    assert response.status_code == 422  # FastAPI validation error


def test_predict_invalid_file_type():
    """
    Test error handling with invalid file type (not an image).
    Should return 400 Bad Request.
    """
    # Create a fake text file
    text_file = io.BytesIO(b"This is not an image")
    
    response = client.post(
        "/predict",
        files={"file": ("test.txt", text_file, "text/plain")}
    )
    
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]


def test_predict_file_too_large():
    """
    Test error handling with file exceeding size limit.
    Should return 413 Payload Too Large.
    """
    # Create a large fake file (11MB)
    large_data = io.BytesIO(b"x" * (11 * 1024 * 1024))
    
    response = client.post(
        "/predict",
        files={"file": ("large.jpg", large_data, "image/jpeg")}
    )
    
    assert response.status_code == 413
    assert "too large" in response.json()["detail"].lower()


def test_predict_corrupted_image():
    """
    Test error handling with corrupted image data.
    Should return 500 Internal Server Error.
    """
    # Send invalid image data
    corrupted_data = io.BytesIO(b"CORRUPTED_IMAGE_DATA")
    
    response = client.post(
        "/predict",
        files={"file": ("bad.jpg", corrupted_data, "image/jpeg")}
    )
    
    assert response.status_code == 500
    assert "Error processing image" in response.json()["detail"]


def test_prediction_confidence_range():
    """
    Test that confidence scores are within valid range.
    Confidence should be between 0 and 1.
    """
    img_data = create_test_image()
    
    response = client.post(
        "/predict",
        files={"file": ("test.jpg", img_data, "image/jpeg")}
    )
    
    assert response.status_code == 200
    predictions = response.json()["predictions"]
    
    for pred in predictions:
        # Parse confidence (currently string, should be float)
        confidence = float(pred["confidence"])
        assert 0 <= confidence <= 1, f"Confidence {confidence} out of valid range"


def test_multiple_predictions_returned():
    """Test that endpoint returns multiple predictions (top-k results)"""
    img_data = create_test_image()
    
    response = client.post(
        "/predict",
        files={"file": ("test.jpg", img_data, "image/jpeg")}
    )
    
    assert response.status_code == 200
    predictions = response.json()["predictions"]
    
    # Should return multiple predictions (at least 2-3 food items)
    assert len(predictions) >= 2


def test_predictions_ordered_by_confidence():
    """Test that predictions are ordered by confidence (highest first)"""
    img_data = create_test_image()
    
    response = client.post(
        "/predict",
        files={"file": ("test.jpg", img_data, "image/jpeg")}
    )
    
    assert response.status_code == 200
    predictions = response.json()["predictions"]
    
    confidences = [float(p["confidence"]) for p in predictions]
    
    # Verify descending order
    for i in range(len(confidences) - 1):
        assert confidences[i] >= confidences[i + 1], \
            "Predictions should be ordered by confidence (descending)"


def test_reject_tiny_images():
    """
    NUTRI-44: Test that images with dimensions too small are rejected.
    Bug: API accepts 1x1 pixel images which can't contain meaningful food data.
    """
    # Create a 1x1 pixel image (too small for food recognition)
    tiny_image = Image.new('RGB', (1, 1), color='red')
    img_byte_arr = io.BytesIO()
    tiny_image.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    
    response = client.post(
        "/predict",
        files={"file": ("tiny.jpg", img_byte_arr, "image/jpeg")}
    )
    
    # Should reject images smaller than minimum dimensions
    assert response.status_code == 400
    assert "too small" in response.json()["detail"].lower()


def test_reject_oversized_images():
    """
    NUTRI-44: Test that images with excessive dimensions are rejected.
    Bug: API accepts extremely large images (e.g., 50000x50000) causing memory issues.
    """
    # Create metadata for a huge image (don't actually create it to save memory)
    # We'll test with a moderately large image instead
    large_image = Image.new('RGB', (10000, 10000), color='blue')
    img_byte_arr = io.BytesIO()
    large_image.save(img_byte_arr, format='JPEG', quality=10)  # Low quality to reduce size
    img_byte_arr.seek(0)
    
    response = client.post(
        "/predict",
        files={"file": ("huge.jpg", img_byte_arr, "image/jpeg")}
    )
    
    # Should reject images larger than maximum dimensions
    assert response.status_code == 400
    assert "too large" in response.json()["detail"].lower() or "dimension" in response.json()["detail"].lower()

"""
NUTRI-38: API Contract Validation Tests

Validates that the /predict endpoint conforms to the specification
defined in docs/ml_inference_api_contract.md
"""

import pytest
from fastapi.testclient import TestClient
from PIL import Image
import io

from app.main import app

client = TestClient(app)


def create_test_image():
    """Helper to create a valid test image"""
    image = Image.new('RGB', (800, 600), color='blue')
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    return img_byte_arr


class TestAPIContract:
    """Test suite validating compliance with NUTRI-38 API contract"""
    
    def test_response_has_predictions_field(self):
        """Contract: Response must contain 'predictions' field"""
        img_data = create_test_image()
        
        response = client.post(
            "/predict",
            files={"file": ("test.jpg", img_data, "image/jpeg")}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Contract requirement: 'predictions' field must exist
        assert "predictions" in data, "Response missing required 'predictions' field"
    
    
    def test_predictions_is_array(self):
        """Contract: 'predictions' must be an array"""
        img_data = create_test_image()
        
        response = client.post(
            "/predict",
            files={"file": ("test.jpg", img_data, "image/jpeg")}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data["predictions"], list), \
            "predictions must be an array"
    
    
    def test_prediction_has_name_field(self):
        """Contract: Each prediction must have 'name' field (string)"""
        img_data = create_test_image()
        
        response = client.post(
            "/predict",
            files={"file": ("test.jpg", img_data, "image/jpeg")}
        )
        
        assert response.status_code == 200
        predictions = response.json()["predictions"]
        
        for pred in predictions:
            assert "name" in pred, "Prediction missing 'name' field"
            assert isinstance(pred["name"], str), \
                f"'name' must be string, got {type(pred['name'])}"
    
    
    def test_prediction_has_confidence_field(self):
        """Contract: Each prediction must have 'confidence' field"""
        img_data = create_test_image()
        
        response = client.post(
            "/predict",
            files={"file": ("test.jpg", img_data, "image/jpeg")}
        )
        
        assert response.status_code == 200
        predictions = response.json()["predictions"]
        
        for pred in predictions:
            assert "confidence" in pred, "Prediction missing 'confidence' field"
    
    
    def test_confidence_is_numeric_type(self):
        """
        Contract: 'confidence' must be a float between 0.0 and 1.0
        
        NOTE: This test currently FAILS because of NUTRI-40 bug
        (confidence is returned as string instead of float)
        """
        img_data = create_test_image()
        
        response = client.post(
            "/predict",
            files={"file": ("test.jpg", img_data, "image/jpeg")}
        )
        
        assert response.status_code == 200
        predictions = response.json()["predictions"]
        
        for pred in predictions:
            confidence = pred["confidence"]
            
            # Contract requirement: confidence must be float, not string
            assert isinstance(confidence, (float, int)), \
                f"confidence must be numeric type, got {type(confidence).__name__}"
    
    
    def test_confidence_in_valid_range(self):
        """Contract: Confidence must be between 0.0 and 1.0"""
        img_data = create_test_image()
        
        response = client.post(
            "/predict",
            files={"file": ("test.jpg", img_data, "image/jpeg")}
        )
        
        assert response.status_code == 200
        predictions = response.json()["predictions"]
        
        for pred in predictions:
            # Parse as float (handles both string and float)
            confidence = float(pred["confidence"])
            
            assert 0.0 <= confidence <= 1.0, \
                f"Confidence {confidence} outside valid range [0.0, 1.0]"
    
    
    def test_predictions_ordered_by_confidence(self):
        """Contract: Predictions must be ordered by confidence (descending)"""
        img_data = create_test_image()
        
        response = client.post(
            "/predict",
            files={"file": ("test.jpg", img_data, "image/jpeg")}
        )
        
        assert response.status_code == 200
        predictions = response.json()["predictions"]
        
        if len(predictions) > 1:
            confidences = [float(p["confidence"]) for p in predictions]
            
            # Verify descending order
            for i in range(len(confidences) - 1):
                assert confidences[i] >= confidences[i + 1], \
                    "Predictions must be ordered by confidence (highest first)"
    
    
    def test_error_400_for_invalid_file_type(self):
        """Contract: Return 400 for invalid file types"""
        text_file = io.BytesIO(b"Not an image")
        
        response = client.post(
            "/predict",
            files={"file": ("test.txt", text_file, "text/plain")}
        )
        
        # Contract requirement: 400 Bad Request
        assert response.status_code == 400
        assert "detail" in response.json()
    
    
    def test_error_413_for_large_file(self):
        """Contract: Return 413 for files exceeding size limit"""
        # Create file larger than 10MB
        large_data = io.BytesIO(b"x" * (11 * 1024 * 1024))
        
        response = client.post(
            "/predict",
            files={"file": ("huge.jpg", large_data, "image/jpeg")}
        )
        
        # Contract requirement: 413 Payload Too Large
        assert response.status_code == 413
    
    
    def test_error_500_for_corrupted_image(self):
        """Contract: Return 500 for processing errors"""
        corrupted_data = io.BytesIO(b"CORRUPTED_IMAGE")
        
        response = client.post(
            "/predict",
            files={"file": ("bad.jpg", corrupted_data, "image/jpeg")}
        )
        
        # Contract requirement: 500 Internal Server Error
        assert response.status_code == 500
        assert "detail" in response.json()
    
    
    def test_accepts_jpeg_format(self):
        """Contract: Must accept JPEG files"""
        img = Image.new('RGB', (400, 300), color='green')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        response = client.post(
            "/predict",
            files={"file": ("test.jpeg", img_bytes, "image/jpeg")}
        )
        
        assert response.status_code == 200
    
    
    def test_accepts_png_format(self):
        """Contract: Must accept PNG files"""
        img = Image.new('RGB', (400, 300), color='yellow')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        response = client.post(
            "/predict",
            files={"file": ("test.png", img_bytes, "image/png")}
        )
        
        assert response.status_code == 200

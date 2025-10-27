# ML Inference API Contract

**Ticket**: NUTRI-38  
**Version**: 1.0.0  
**Service**: HUDS Nutrition Analyzer - ML Inference API

## Overview

This document defines the API contract for the ML food recognition service. The `/predict` endpoint accepts dining hall food images and returns predictions with confidence scores.

---

## Endpoint: POST /predict

**Purpose**: Identify food items from an uploaded image.

**URL**: `http://localhost:8000/predict`

**Method**: `POST`

**Content-Type**: `multipart/form-data`

---

## Request Schema

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | File | Yes | Image file (JPEG, PNG) containing food items |

### Constraints

- **Max file size**: 10 MB
- **Allowed formats**: JPEG, JPG, PNG
- **Recommended resolution**: 224x224 to 1024x1024 pixels

### Example Request

```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@dining_hall_plate.jpg"
```

---

## Response Schema

### Success Response (200 OK)

```json
{
  "predictions": [
    {
      "name": "Grilled Chicken Breast",
      "confidence": 0.89
    },
    {
      "name": "Caesar Salad",
      "confidence": 0.67
    },
    {
      "name": "Brown Rice",
      "confidence": 0.45
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `predictions` | Array | List of predicted food items (ordered by confidence, descending) |
| `predictions[].name` | String | Name of the identified food item |
| `predictions[].confidence` | Float | Confidence score between 0.0 and 1.0 |

### Notes

- The API returns **up to 3 predictions** per image
- Predictions are sorted by confidence in **descending order**
- Confidence scores represent the model's certainty (1.0 = 100% confident)

---

## Error Responses

### 400 Bad Request

**Cause**: Invalid file type or missing file

```json
{
  "detail": "Invalid file type. Allowed: image/jpeg, image/jpg, image/png"
}
```

**Example scenarios**:
- Uploading a non-image file (e.g., `.txt`, `.pdf`)
- File parameter is missing
- Corrupted file headers

---

### 413 Payload Too Large

**Cause**: File exceeds size limit

```json
{
  "detail": "File too large (max 10MB)"
}
```

---

### 500 Internal Server Error

**Cause**: Server-side processing error

```json
{
  "detail": "Error processing image: cannot identify image file"
}
```

**Example scenarios**:
- Corrupted image data
- Unsupported image encoding
- Model inference failure

---

## Example Usage

### Python (requests)

```python
import requests

url = "http://localhost:8000/predict"
files = {"file": open("plate.jpg", "rb")}

response = requests.post(url, files=files)
predictions = response.json()["predictions"]

for pred in predictions:
    print(f"{pred['name']}: {pred['confidence']:.2%}")
```

### JavaScript (fetch)

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:8000/predict', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log(data.predictions);
```

---

## Integration Notes

### Dependencies

- **NUTRI-37**: Food Recognition Model & API (implements this contract)
- **Backend API**: Will call this endpoint when users upload photos
- **Frontend**: Photo capture component will POST to this endpoint

### Future Enhancements

- [ ] Support batch prediction (multiple images)
- [ ] Add nutrition info per food item
- [ ] Return bounding boxes for multi-item plates
- [ ] Add webhook support for async processing

---

## Performance Requirements

### Response Time SLA

- **p50 (median)**: < 200ms for images under 2MB
- **p95**: < 500ms for images under 5MB
- **p99**: < 1000ms for images under 10MB

### Throughput

- **Minimum**: 10 requests per second
- **Target**: 50 requests per second
- **Burst**: 100 requests per second for up to 30 seconds

### Model Inference

- **Latency**: < 150ms for model prediction
- **Preprocessing**: < 50ms for image resize/normalization
- **Postprocessing**: < 10ms for confidence sorting

---

## Validation Checklist

- [ ] Request accepts JPEG and PNG files
- [ ] Response contains `predictions` array
- [ ] Each prediction has `name` (string) and `confidence` (float 0-1)
- [ ] Predictions are ordered by confidence (descending)
- [ ] 400 error for invalid file types
- [ ] 413 error for files > 10MB
- [ ] 500 error for processing failures
- [ ] Response time under 500ms for typical images
- [ ] Handles 10+ concurrent requests

---

**Maintained by**: Waseem Ahmad  
**Last updated**: October 27, 2025  
**Version**: 1.0.1 (NUTRI-38: Added performance requirements)

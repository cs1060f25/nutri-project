#!/bin/bash

# Test script for Gemini meal analyzer endpoint
# Make sure backend server is running with GEMINI_API_KEY configured

echo "🧪 Testing Gemini Meal Analyzer Endpoint"
echo "========================================="
echo ""

# Check if an image file is provided
if [ -z "$1" ]; then
  echo "❌ Error: No image file specified"
  echo "Usage: ./test-gemini-analyzer.sh <path-to-image.jpg>"
  echo ""
  echo "Example:"
  echo "  ./test-gemini-analyzer.sh ~/Desktop/meal-photo.jpg"
  exit 1
fi

IMAGE_FILE="$1"

# Check if file exists
if [ ! -f "$IMAGE_FILE" ]; then
  echo "❌ Error: Image file not found: $IMAGE_FILE"
  exit 1
fi

echo "📸 Image file: $IMAGE_FILE"
echo "🌐 Testing endpoint: http://localhost:3000/api/analyze-meal"
echo ""
echo "Sending request..."
echo ""

# Make the request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  http://localhost:3000/api/analyze-meal \
  -F "image=@${IMAGE_FILE}")

# Extract HTTP code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Response Status: $HTTP_CODE"
echo ""
echo "📄 Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ Test PASSED"
else
  echo "❌ Test FAILED"
fi


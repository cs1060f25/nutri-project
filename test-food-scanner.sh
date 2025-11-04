#!/bin/bash

# Food Scanner Feature Test Script
# HW8 NUTRI-70

echo "======================================"
echo "Testing Food Scanner Feature"
echo "======================================"

# Test 1: Check if backend is running
echo -e "\n[TEST 1] Checking backend health..."
curl -s http://localhost:3333/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Backend server is running on port 3333"
else
    echo "❌ Backend server is NOT running. Start it with: node backend/test-scan-endpoint.js"
    exit 1
fi

# Test 2: Test scan with image
echo -e "\n[TEST 2] Testing scan with image..."
RESPONSE=$(curl -s -X POST http://localhost:3333/api/scan -F "image=@ml-service/test.jpg")
if echo "$RESPONSE" | grep -q "protein"; then
    echo "✅ Scan successful! Response:"
    echo "$RESPONSE" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2))"
else
    echo "❌ Scan failed. Response:"
    echo "$RESPONSE"
fi

# Test 3: Test error handling (no file)
echo -e "\n[TEST 3] Testing error handling (no file)..."
ERROR_RESPONSE=$(curl -s -X POST http://localhost:3333/api/scan)
if echo "$ERROR_RESPONSE" | grep -q "NO_FILE"; then
    echo "✅ Error handling works correctly"
else
    echo "❌ Error handling failed"
fi

# Test 4: Check if frontend is running
echo -e "\n[TEST 4] Checking frontend..."
curl -s http://localhost:3001 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Frontend is running on port 3001"
    echo ""
    echo "📱 To test the UI:"
    echo "   1. Open http://localhost:3001"
    echo "   2. Login with your test account"
    echo "   3. Click 'Food Scanner' in sidebar"
    echo "   4. Upload an image and click 'Scan Food'"
else
    echo "❌ Frontend is NOT running. Start it with: cd frontend && npm start"
fi

echo -e "\n======================================"
echo "Test Complete!"
echo "======================================"

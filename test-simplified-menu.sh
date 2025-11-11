#!/bin/bash
# Test the simplified menu endpoint

echo "Testing simplified menu (filtered data)..."
echo "==========================================="
curl -s http://localhost:3000/api/analyze-meal/menu-preview | head -50

echo ""
echo ""
echo "Response size comparison:"
echo "-------------------------"
echo "Full response: ~$(curl -s http://localhost:3000/api/analyze-meal/menu-preview | wc -c) bytes"

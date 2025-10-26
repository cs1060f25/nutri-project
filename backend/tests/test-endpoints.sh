#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL (change if needed)
BASE_URL="http://localhost:3000"

echo -e "${YELLOW}🧪 Testing Authentication Endpoints${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}1. Testing Health Check${NC}"
curl -s "$BASE_URL/health" | jq '.'
echo -e "\n"

# Test 2: Register
echo -e "${YELLOW}2. Testing Registration${NC}"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "$REGISTER_RESPONSE" | jq '.'
echo -e "\n"

# Test 3: Login
echo -e "${YELLOW}3. Testing Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "$LOGIN_RESPONSE" | jq '.'

# Extract tokens
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.refreshToken')
echo -e "\n"

# Test 4: Get Current User
echo -e "${YELLOW}4. Testing Get Current User (GET /auth/me)${NC}"
curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo -e "\n"

# Test 5: Refresh Token
echo -e "${YELLOW}5. Testing Refresh Token${NC}"
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")

echo "$REFRESH_RESPONSE" | jq '.'

# Extract new access token
NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.accessToken')
echo -e "\n"

# Test 6: Verify new access token works
echo -e "${YELLOW}6. Verifying New Access Token${NC}"
curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" | jq '.'
echo -e "\n"

# Test 7: Logout
echo -e "${YELLOW}7. Testing Logout${NC}"
curl -s -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'
echo -e "\n"

# Test 8: Verify token is revoked (should fail)
echo -e "${YELLOW}8. Verifying Token Revocation (should fail)${NC}"
curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" | jq '.'
echo -e "\n"

# Test 9: Test duplicate registration (should fail with 409)
echo -e "${YELLOW}9. Testing Duplicate Registration (should fail with 409)${NC}"
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" | jq '.'
echo -e "\n"

# Test 10: Test wrong password (should fail with 401)
echo -e "${YELLOW}10. Testing Wrong Password (should fail with 401)${NC}"
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"WrongPassword123!\"}" | jq '.'
echo -e "\n"

echo -e "${GREEN}✅ All tests completed!${NC}"


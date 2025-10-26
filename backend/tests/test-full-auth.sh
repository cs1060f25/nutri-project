#!/bin/bash

echo "🧪 Full Authentication Test"
echo "============================"
echo ""

TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="SecurePassword123!"

# 1. Register
echo "1️⃣  REGISTER"
REGISTER=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
echo "$REGISTER" | jq '.'
echo ""

# 2. Login
echo "2️⃣  LOGIN"
LOGIN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
echo "$LOGIN" | jq '.'

ACCESS_TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN" | jq -r '.refreshToken')
echo ""

# 3. Get Current User
echo "3️⃣  GET CURRENT USER (/auth/me)"
ME=$(curl -s -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo "$ME" | jq '.'
echo ""

# 4. Refresh Token
echo "4️⃣  REFRESH TOKEN"
REFRESH=$(curl -s -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
echo "$REFRESH" | jq '.'

NEW_ACCESS_TOKEN=$(echo "$REFRESH" | jq -r '.accessToken')
echo ""

# 5. Logout
echo "5️⃣  LOGOUT"
LOGOUT=$(curl -s -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "$LOGOUT" | jq '.'
echo ""

# 6. Verify token is revoked
echo "6️⃣  VERIFY TOKEN REVOKED (should fail)"
REVOKED=$(curl -s -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN")
echo "$REVOKED" | jq '.'
echo ""

echo "============================"
echo "✅ All authentication tests completed!"
echo "============================"


#!/bin/bash
# Test CRM search functionality

API_URL="http://localhost:8000"

# Login first
echo "=== Login ==="
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=hannes&password=hannes123")
echo "$LOGIN_RESPONSE"
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')

echo ""
echo "=== Testing lecturer search for 'TikTok' (should find Nico Geiger) ==="
curl -s -X GET "${API_URL}/api/lecturers?q=TikTok" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.[] | {name, is_active}'

echo ""
echo "=== Testing lecturer search without query (first 3) ==="
curl -s -X GET "${API_URL}/api/lecturers" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.[0:3] | .[] | {name, is_active, courses}'

echo ""
echo "=== Check if is_active field is being returned ==="
curl -s -X GET "${API_URL}/api/lecturers" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.[0] | keys'

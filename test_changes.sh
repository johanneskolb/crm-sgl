#!/bin/bash
# Test script to verify the CRM changes

API_URL="http://127.0.0.1:8000"

# Login
echo "=== Logging in ==="
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=Hannes&password=hannes123" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "✗ Login failed"
  exit 1
fi
echo "✓ Login successful (token: ${TOKEN:0:20}...)"

# Test 1: Create a note with source
echo -e "\n=== Test 1: Create note with source ==="
NOTE_RESPONSE=$(curl -s -X POST "$API_URL/api/notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Note",
    "content": "This is a test note",
    "source": "Von Hannes",
    "tags": "test"
  }')

NOTE_ID=$(echo "$NOTE_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
NOTE_SOURCE=$(echo "$NOTE_RESPONSE" | grep -o '"source":"[^"]*' | cut -d'"' -f4)

if [ "$NOTE_SOURCE" = "Von Hannes" ]; then
  echo "✓ Note created with source: $NOTE_SOURCE"
else
  echo "✗ Note source not saved correctly: $NOTE_SOURCE"
fi

# Test 2: Search lecturers by name
echo -e "\n=== Test 2: Search lecturers by name ==="
LECTURER_SEARCH=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/lecturers?q=Prof" | grep -c '"name"')

echo "Found $LECTURER_SEARCH lecturers matching 'Prof'"

# Test 3: Get all notes and check source field exists
echo -e "\n=== Test 3: Verify notes have source field ==="
NOTES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/notes")
HAS_SOURCE=$(echo "$NOTES_RESPONSE" | grep -c '"source"')

if [ "$HAS_SOURCE" -gt 0 ]; then
  echo "✓ Notes API returns source field"
  echo "$NOTES_RESPONSE" | grep -o '"source":"[^"]*' | head -3
else
  echo "✗ Notes API missing source field"
fi

# Clean up test note
if [ -n "$NOTE_ID" ]; then
  echo -e "\n=== Cleaning up test note ==="
  curl -s -X DELETE "$API_URL/api/notes/$NOTE_ID" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
  echo "✓ Test note deleted"
fi

echo -e "\n=== All tests completed ==="

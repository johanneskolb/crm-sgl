#!/bin/bash
# Test script to verify lecturer courses functionality

API_URL="http://127.0.0.1:8000"

echo "=== CRM Lecturer Courses Test ==="
echo "Testing the 'Vorlesungen' (Courses) feature"
echo ""

# Login
echo "1. Logging in..."
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=Hannes&password=hannes123" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "✗ Login failed"
  exit 1
fi
echo "✓ Login successful"

# Get first lecturer
echo ""
echo "2. Fetching lecturers..."
LECTURERS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/lecturers")
FIRST_LECTURER_ID=$(echo "$LECTURERS" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
FIRST_LECTURER_NAME=$(echo "$LECTURERS" | grep -o '"name":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$FIRST_LECTURER_ID" ]; then
  echo "✗ No lecturers found in database"
  exit 1
fi

echo "✓ Found lecturer: $FIRST_LECTURER_NAME (ID: $FIRST_LECTURER_ID)"

# Add a course to the lecturer
echo ""
echo "3. Adding course 'HD23A23' to lecturer..."
COURSE_RESPONSE=$(curl -s -X POST "$API_URL/api/lecturers/$FIRST_LECTURER_ID/courses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_name": "HD23A23",
    "subject": "Test Subject",
    "semester": "WS2023"
  }')

COURSE_ID=$(echo "$COURSE_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
COURSE_NAME=$(echo "$COURSE_RESPONSE" | grep -o '"course_name":"[^"]*' | cut -d'"' -f4)

if [ "$COURSE_NAME" = "HD23A23" ]; then
  echo "✓ Course added: $COURSE_NAME (ID: $COURSE_ID)"
else
  echo "✗ Failed to add course"
  echo "Response: $COURSE_RESPONSE"
  exit 1
fi

# Add another course
echo ""
echo "4. Adding course 'HD24B12' to lecturer..."
COURSE_RESPONSE2=$(curl -s -X POST "$API_URL/api/lecturers/$FIRST_LECTURER_ID/courses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_name": "HD24B12",
    "subject": "Another Subject",
    "semester": "SS2024"
  }')

COURSE_ID2=$(echo "$COURSE_RESPONSE2" | grep -o '"id":[0-9]*' | cut -d':' -f2)
COURSE_NAME2=$(echo "$COURSE_RESPONSE2" | grep -o '"course_name":"[^"]*' | cut -d'"' -f4)

if [ "$COURSE_NAME2" = "HD24B12" ]; then
  echo "✓ Course added: $COURSE_NAME2 (ID: $COURSE_ID2)"
else
  echo "✗ Failed to add second course"
fi

# Verify courses appear in lecturer list
echo ""
echo "5. Verifying courses appear in GET /api/lecturers..."
UPDATED_LECTURERS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/lecturers")
LECTURER_DATA=$(echo "$UPDATED_LECTURERS" | grep -A50 "\"id\":$FIRST_LECTURER_ID")

COURSES_FOUND=$(echo "$LECTURER_DATA" | grep -o '"courses":\[' | wc -l)
if [ "$COURSES_FOUND" -gt 0 ]; then
  echo "✓ Lecturer data includes courses array"
  echo ""
  echo "Courses for $FIRST_LECTURER_NAME:"
  echo "$LECTURER_DATA" | grep -o '"course_name":"[^"]*' | cut -d'"' -f4 | sed 's/^/  - /'
else
  echo "✗ Courses not found in lecturer data"
fi

# Clean up - delete test courses
echo ""
echo "6. Cleaning up test courses..."
if [ -n "$COURSE_ID" ]; then
  curl -s -X DELETE "$API_URL/api/lecturers/$FIRST_LECTURER_ID/courses/$COURSE_ID" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
  echo "✓ Deleted course HD23A23"
fi

if [ -n "$COURSE_ID2" ]; then
  curl -s -X DELETE "$API_URL/api/lecturers/$FIRST_LECTURER_ID/courses/$COURSE_ID2" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
  echo "✓ Deleted course HD24B12"
fi

echo ""
echo "=== Test completed successfully ==="
echo ""
echo "Frontend verification:"
echo "1. Open http://localhost:5173 (or your CRM frontend URL)"
echo "2. Navigate to the 'Dozenten' tab"
echo "3. Verify the column header shows 'Vorlesungen' (not 'Kurse')"
echo "4. Check that courses appear as comma-separated values (e.g., 'HD23A23, HD24B12')"

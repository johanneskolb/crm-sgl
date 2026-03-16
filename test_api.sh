#!/bin/bash
# Login
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Hannes","password":"hannes123"}' | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "Token: ${TOKEN:0:20}..."

# Get lecturers
echo -e "\n=== Lecturers (first entry) ==="
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8000/api/lecturers | jq '.[0] | {id, name, is_active, courses}'

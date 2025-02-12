#!/bin/bash

# Load environment variables from .env.local
if [ ! -f ".env.local" ]; then
    echo "Error: .env.local file not found"
    exit 1
fi

# Source the .env.local file
set -a
source .env.local
set +a

echo "Exporting Supabase schema..."

# Get schema information using REST API
curl -s \
  -H "apikey: $SUPABASE_ADMIN_KEY" \
  -H "Authorization: Bearer $SUPABASE_ADMIN_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  | jq '.' > supabase.json

if [ $? -eq 0 ]; then
    echo "Schema successfully exported to supabase.json"
else
    echo "Error: Failed to export schema"
    exit 1
fi

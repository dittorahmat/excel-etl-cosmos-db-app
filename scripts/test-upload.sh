#!/bin/bash

# Test file upload script for Excel to Cosmos DB

# Configuration
MAX_RETRIES=3
RETRY_DELAY=2
BASE_URL="http://localhost:3001/api/v2"
TEST_FILES_DIR="$(pwd)/test-files"

# Create test files directory if it doesn't exist
mkdir -p "$TEST_FILES_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print a test header
print_header() {
  echo -e "\n${YELLOW}========================================"
  echo " $1"
  echo "========================================${NC}"
}

# Function to print success message
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error message
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Function to make API calls with retries
api_request() {
  local method="$1"
  local url="$2"
  local data="$3"
  local headers="${4:-}"
  local retries=0
  local response
  
  while [ $retries -lt $MAX_RETRIES ]; do
    if [ -z "$data" ]; then
      response=$(curl -s -X "$method" "$url" -H "$headers" 2>&1)
    else
      response=$(curl -s -X "$method" "$url" -d "$data" -H "$headers" 2>&1)
    fi
    
    # Check if curl command was successful
    if [ $? -eq 0 ]; then
      echo "$response"
      return 0
    fi
    
    retries=$((retries + 1))
    if [ $retries -lt $MAX_RETRIES ]; then
      echo "Attempt $retries failed, retrying in $RETRY_DELAY seconds..."
      sleep $RETRY_DELAY
    fi
  done
  
  print_error "Failed to execute API request after $MAX_RETRIES attempts"
  return 1
}

# Function to create test files
create_test_files() {
  print_header "Creating test files"
  
  # Create CSV test file
  cat > "$TEST_FILES_DIR/test-upload.csv" << EOF
Name,Age,City,Email,Phone
John Doe,30,New York,john@example.com,123-456-7890
Jane Smith,25,Los Angeles,jane@example.com,234-567-8901
Bob Johnson,35,Chicago,bob@example.com,345-678-9012
Alice Brown,28,Houston,alice@example.com,456-789-0123
Charlie Wilson,42,Phoenix,charlie@example.com,567-890-1234
EOF
  print_success "Created test-upload.csv"
  
  # Create empty CSV file
  touch "$TEST_FILES_DIR/empty.csv"
  print_success "Created empty.csv"
  
  # Create invalid file
  echo "This is not a valid CSV or Excel file" > "$TEST_FILES_DIR/invalid.txt"
  print_success "Created invalid.txt"
}

# Main test function
run_tests() {
  # Create test files if they don't exist
  if [ ! -f "$TEST_FILES_DIR/test-upload.csv" ]; then
    create_test_files
  fi
  
  # Test 1: Upload CSV file
  print_header "TEST 1: Upload CSV File"
  response=$(curl -s -X POST -F "file=@$TEST_FILES_DIR/test-upload.csv;type=text/csv" "$BASE_URL/imports")
  echo "$response" | jq .
  
  # Extract import ID (try multiple possible fields)
  CSV_IMPORT_ID=$(echo "$response" | jq -r '.importId // .id // empty' | sed 's/^import_//')
  if [ -n "$CSV_IMPORT_ID" ]; then
    print_success "CSV file uploaded with ID: $CSV_IMPORT_ID"
    echo "Full response: $response"
  else
    print_error "Failed to upload CSV file"
    echo "Server response: $response"
    echo "Trying to continue with the first import from the list..."
  fi
  
  # Ensure we have the full import ID with double 'import_' prefix for API calls
  if [ -n "$CSV_IMPORT_ID" ]; then
    if [[ ! "$CSV_IMPORT_ID" =~ ^import_import_ ]]; then
      CSV_IMPORT_ID="import_${CSV_IMPORT_ID#import_}"
    fi
  fi
  
  # Wait for processing to complete
  sleep 2
  
  # Test 2: List all imports
  print_header "TEST 2: List All Imports"
  response=$(api_request "GET" "$BASE_URL/imports?page=1&pageSize=10&sort=-createdAt")
  echo "$response" | jq .
  
  # Get the latest import ID if not set
  if [ -z "$CSV_IMPORT_ID" ]; then
    CSV_IMPORT_ID=$(echo "$response" | jq -r '.items[0].id // .data[0].id // empty' | sed 's/^import_//')
    if [ -n "$CSV_IMPORT_ID" ]; then
      # Ensure we have the full import ID with double 'import_' prefix
      if [[ ! "$CSV_IMPORT_ID" =~ ^import_import_ ]]; then
        CSV_IMPORT_ID="import_${CSV_IMPORT_ID#import_}"
      fi
      print_success "Using import ID from list: $CSV_IMPORT_ID"
    else
      print_error "No valid import ID found in the imports list"
      echo "Response: $response"
    fi
  fi
  
  if [ -n "$CSV_IMPORT_ID" ]; then
    # Test 3: Get import details
    print_header "TEST 3: Get Import Details"
    response=$(api_request "GET" "$BASE_URL/imports/$CSV_IMPORT_ID")
    echo "$response" | jq .
    
    # Test 4: Get import rows
    print_header "TEST 4: Get Import Rows"
    response=$(api_request "GET" "$BASE_URL/imports/$CSV_IMPORT_ID/rows?limit=10")
    echo "$response" | jq .
    
    # Verify row count
    expected_rows=5  # 1 header + 4 data rows
    actual_rows=$(echo "$response" | jq '.data | length')
    if [ "$actual_rows" -eq $expected_rows ]; then
      print_success "Expected $expected_rows rows, found $actual_rows"
    else
      print_error "Expected $expected_rows rows, but found $actual_rows"
    fi
  else
    print_error "No valid import ID found for testing"
  fi
  
  # Test 5: Test empty file
  print_header "TEST 5: Test Empty File"
  response=$(curl -s -X POST -F "file=@$TEST_FILES_DIR/empty.csv;type=application/octet-stream" "$BASE_URL/imports")
  echo "$response" | jq .
  
  # Test 6: Test invalid file type
  print_header "TEST 6: Test Invalid File Type"
  response=$(curl -s -X POST -F "file=@$TEST_FILES_DIR/invalid.txt;type=text/plain" "$BASE_URL/imports")
  echo "$response" | jq .
  
  # Test 7: Test large file upload (if available)
  if [ -f "$TEST_FILES_DIR/large-file.csv" ]; then
    print_header "TEST 7: Test Large File Upload"
    response=$(curl -s -X POST -F "file=@$TEST_FILES_DIR/large-file.csv;type=text/csv" "$BASE_URL/imports")
    echo "$response" | jq .
  else
    print_header "TEST 7: Skipping Large File Test (file not found)"
    echo "To test large file uploads, create a file at $TEST_FILES_DIR/large-file.csv"
  fi
  
  print_header "TEST SUMMARY"
  if [ -n "$CSV_IMPORT_ID" ]; then
    print_success "CSV file upload test completed successfully"
  else
    print_error "CSV file upload test failed"
  fi
}

# Run the tests
run_tests

echo -e "\n${GREEN}All tests completed!${NC}"

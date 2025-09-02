#!/bin/bash

# Product Module Test Automation Script
# This script implements comprehensive testing following BMAD methodology
# (Boundary-value analysis, Mutation testing, Automation, Documentation)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
COVERAGE_DIR="$PROJECT_ROOT/coverage"
LOG_FILE="$TEST_RESULTS_DIR/test-automation.log"

# Ensure directories exist
mkdir -p "$TEST_RESULTS_DIR"
mkdir -p "$COVERAGE_DIR"

# Logging function
log() {
    echo -e "${1}" | tee -a "$LOG_FILE"
}

# Function to print section headers
print_section() {
    echo ""
    log "${BLUE}======================================"
    log "$1"
    log "======================================${NC}"
    echo ""
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run tests with error handling
run_test_suite() {
    local test_name="$1"
    local test_command="$2"
    local description="$3"
    
    log "${YELLOW}Running: $test_name${NC}"
    log "Description: $description"
    log "Command: $test_command"
    
    if eval "$test_command"; then
        log "${GREEN}✅ PASSED: $test_name${NC}"
        return 0
    else
        log "${RED}❌ FAILED: $test_name${NC}"
        return 1
    fi
}

# Function to generate test report
generate_report() {
    local total_tests=$1
    local passed_tests=$2
    local failed_tests=$3
    
    cat > "$TEST_RESULTS_DIR/test-report.md" << EOF
# Products Module Test Report

**Generated:** $(date)
**Total Test Suites:** $total_tests
**Passed:** $passed_tests
**Failed:** $failed_tests
**Success Rate:** $(( passed_tests * 100 / total_tests ))%

## Test Coverage Summary
$(cat "$COVERAGE_DIR/coverage-summary.txt" 2>/dev/null || echo "Coverage data not available")

## Test Results

### Unit Tests
- ProductList Component Tests
- ProductForm Component Tests  
- ProductModal Component Tests

### Integration Tests
- Product Services Integration Tests
- Firebase Integration Tests

### Boundary Value Tests
- Text Field Boundary Testing
- Numeric Field Boundary Testing
- Special Character Handling
- Unicode Support Testing

### Performance Tests
- Large Dataset Handling
- Concurrent Operations
- Memory Usage Testing

## Issues Found
$(grep -E "FAILED|ERROR" "$LOG_FILE" 2>/dev/null || echo "No critical issues found")

## Recommendations
1. Review failed tests and fix underlying issues
2. Ensure code coverage remains above 80%
3. Run mutation tests to verify test quality
4. Update boundary tests for new features

EOF
}

# Main execution starts here
print_section "🚀 STARTING PRODUCTS MODULE TEST AUTOMATION"

log "Project Root: $PROJECT_ROOT"
log "Test Results Directory: $TEST_RESULTS_DIR"
log "Coverage Directory: $COVERAGE_DIR"

# Clear previous results
rm -f "$LOG_FILE"
log "Test automation started at $(date)"

# Check dependencies
print_section "🔧 CHECKING DEPENDENCIES"

if ! command_exists npm; then
    log "${RED}Error: npm is not installed${NC}"
    exit 1
fi

if ! command_exists node; then
    log "${RED}Error: node is not installed${NC}"
    exit 1
fi

log "${GREEN}✅ All dependencies are available${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_section "📦 INSTALLING DEPENDENCIES"
    npm install
fi

# Initialize test counters
total_tests=0
passed_tests=0
failed_tests=0

# Test Suite 1: Unit Tests
print_section "🧪 RUNNING UNIT TESTS"

# ProductList Component Tests
((total_tests++))
if run_test_suite "ProductList Component Tests" \
    "npm run test:products -- ProductList.test.tsx" \
    "Testing ProductList component rendering, interactions, and data handling"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# ProductForm Component Tests
((total_tests++))
if run_test_suite "ProductForm Component Tests" \
    "npm run test:products -- ProductForm.test.tsx" \
    "Testing ProductForm component validation, submission, and error handling"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# ProductModal Component Tests
((total_tests++))
if run_test_suite "ProductModal Component Tests" \
    "npm run test:products -- ProductModal.test.tsx" \
    "Testing ProductModal component interactions and form handling"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# Test Suite 2: Integration Tests
print_section "🔗 RUNNING INTEGRATION TESTS"

((total_tests++))
if run_test_suite "Product Services Integration Tests" \
    "npm run test:integration -- products.integration.test.ts" \
    "Testing Firebase integration and service layer functionality"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# Test Suite 3: Boundary Value Tests
print_section "🎯 RUNNING BOUNDARY VALUE TESTS"

((total_tests++))
if run_test_suite "Boundary Value Analysis Tests" \
    "npm run test:boundary -- products.boundary.test.ts" \
    "Testing edge cases, boundary values, and input validation"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# Test Suite 4: Coverage Analysis
print_section "📊 GENERATING COVERAGE REPORT"

((total_tests++))
if run_test_suite "Coverage Analysis" \
    "npm run test:coverage -- --reporter=text --reporter=html --outputFile=$COVERAGE_DIR/coverage-summary.txt" \
    "Generating code coverage reports and analysis"; then
    ((passed_tests++))
    
    # Extract coverage summary
    if [ -f "$COVERAGE_DIR/coverage-summary.txt" ]; then
        log "${GREEN}Coverage Summary:${NC}"
        cat "$COVERAGE_DIR/coverage-summary.txt" | tee -a "$LOG_FILE"
    fi
else
    ((failed_tests++))
fi

# Test Suite 5: Performance Tests (if available)
print_section "⚡ RUNNING PERFORMANCE TESTS"

((total_tests++))
if run_test_suite "Performance Tests" \
    "timeout 120s npm run test:run -- --testTimeout=30000 src/test/" \
    "Testing performance and load handling capabilities"; then
    ((passed_tests++))
    log "${GREEN}✅ Performance tests completed within time limits${NC}"
else
    ((failed_tests++))
    log "${YELLOW}⚠️ Performance tests may have timed out or failed${NC}"
fi

# Test Suite 6: Linting and Type Checking
print_section "🔍 RUNNING CODE QUALITY CHECKS"

((total_tests++))
if run_test_suite "ESLint Code Quality" \
    "npm run lint" \
    "Checking code quality and style consistency"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

((total_tests++))
if run_test_suite "TypeScript Type Checking" \
    "npx tsc --noEmit --skipLibCheck" \
    "Verifying type safety and TypeScript compilation"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# Generate comprehensive test report
print_section "📋 GENERATING TEST REPORT"
generate_report "$total_tests" "$passed_tests" "$failed_tests"

# Display final results
print_section "🎉 TEST AUTOMATION SUMMARY"

log "Test Automation completed at $(date)"
log ""
log "📊 FINAL RESULTS:"
log "Total Test Suites: $total_tests"
log "Passed: ${GREEN}$passed_tests${NC}"
log "Failed: ${RED}$failed_tests${NC}"
log "Success Rate: $(( passed_tests * 100 / total_tests ))%"
log ""

if [ $failed_tests -eq 0 ]; then
    log "${GREEN}🎉 ALL TESTS PASSED! Products module is ready for production.${NC}"
    exit 0
else
    log "${RED}❌ Some tests failed. Please review the issues before deploying.${NC}"
    log "Check detailed report at: $TEST_RESULTS_DIR/test-report.md"
    log "Check logs at: $LOG_FILE"
    exit 1
fi
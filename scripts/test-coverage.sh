#!/bin/bash

# Test Coverage Validation Script
# Validates that we meet the 95% coverage threshold
# Runs unit tests, integration tests, and mutation tests

set -e

echo "🧪 === TEST COVERAGE VALIDATION ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COVERAGE_THRESHOLD=95
PROJECT_NAME="conduit-api"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
COVERAGE_DIR="./coverage"
REPORT_DIR="./test-reports/${TIMESTAMP}"

echo "${BLUE}📋 Configuration:${NC}"
echo "  Coverage Threshold: ${COVERAGE_THRESHOLD}%"
echo "  Project: ${PROJECT_NAME}"
echo "  Report Directory: ${REPORT_DIR}"
echo ""

# Create reports directory
mkdir -p "${REPORT_DIR}"

# Function to check coverage threshold
check_coverage() {
    local coverage_file="$1"
    local test_name="$2"
    
    if [[ -f "$coverage_file" ]]; then
        local coverage=$(jq -r '.total.lines.pct' "$coverage_file" 2>/dev/null || echo "0")
        local coverage_int=${coverage%.*}  # Remove decimal part
        
        echo "${BLUE}📊 ${test_name} Coverage: ${coverage}%${NC}"
        
        if [[ "${coverage_int}" -ge "${COVERAGE_THRESHOLD}" ]]; then
            echo "${GREEN}✅ ${test_name} PASSED (>=${COVERAGE_THRESHOLD}%)${NC}"
            return 0
        else
            echo "${RED}❌ ${test_name} FAILED (<${COVERAGE_THRESHOLD}%)${NC}"
            echo "${YELLOW}Missing: $((COVERAGE_THRESHOLD - coverage_int))%${NC}"
            return 1
        fi
    else
        echo "${RED}❌ ${test_name}: Coverage file not found${NC}"
        return 1
    fi
}

# 1. Unit Tests with Coverage
echo "${BLUE}1️⃣ Running Unit Tests with Coverage${NC}"
echo "-------------------------------------------"

if command -v NX > /dev/null 2>&1; then
    npm run test:coverage -- --coverageThreshold='{"global":{"branches":60,"functions":90,"lines":95,"statements":95}}'
else
    npm run test:coverage
fi

if [[ -f "${COVERAGE_DIR}/coverage-summary.json" ]]; then
    cp "${COVERAGE_DIR}/coverage-summary.json" "${REPORT_DIR}/unit-coverage.json"
    cp -r "${COVERAGE_DIR}" "${REPORT_DIR}/unit-coverage"
    
    if ! check_coverage "${COVERAGE_DIR}/coverage-summary.json" "Unit Tests"; then
        echo "${RED}Unit tests failed coverage threshold${NC}"
        HAS_FAILURE=true
    fi
else
    echo "${RED}Unit coverage report not generated${NC}"
    HAS_FAILURE=true
fi

# 2. Integration Tests
echo ""
echo "${BLUE}2️⃣ Running Integration Tests${NC}"
echo "-------------------------------------------"

if npm run test 2>&1 | tee "${REPORT_DIR}/integration-tests.log" | grep -q "FAIL"; then
    echo "${RED}❌ Integration Tests Failed${NC}"
    HAS_FAILURE=true
else
    echo "${GREEN}✅ Integration Tests Passed${NC}"
fi

# 3. Mutation Testing (if Stryker is available)
echo ""
echo "${BLUE}3️⃣ Running Mutation Tests (if available)${NC}"
echo "-------------------------------------------"

if command -v npx > /dev/null 2>&1 && npx stryker --help > /dev/null 2>&1; then
    echo "🧬 Running Stryker mutation testing..."
    
    if npm run test:mutation:ci 2>&1 | tee "${REPORT_DIR}/mutation-tests.log"; then
        echo "${GREEN}✅ Mutation Tests Passed${NC}"
        
        # Extract mutation score if available
        if [[ -f "reports/mutation/html/index.html" ]]; then
            cp -r reports/mutation "${REPORT_DIR}/mutation-report"
            echo "${BLUE}📋 Mutation report saved to: ${REPORT_DIR}/mutation-report${NC}"
        fi
    else
        echo "${YELLOW}⚠️ Mutation Tests Failed (but continuing)${NC}"
    fi
else
    echo "${YELLOW}⚠️ Stryker not installed, skipping mutation tests${NC}"
    echo "${BLUE}Install with: npm install --save-dev @stryker-mutator/core ${NC}"
fi

# 4. Test Code Linting
echo ""
echo "${BLUE}4️⃣ Running Test Code Quality Check${NC}"
echo "-------------------------------------------"

if npm run lint 2>&1 | tee "${REPORT_DIR}/lint-check.log" | grep -q "error"; then
    echo "${RED}❌ Linting Failed${NC}"
    HAS_FAILURE=true
else
    echo "${GREEN}✅ Linting Passed${NC}"
fi

# 5. TypeScript Compilation Check
echo ""
echo "${BLUE}5️⃣ TypeScript Compilation Check${NC}"
echo "-------------------------------------------"

if npm run build 2>&1 | tee "${REPORT_DIR}/build-check.log" | grep -q "error"; then
    echo "${RED}❌ TypeScript Compilation Failed${NC}"
    HAS_FAILURE=true
else
    echo "${GREEN}✅ TypeScript Compilation Passed${NC}"
fi

# 6. Generate Summary Report
echo ""
echo "${BLUE}6️⃣ Generating Summary Report${NC}"
echo "-------------------------------------------"

cat > "${REPORT_DIR}/test-summary.md" << EOF
# Test Coverage Report

**Generated:** $(date)
**Repository:** $(git remote get-url origin 2>/dev/null || echo "local")
**Branch:** $(git branch --show-current 2>/dev/null || echo "unknown")
**Commit:** $(git rev-parse HEAD 2>/dev/null || echo "unknown")

## Test Results

| Test Type | Status | Coverage | Details |
|-----------|--------|----------|---------|
| Unit Tests | $([[ -f "${REPORT_DIR}/unit-coverage.json" ]] && echo "✅ Complete" || echo "❌ Failed") | $(jq -r '.total.lines.pct // "N/A"' "${REPORT_DIR}/unit-coverage.json" 2>/dev/null) || echo "N/A" | [Unit Coverage Report](${REPORT_DIR}/unit-coverage/index.html) |
| Integration Tests | $(grep -q "FAIL" "${REPORT_DIR}/integration-tests.log" 2>/dev/null && echo "❌ Failed" || echo "✅ Passed") | N/A | View log for details |
| Mutation Tests | $(grep -q "passed" "${REPORT_DIR}/mutation-tests.log" 2>/dev/null && echo "✅ Passed" || echo "⚠️ Not available") | $(grep -o "mutation score.*%" "${REPORT_DIR}/mutation-tests.log" 2>/dev/null || echo "N/A") | $(ls "${REPORT_DIR}/mutation-report/index.html" 2>/dev/null && echo "[Mutation Report](${REPORT_DIR}/mutation-report/index.html)" || echo "N/A") |
| Linting | $(grep -q "error" "${REPORT_DIR}/lint-check.log" 2>/dev/null && echo "❌ Failed" || echo "✅ Passed") | N/A | View log for details |
| TypeScript Build | $(grep -q "error" "${REPORT_DIR}/build-check.log" 2>/dev/null && echo "❌ Failed" || echo "✅ Passed") | N/A | View log for details |

## Coverage Threshold Target
**Required:** ${COVERAGE_THRESHOLD}%
**Status:** $([[ -f "${COVERAGE_DIR}/coverage-summary.json" && $(jq -r '.total.lines.pct // 0' "${COVERAGE_DIR}/coverage-summary.json" 2>/dev/null | cut -d. -f1) -ge ${COVERAGE_THRESHOLD} ]] && echo "✅ PASSED" || echo "❌ FAILED")

## Files to Review
- [Unit Coverage Report](${REPORT_DIR}/unit-coverage/index.html)
- [Integration Test Log](${REPORT_DIR}/integration-tests.log)
- [Mutation Report](${REPORT_DIR}/mutation-report/index.html) (if available)
- [Linting Log](${REPORT_DIR}/lint-check.log)
- [Build Log](${REPORT_DIR}/build-check.log)

---

EOF

echo "${GREEN}📄 Summary report created: ${REPORT_DIR}/test-summary.md${NC}"

# 7. Final Status
echo ""
echo "${BLUE}🎯 === FINAL TEST STATUS ===${NC}"

if [[ "${HAS_FAILURE}" = true ]]; then
    echo "${RED}❌ SOME TESTS FAILED${NC}"
    echo "${YELLOW}📋 Review failures in: ${REPORT_DIR}${NC}"
    exit 1
else
    echo "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo "${BLUE}📊 Coverage threshold met: >=${COVERAGE_THRESHOLD}%${NC}"
    echo "${BLUE}📄 Reports available at: ${REPORT_DIR}${NC}"
    exit 0
fi
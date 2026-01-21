#!/bin/bash
# Allure Report Generator

set -e

ALLURE_RESULTS="allure-results"
ALLURE_REPORT="allure-report"
ALLURE_HISTORY="allure-history"

# Parse arguments
OPEN_REPORT=false
SERVE_REPORT=false
CLEAN=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --open) OPEN_REPORT=true ;;
        --serve) SERVE_REPORT=true ;;
        --clean) CLEAN=true ;;
        *) echo "Unknown parameter: $1" ;;
    esac
    shift
done

# Clean if requested
if [ "$CLEAN" = true ]; then
    echo "Cleaning old reports..."
    rm -rf "$ALLURE_RESULTS" "$ALLURE_REPORT" "$ALLURE_HISTORY"
    echo "Cleaned."
    exit 0
fi

# Check if allure is installed
if ! command -v allure &> /dev/null; then
    echo "Installing Allure..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install allure
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        npm install -g allure-commandline
    else
        npm install -g allure-commandline
    fi
fi

# Create results directory if not exists
mkdir -p "$ALLURE_RESULTS"

# Copy history if exists
if [ -d "$ALLURE_REPORT/history" ]; then
    cp -r "$ALLURE_REPORT/history" "$ALLURE_RESULTS/"
fi

# Collect results from various test directories
echo "Collecting test results..."

# From Jest
if [ -d "test-results" ]; then
    cp -r test-results/* "$ALLURE_RESULTS/" 2>/dev/null || true
fi

# From Playwright
if [ -d "playwright-report" ]; then
    cp -r playwright-report/* "$ALLURE_RESULTS/" 2>/dev/null || true
fi

# Generate report
echo "Generating Allure report..."
allure generate "$ALLURE_RESULTS" -o "$ALLURE_REPORT" --clean

echo "Report generated at $ALLURE_REPORT"

# Open or serve if requested
if [ "$SERVE_REPORT" = true ]; then
    echo "Starting Allure server..."
    allure serve "$ALLURE_RESULTS"
elif [ "$OPEN_REPORT" = true ]; then
    echo "Opening report..."
    allure open "$ALLURE_REPORT"
fi

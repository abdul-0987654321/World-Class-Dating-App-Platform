#!/usr/bin/env python3
"""Comprehensive Python syntax checker for all AI services."""

import os
import py_compile
import sys
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent

# Services to check
SERVICES = [
    "dating-coach-service",
    "fraud-detection",
    "nlp-service",
    "photo-analysis",
    "recommendation-service",
    "content-generator"
]

def check_file(file_path):
    """Check a single Python file for syntax errors."""
    try:
        py_compile.compile(file_path, doraise=True)
        return True, None
    except py_compile.PyCompileError as e:
        return False, str(e)

def check_service(service_name):
    """Check all Python files in a service."""
    service_dir = BASE_DIR / service_name
    errors = []
    checked_files = 0

    if not service_dir.exists():
        return 0, [f"Service directory not found: {service_dir}"]

    # Find all Python files
    for py_file in service_dir.rglob("*.py"):
        checked_files += 1
        success, error = check_file(py_file)
        if not success:
            errors.append(f"{py_file.relative_to(BASE_DIR)}: {error}")

    return checked_files, errors

def main():
    """Main function to check all services."""
    print("=" * 80)
    print("Python Syntax Checker for AI Services")
    print("=" * 80)
    print()

    all_errors = []
    total_files = 0

    for service in SERVICES:
        print(f"Checking {service}...")
        checked, errors = check_service(service)
        total_files += checked

        if errors:
            print(f"  ERROR: Found {len(errors)} error(s) in {checked} files")
            all_errors.extend(errors)
        else:
            print(f"  OK: {checked} files checked")
        print()

    print("=" * 80)
    print(f"Summary: {total_files} total files checked")

    if all_errors:
        print(f"\nFound {len(all_errors)} error(s):")
        print()
        for error in all_errors:
            print(f"  - {error}")
        print()
        return 1
    else:
        print("\nAll files passed syntax check!")
        print()
        return 0

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Comprehensive validation script for all AI services."""

import os
import py_compile
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Base directory
BASE_DIR = Path(__file__).parent

# Services to check
SERVICES = {
    "dating-coach-service": {
        "main": "app/main.py",
        "language": "Python",
        "framework": "FastAPI"
    },
    "fraud-detection": {
        "main": "main.py",
        "language": "Python",
        "framework": "FastAPI"
    },
    "nlp-service": {
        "main": "app/main.py",
        "language": "Python",
        "framework": "FastAPI"
    },
    "photo-analysis": {
        "main": "main.py",
        "language": "Python",
        "framework": "FastAPI"
    },
    "recommendation-service": {
        "main": "app/main.py",
        "language": "Python",
        "framework": "FastAPI"
    },
    "content-generator": {
        "main": "app/main.py",
        "language": "Python",
        "framework": "FastAPI"
    }
}


def check_syntax(service_name: str, service_dir: Path) -> Tuple[int, List[str]]:
    """Check Python syntax for all files in a service."""
    errors = []
    checked = 0

    for py_file in service_dir.rglob("*.py"):
        checked += 1
        try:
            py_compile.compile(py_file, doraise=True)
        except py_compile.PyCompileError as e:
            errors.append(f"{py_file.relative_to(BASE_DIR)}: {str(e)}")

    return checked, errors


def check_requirements(service_dir: Path) -> bool:
    """Check if requirements.txt exists."""
    return (service_dir / "requirements.txt").exists()


def check_main_file(service_dir: Path, main_path: str) -> bool:
    """Check if main entry point exists."""
    return (service_dir / main_path).exists()


def check_dockerfiles(service_dir: Path) -> Dict[str, bool]:
    """Check for Docker-related files."""
    return {
        "Dockerfile": (service_dir / "Dockerfile").exists(),
        "docker-compose.yml": (service_dir / "docker-compose.yml").exists()
    }


def main():
    """Run all validation checks."""
    print("=" * 80)
    print("COMPREHENSIVE AI SERVICES VALIDATION")
    print("=" * 80)
    print()

    total_files = 0
    total_errors = []
    service_results = {}

    for service_name, config in SERVICES.items():
        print(f"\nValidating {service_name}...")
        print("-" * 80)

        service_dir = BASE_DIR / service_name
        results = {
            "exists": service_dir.exists(),
            "syntax_checked": 0,
            "syntax_errors": [],
            "has_requirements": False,
            "has_main": False,
            "docker_files": {}
        }

        if not results["exists"]:
            print(f"  [ERROR] Service directory not found: {service_dir}")
            service_results[service_name] = results
            continue

        # Check syntax
        checked, errors = check_syntax(service_name, service_dir)
        results["syntax_checked"] = checked
        results["syntax_errors"] = errors
        total_files += checked
        total_errors.extend(errors)

        if errors:
            print(f"  [FAIL] Syntax: {len(errors)} error(s) in {checked} files")
            for error in errors[:3]:  # Show first 3 errors
                print(f"    - {error}")
            if len(errors) > 3:
                print(f"    ... and {len(errors) - 3} more")
        else:
            print(f"  [PASS] Syntax: {checked} files validated")

        # Check requirements.txt
        results["has_requirements"] = check_requirements(service_dir)
        if results["has_requirements"]:
            print(f"  [PASS] requirements.txt exists")
        else:
            print(f"  [WARN] requirements.txt missing")

        # Check main entry point
        results["has_main"] = check_main_file(service_dir, config["main"])
        if results["has_main"]:
            print(f"  [PASS] Main entry point: {config['main']}")
        else:
            print(f"  [FAIL] Main entry point not found: {config['main']}")

        # Check Docker files
        results["docker_files"] = check_dockerfiles(service_dir)
        has_dockerfile = results["docker_files"]["Dockerfile"]
        print(f"  [{'PASS' if has_dockerfile else 'INFO'}] Dockerfile: "
              f"{'exists' if has_dockerfile else 'not found (optional)'}")

        # Language and framework
        print(f"  [INFO] Language: {config['language']}")
        print(f"  [INFO] Framework: {config['framework']}")

        service_results[service_name] = results

    # Summary
    print("\n" + "=" * 80)
    print("VALIDATION SUMMARY")
    print("=" * 80)
    print()

    # Overall statistics
    print(f"Total Services Checked: {len(SERVICES)}")
    print(f"Total Python Files Validated: {total_files}")
    print()

    # Service-by-service summary
    all_passed = True
    for service_name, results in service_results.items():
        status = "PASS"
        if not results["exists"]:
            status = "MISSING"
            all_passed = False
        elif results["syntax_errors"]:
            status = "FAIL"
            all_passed = False
        elif not results["has_main"]:
            status = "FAIL"
            all_passed = False

        symbol = "[OK]" if status == "PASS" else "[X]"
        print(f"  {symbol} {service_name}: {status}")

    print()

    # Error summary
    if total_errors:
        print(f"[FAIL] Found {len(total_errors)} syntax error(s)")
        print()
        print("Errors:")
        for error in total_errors:
            print(f"  - {error}")
        print()
        return 1
    else:
        print("[PASS] No syntax errors found")
        print()

    # Final result
    if all_passed:
        print("=" * 80)
        print("ALL SERVICES VALIDATED SUCCESSFULLY!")
        print("=" * 80)
        print()
        print("Next steps:")
        print("  1. Install dependencies: pip install -r requirements.txt")
        print("  2. Configure environment variables (.env)")
        print("  3. Run tests")
        print("  4. Start services")
        print()
        return 0
    else:
        print("=" * 80)
        print("VALIDATION COMPLETED WITH ISSUES")
        print("=" * 80)
        print()
        print("Please fix the issues above before deploying.")
        print()
        return 1


if __name__ == "__main__":
    sys.exit(main())

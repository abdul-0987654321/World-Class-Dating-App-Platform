#!/usr/bin/env python3
"""
Script to remove mock/demo modes from service files in Flamoral dating platform.

Usage:
    python remove_mocks.py

This script will:
1. Remove the "demo" script from backend/package.json
2. Clean all service files in apps/web-app/src/services/
3. Create backups of all modified files (.bak extension)
"""

import json
import re
from pathlib import Path
from typing import List, Tuple

def backup_file(file_path: Path) -> None:
    """Create a backup of the file."""
    backup_path = file_path.with_suffix(file_path.suffix + '.bak')
    backup_path.write_text(file_path.read_text(encoding='utf-8'), encoding='utf-8')
    print(f"  📦 Backup created: {backup_path.name}")

def clean_backend_package_json(base_dir: Path) -> bool:
    """Remove 'demo' script from backend/package.json."""
    package_json_path = base_dir / 'backend' / 'package.json'

    if not package_json_path.exists():
        print(f"❌ File not found: {package_json_path}")
        return False

    print(f"\n📝 Processing: {package_json_path.relative_to(base_dir)}")

    # Read and parse JSON
    with open(package_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Check if demo script exists
    if 'demo' not in data.get('scripts', {}):
        print("  ℹ️  No 'demo' script found - skipping")
        return False

    # Create backup
    backup_file(package_json_path)

    # Remove demo script
    del data['scripts']['demo']

    # Write back
    with open(package_json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
        f.write('\n')  # Add trailing newline

    print("  ✅ Removed 'demo' script")
    return True

def clean_typescript_service(file_path: Path) -> bool:
    """Remove mock modes from a TypeScript service file."""
    print(f"\n📝 Processing: {file_path.name}")

    content = file_path.read_text(encoding='utf-8')
    original_content = content

    # Step 1: Replace isMock property with ensureApiConfigured method
    content = re.sub(
        r'  private isMock = !import\.meta\.env\.VITE_API_URL;',
        '''  private ensureApiConfigured(): void {
    if (!import.meta.env.VITE_API_URL) {
      throw new Error('API URL is not configured. Please set VITE_API_URL environment variable.');
    }
  }''',
        content,
        count=1
    )

    # Step 2: Process each method to remove mock logic
    # This is a complex transformation, so we'll do it line by line

    lines = content.split('\n')
    cleaned_lines = []
    i = 0
    changes_made = False

    while i < len(lines):
        line = lines[i]

        # Check for start of mock block
        if re.search(r'if \(this\.isMock\)|if \(!import\.meta\.env\.VITE_API_URL\)', line):
            changes_made = True
            # Get the indentation
            indent = line[:len(line) - len(line.lstrip())]

            # Check if it's a single-line return
            if 'return' in line and ';' in line and '{' not in line:
                # Replace with ensureApiConfigured call
                cleaned_lines.append(f'{indent}this.ensureApiConfigured();')
                i += 1
                # Skip empty line if next line is empty
                if i < len(lines) and not lines[i].strip():
                    i += 1
                continue

            # Multi-line block - need to skip entire block
            brace_count = line.count('{') - line.count('}')
            i += 1  # Skip the if line

            # Skip all lines until braces balance
            while i < len(lines) and brace_count > 0:
                brace_count += lines[i].count('{') - lines[i].count('}')
                i += 1

            # Add ensureApiConfigured call
            # Check if the method doesn't already have it
            if i > 0 and 'ensureApiConfigured' not in '\n'.join(cleaned_lines[-5:]):
                cleaned_lines.append(f'{indent}this.ensureApiConfigured();')
                cleaned_lines.append('')

            continue

        # Check for mock API imports (dynamic imports)
        if "const { mockApi } = await import" in line:
            changes_made = True
            i += 1
            # Skip this line (and any following empty lines)
            while i < len(lines) and not lines[i].strip():
                i += 1
            continue

        # Check for static mock mode comments
        if re.search(r'// In mock mode|// Mock (data|registration|upgrade)', line):
            changes_made = True
            i += 1
            continue

        # Add the line to cleaned output
        cleaned_lines.append(line)
        i += 1

    content = '\n'.join(cleaned_lines)

    # Step 3: Remove getMock* private methods and Mock Data section
    # Match the Mock Data section
    content = re.sub(
        r'\n  // ={40,}\n  // Mock Data\n  // ={40,}\n.*?(?=\n}\n\nexport)',
        '',
        content,
        flags=re.DOTALL
    )

    # Match individual getMock methods
    content = re.sub(
        r'\n  private getMock[^(]*\([^)]*\):[^{]*\{(?:[^{}]|{[^{}]*})*\}\n',
        '\n',
        content
    )

    # Step 4: Clean up excessive blank lines (more than 2 in a row)
    content = re.sub(r'\n{4,}', '\n\n\n', content)

    # Only write if content changed
    if content != original_content:
        backup_file(file_path)
        file_path.write_text(content, encoding='utf-8')
        print(f"  ✅ Cleaned successfully")
        return True
    else:
        print("  ℹ️  No changes needed")
        return False

def find_service_files(services_dir: Path) -> List[Path]:
    """Find all TypeScript service files."""
    if not services_dir.exists():
        return []

    service_files = []

    for ts_file in services_dir.rglob('*.ts'):
        # Skip certain files
        if ts_file.name in ['index.ts', 'types.ts', 'config.ts']:
            continue
        # Skip .bak and .CLEANED files
        if '.bak' in ts_file.name or '.CLEANED' in ts_file.name:
            continue

        service_files.append(ts_file)

    return sorted(service_files)

def main():
    base_dir = Path(__file__).parent
    print(f"🚀 Starting mock removal process")
    print(f"📁 Base directory: {base_dir}")

    files_modified = 0
    total_files = 0

    # 1. Clean backend package.json
    print("\n" + "=" * 60)
    print("STEP 1: Clean backend/package.json")
    print("=" * 60)

    if clean_backend_package_json(base_dir):
        files_modified += 1
    total_files += 1

    # 2. Clean frontend service files
    print("\n" + "=" * 60)
    print("STEP 2: Clean frontend service files")
    print("=" * 60)

    services_dir = base_dir / 'apps' / 'web-app' / 'src' / 'services'

    if not services_dir.exists():
        print(f"❌ Services directory not found: {services_dir}")
    else:
        service_files = find_service_files(services_dir)
        print(f"📋 Found {len(service_files)} service files to process\n")

        for service_file in service_files:
            total_files += 1
            if clean_typescript_service(service_file):
                files_modified += 1

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✅ Files processed: {total_files}")
    print(f"📝 Files modified: {files_modified}")
    print(f"📦 Backups created: {files_modified}")

    if files_modified > 0:
        print("\n⚠️  IMPORTANT: Please review the changes before committing!")
        print("💡 Backup files have .bak extension and can be restored if needed.")
    else:
        print("\n✨ No changes were needed - all files are already clean!")

    print("\n🔍 To verify changes, run:")
    print("    grep -r \"isMock\" apps/web-app/src/services/")
    print("    grep -r \"mockApi\" apps/web-app/src/services/")
    print("    grep -r \"getMock\" apps/web-app/src/services/")
    print("    grep \"demo\" backend/package.json")

if __name__ == '__main__':
    main()

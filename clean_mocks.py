#!/usr/bin/env python3
"""
Script to remove mock/demo modes from service files.
Replaces isMock checks with API configuration checks.
"""

import re
import os
from pathlib import Path

def clean_service_file(file_path):
    """Clean a single service file by removing mock logic."""
    print(f"Processing: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Step 1: Replace isMock property with ensureApiConfigured method
    content = re.sub(
        r'  private isMock = !import\.meta\.env\.VITE_API_URL;',
        '''  private ensureApiConfigured(): void {
    if (!import.meta.env.VITE_API_URL) {
      throw new Error('API URL is not configured. Please set VITE_API_URL environment variable.');
    }
  }''',
        content
    )

    # Step 2: Remove mock imports
    content = re.sub(
        r"const \{ mockApi \} = await import\('\.\.\/mocks\/mockApi'\);\s*",
        '',
        content
    )

    # Step 3: Find and clean methods with isMock checks
    # Pattern for methods with if (this.isMock) blocks
    def replace_mock_check(match):
        indent = match.group(1)
        rest_of_method = match.group(2)

        # Add ensureApiConfigured call
        return f'{indent}this.ensureApiConfigured();\n\n{indent}{rest_of_method}'

    # Replace patterns like:
    # async methodName(...): Promise<Type> {
    #   if (this.isMock) { ... }
    #
    #   // real code
    # }

    # Remove if (this.isMock) return ...; patterns (single line)
    content = re.sub(
        r'(\s+)if \(this\.isMock\) return[^;]*;(\s*\n)',
        r'\1this.ensureApiConfigured();\2',
        content
    )

    # Remove if (this.isMock) { ... } blocks (multi-line)
    # This is complex, so we'll use a more targeted approach
    lines = content.split('\n')
    cleaned_lines = []
    i = 0
    in_mock_block = False
    mock_block_start = -1
    brace_count = 0
    method_indent = ''

    while i < len(lines):
        line = lines[i]

        # Detect start of mock block
        if 'if (this.isMock)' in line or 'if (!import.meta.env.VITE_API_URL)' in line:
            in_mock_block = True
            mock_block_start = i
            # Get the indentation of this line
            method_indent = line[:len(line) - len(line.lstrip())]

            # Check if it's a single-line return
            if '{' not in line:
                # Skip this line - already handled by regex above
                i += 1
                continue

            # Start counting braces
            brace_count = line.count('{') - line.count('}')
            i += 1

            # Skip all lines in the mock block
            while i < len(lines) and brace_count > 0:
                brace_count += lines[i].count('{') - lines[i].count('}')
                i += 1

            in_mock_block = False

            # Add ensureApiConfigured if not already present
            # Check if previous non-empty line already has it
            prev_line_idx = len(cleaned_lines) - 1
            while prev_line_idx >= 0 and not cleaned_lines[prev_line_idx].strip():
                prev_line_idx -= 1

            if prev_line_idx < 0 or 'ensureApiConfigured' not in cleaned_lines[prev_line_idx]:
                cleaned_lines.append(f'{method_indent}  this.ensureApiConfigured();')
                cleaned_lines.append('')

            continue

        cleaned_lines.append(line)
        i += 1

    content = '\n'.join(cleaned_lines)

    # Step 4: Remove all getMock* private methods
    content = re.sub(
        r'\n  // ={40,}\n  // Mock Data\n  // ={40,}[\s\S]*?(?=\n}\n\nexport)',
        '',
        content
    )

    # Alternative pattern for mock methods
    content = re.sub(
        r'\n  private getMock[^}]*\}(?:\n\s*\n)?',
        '',
        content,
        flags=re.MULTILINE
    )

    # Step 5: Clean up any remaining mock-related code
    # Remove mock user/data variable declarations in inline mock mode checks
    content = re.sub(
        r'// In mock mode.*?\n',
        '',
        content
    )

    # Only write if content changed
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Cleaned: {file_path}")
        return True
    else:
        print(f"  - No changes needed: {file_path}")
        return False

def main():
    # Base directory
    base_dir = Path(__file__).parent

    # Service files to clean
    service_dirs = [
        base_dir / 'apps' / 'web-app' / 'src' / 'services',
        base_dir / 'apps' / 'mobile-app' / 'src' / 'services',
    ]

    files_cleaned = 0
    files_processed = 0

    for service_dir in service_dirs:
        if not service_dir.exists():
            print(f"Directory not found: {service_dir}")
            continue

        # Find all .ts files
        for ts_file in service_dir.rglob('*.ts'):
            # Skip index files and type definition files
            if ts_file.name in ['index.ts', 'types.ts']:
                continue

            files_processed += 1
            if clean_service_file(ts_file):
                files_cleaned += 1

    print(f"\n✅ Processing complete!")
    print(f"   Files processed: {files_processed}")
    print(f"   Files cleaned: {files_cleaned}")

if __name__ == '__main__':
    main()

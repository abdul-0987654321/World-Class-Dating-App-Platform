# .gitignore and .gitattributes Review for Azure Repos Migration

**Project:** World-Class Dating App Platform (Flamoral)
**Azure Repos:** https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform
**Document Version:** 1.0
**Last Updated:** December 2025

---

## Table of Contents

1. [Current .gitignore Review](#current-gitignore-review)
2. [.gitignore Recommendations](#gitignore-recommendations)
3. [.gitattributes Analysis](#gitattributes-analysis)
4. [.gitattributes Recommendations](#gitattributes-recommendations)
5. [Azure Repos Specific Considerations](#azure-repos-specific-considerations)
6. [Implementation Guide](#implementation-guide)

---

## Current .gitignore Review

### Existing .gitignore Structure

The current `.gitignore` file is comprehensive and well-organized. Here's the analysis:

#### ✅ Good - Keep As Is

**Dependencies (Lines 1-4)**
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js
```
**Status:** Perfect - Essential for any Node.js project

**Build Outputs (Lines 6-10)**
```gitignore
# Build outputs
dist/
build/
.next/
out/
```
**Status:** Good - Covers multiple framework build outputs

**TypeScript Compiled Files (Lines 12-19)**
```gitignore
# TypeScript compiled files in shared directories
backend/shared/**/*.js
backend/shared/**/*.d.ts
backend/shared/**/*.map
packages/shared/**/*.js
packages/shared/**/*.d.ts
packages/shared/**/*.map
!packages/shared/**/package.json
```
**Status:** Excellent - Prevents committing compiled TypeScript while preserving package.json

**Testing (Lines 21-24)**
```gitignore
# Testing
coverage/
.nyc_output/
*.lcov
```
**Status:** Good - Standard test coverage exclusions

**Environment Variables (Lines 26-31)**
```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```
**Status:** Critical - Prevents committing secrets

**Logs (Lines 33-40)**
```gitignore
# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
pnpm-debug.log*
```
**Status:** Good - Comprehensive log file coverage

**OS Files (Lines 42-47)**
```gitignore
# OS files
.DS_Store
Thumbs.db
*.swp
*.swo
*~
```
**Status:** Good - Covers Mac, Windows, and Vim temporary files

**IDE (Lines 49-57)**
```gitignore
# IDE
.vscode/
.idea/
*.iml
.project
.classpath
.c9/
*.launch
.settings/
```
**Status:** Good - Covers major IDEs

**Temporary Files (Lines 59-62)**
```gitignore
# Temporary files
*.tmp
*.bak
*.cache
```
**Status:** Good

**Database (Lines 64-67)**
```gitignore
# Database
*.db
*.sqlite
*.sqlite3
```
**Status:** Good - Prevents committing local databases

**Docker (Lines 69-70)**
```gitignore
# Docker
docker-compose.override.yml
```
**Status:** Good - Prevents personal overrides from being committed

**Terraform (Lines 72-82)**
```gitignore
# Terraform
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl
terraform.exe
terraform
*.tfplan
tfplan
terraform_*.zip
LICENSE.txt
```
**Status:** Excellent - Comprehensive Terraform exclusions
**Note:** `LICENSE.txt` seems unusual here - verify if intentional

**Kubernetes (Lines 84-85)**
```gitignore
# Kubernetes
*.kubeconfig
```
**Status:** Good

**Azure (Lines 87-88)**
```gitignore
# Azure
.azure/
```
**Status:** Good - Azure CLI cache

**Mobile Specific (Lines 90-123)**
```gitignore
# Mobile specific
# iOS
ios/Pods/
ios/**/*.xcworkspace
!ios/**/*.xcworkspace/contents.xcworkspacedata
ios/**/*.xcuserdata
ios/build/
*.pbxuser
!default.pbxuser
*.mode1v3
!default.mode1v3
*.mode2v3
!default.mode2v3
*.perspectivev3
!default.perspectivev3
*.xccheckout
*.moved-aside
DerivedData/
*.hmap
*.ipa
*.dSYM.zip
*.dSYM

# Android
android/app/build/
android/.gradle/
android/local.properties
android/**/*.iml
*.apk
*.aab

# React Native
.expo/
.expo-shared/
```
**Status:** Excellent - Comprehensive mobile development exclusions

---

## .gitignore Recommendations

### Additions for Azure DevOps

Add the following section after the "Azure" section:

```gitignore
# Azure DevOps
.azuredevops/pipelines/*.user
.vs/
*.suo
*.user
*.userosscache
*.sln.docstates
```

### Additions for Enhanced Security

Add a "Security" section:

```gitignore
# Security and Secrets
secrets/
*.pem
*.key
*.cert
*.crt
*.p12
*.pfx
*.asc
credentials.json
service-account.json
*.credentials
```

### Additions for Package Management

Enhance the dependencies section:

```gitignore
# Package management
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*
package-lock.json  # If using Yarn exclusively
yarn.lock          # If using npm exclusively
```

**Note:** Only ignore one lock file, not both. Current project uses both `package-lock.json` and uses Yarn, so consider standardizing.

### Additions for Development Tools

```gitignore
# Development tools
.tool-versions
.nvmrc
.ruby-version
.python-version

# Debugging
*.tsbuildinfo
tsconfig.tsbuildinfo
.eslintcache
.stylelintcache
```

### Optional: Exclude .github During Migration

Temporarily add during migration (can remove after archiving):

```gitignore
# GitHub legacy (temporary during migration)
.github/
```

Or permanently if you want to keep it for reference but not track changes:

```gitignore
# Legacy GitHub configurations (archived)
.github/**
!.github/CODEOWNERS  # Keep CODEOWNERS for reference
```

### Complete Recommended .gitignore

Here's the enhanced version with additions highlighted:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz

# Build outputs
dist/
build/
.next/
out/

# TypeScript compiled files in shared directories
backend/shared/**/*.js
backend/shared/**/*.d.ts
backend/shared/**/*.map
packages/shared/**/*.js
packages/shared/**/*.d.ts
packages/shared/**/*.map
!packages/shared/**/package.json

# Testing
coverage/
.nyc_output/
*.lcov
.jest-cache/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env*.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
pnpm-debug.log*

# OS files
.DS_Store
Thumbs.db
*.swp
*.swo
*~
.fseventsd
.Spotlight-V100
.Trashes

# IDE
.vscode/
.idea/
*.iml
.project
.classpath
.c9/
*.launch
.settings/
*.sublime-project
*.sublime-workspace

# Temporary files
*.tmp
*.bak
*.cache
.eslintcache
.stylelintcache
*.tsbuildinfo
tsconfig.tsbuildinfo

# Database
*.db
*.sqlite
*.sqlite3

# Docker
docker-compose.override.yml

# Terraform
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl
terraform.exe
terraform
*.tfplan
tfplan
terraform_*.zip

# Kubernetes
*.kubeconfig
.kubeconfig

# Azure
.azure/

# Azure DevOps
.azuredevops/pipelines/*.user
.vs/
*.suo
*.user
*.userosscache
*.sln.docstates

# Security and Secrets
secrets/
*.pem
*.key
*.cert
*.crt
*.p12
*.pfx
*.asc
credentials.json
service-account.json
*.credentials

# Mobile specific
# iOS
ios/Pods/
ios/**/*.xcworkspace
!ios/**/*.xcworkspace/contents.xcworkspacedata
ios/**/*.xcuserdata
ios/build/
*.pbxuser
!default.pbxuser
*.mode1v3
!default.mode1v3
*.mode2v3
!default.mode2v3
*.perspectivev3
!default.perspectivev3
*.xccheckout
*.moved-aside
DerivedData/
*.hmap
*.ipa
*.dSYM.zip
*.dSYM

# Android
android/app/build/
android/.gradle/
android/local.properties
android/**/*.iml
*.apk
*.aab

# React Native
.expo/
.expo-shared/

# Development tools
.tool-versions

# Backup (created by migration script)
backup-*/
```

---

## .gitattributes Analysis

### Current Status

**File Status:** Does not exist in root directory

**Node Modules .gitattributes:** Multiple .gitattributes files found in node_modules (ignored)

### Why .gitattributes is Important

The `.gitattributes` file is crucial for:

1. **Line Ending Consistency** - Ensures consistent line endings across platforms (Windows CRLF vs Unix LF)
2. **Merge Strategies** - Defines how specific files should be merged
3. **Diff Settings** - Customizes how diffs are displayed
4. **Binary File Handling** - Marks binary files to prevent text diff attempts
5. **Export Settings** - Controls what gets included in archives (useful for excluding .github/)

---

## .gitattributes Recommendations

### Create Comprehensive .gitattributes

**Location:** Project root (`.gitattributes`)

```gitattributes
# Auto detect text files and normalize line endings to LF
* text=auto eol=lf

# Source code
*.js text eol=lf
*.jsx text eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.json text eol=lf
*.css text eol=lf
*.scss text eol=lf
*.html text eol=lf
*.xml text eol=lf
*.yml text eol=lf
*.yaml text eol=lf
*.md text eol=lf
*.txt text eol=lf

# Scripts
*.sh text eol=lf
*.bash text eol=lf
*.bat text eol=crlf
*.cmd text eol=crlf
*.ps1 text eol=crlf

# Configuration
*.conf text eol=lf
*.config text eol=lf
*.ini text eol=lf
*.properties text eol=lf
.gitignore text eol=lf
.gitattributes text eol=lf
.editorconfig text eol=lf
.eslintrc text eol=lf
.prettierrc text eol=lf

# SQL
*.sql text eol=lf

# Protocol Buffers
*.proto text eol=lf

# Dockerfiles
Dockerfile text eol=lf
*.dockerfile text eol=lf
docker-compose*.yml text eol=lf

# Kubernetes
*.k8s.yml text eol=lf
*.k8s.yaml text eol=lf

# Terraform
*.tf text eol=lf
*.tfvars text eol=lf

# Markdown
*.md text eol=lf diff=markdown

# Documentation
*.markdown text eol=lf
*.mdown text eol=lf
*.mkd text eol=lf
*.mdwn text eol=lf
*.mdtxt text eol=lf
*.mdtext text eol=lf

# Graphics
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.svg text eol=lf
*.bmp binary
*.tiff binary
*.webp binary
*.pdf binary

# Audio
*.mp3 binary
*.ogg binary
*.wav binary
*.flac binary

# Video
*.mp4 binary
*.mov binary
*.avi binary
*.webm binary

# Fonts
*.woff binary
*.woff2 binary
*.ttf binary
*.otf binary
*.eot binary

# Archives
*.zip binary
*.tar binary
*.gz binary
*.tgz binary
*.bz2 binary
*.7z binary
*.rar binary

# Compiled
*.exe binary
*.dll binary
*.so binary
*.dylib binary
*.class binary
*.jar binary
*.war binary

# Mobile builds
*.apk binary
*.aab binary
*.ipa binary
*.dSYM binary

# Keystores and certificates (should be in .gitignore anyway)
*.jks binary
*.keystore binary
*.p12 binary
*.pfx binary
*.pem binary
*.crt binary
*.cer binary
*.der binary

# Lock files - treat as binary to prevent merge conflicts
package-lock.json binary
yarn.lock binary
Gemfile.lock binary
Pipfile.lock binary

# Export settings (exclude from git archive)
.github/ export-ignore
.github/** export-ignore
.gitattributes export-ignore
.gitignore export-ignore
.editorconfig export-ignore
tests/ export-ignore
*.test.js export-ignore
*.spec.js export-ignore
*.test.ts export-ignore
*.spec.ts export-ignore

# Merge strategies
package.json merge=union
CHANGELOG.md merge=union

# Linguist overrides (for GitHub language statistics)
# Note: Azure Repos doesn't use Linguist, but keeping for GitHub compatibility
*.sql linguist-detectable=true
*.md linguist-detectable=false
docs/** linguist-documentation
tests/** linguist-generated=false

# Diff settings
*.min.js binary
*.min.css binary
```

### Platform-Specific Considerations

#### For Windows Developers

If your team is primarily Windows-based, consider:

```gitattributes
# More lenient for Windows - use autocrlf instead of eol=lf
* text=auto
```

#### For Cross-Platform Teams (Recommended)

Use the comprehensive version above with `eol=lf` to ensure consistency.

---

## Azure Repos Specific Considerations

### Line Ending Handling

Azure Repos, like GitHub, respects `.gitattributes` settings. Recommendations:

1. **Use `eol=lf`** for all text files (except Windows-specific scripts)
2. **Set `text=auto`** as fallback for unspecified files
3. **Mark binary files explicitly** to prevent corruption

### Binary File Handling

Azure Repos has the same considerations as GitHub:

- Large binary files can slow down clones
- Consider Azure Artifacts for binary dependencies
- Use Git LFS for large assets if needed

### Export Settings

The `export-ignore` attribute is useful for:

- Excluding test files from release archives
- Excluding CI/CD configurations
- Excluding development tools

Example for Azure Repos migration:

```gitattributes
# Exclude GitHub-specific files from exports
.github/ export-ignore
.github/** export-ignore

# Exclude development files
tests/ export-ignore
*.test.* export-ignore
*.spec.* export-ignore
.editorconfig export-ignore
```

---

## Implementation Guide

### Step 1: Review Current .gitignore

```bash
# Review current .gitignore
cat .gitignore

# Check for any tracked files that should be ignored
git ls-files | grep -E "(node_modules|\.env|\.log)"
```

### Step 2: Update .gitignore

```bash
# Backup current .gitignore
cp .gitignore .gitignore.backup

# Edit .gitignore with recommended additions
# Use your preferred editor
nano .gitignore
# or
code .gitignore
```

**Add the recommended sections** from the "Complete Recommended .gitignore" section above.

### Step 3: Create .gitattributes

```bash
# Create .gitattributes file
touch .gitattributes

# Add content from recommended .gitattributes section
# Use your preferred editor
nano .gitattributes
# or
code .gitattributes
```

### Step 4: Apply .gitattributes to Existing Files

After creating/updating `.gitattributes`, normalize existing files:

```bash
# Save any uncommitted work first
git add --all
git commit -m "chore: prepare for .gitattributes normalization"

# Remove all files from Git index (keeps working directory intact)
git rm --cached -r .

# Re-add all files (will apply new .gitattributes rules)
git add .

# Check what changed
git status

# Commit the normalization
git commit -m "chore: normalize line endings per .gitattributes"
```

**Warning:** This will show many files as changed. Review carefully before committing.

### Step 5: Verify Changes

```bash
# Check which files will be affected
git diff --cached --name-only

# See line ending changes
git diff --cached

# If too many changes, review specific files
git diff --cached path/to/file.js
```

### Step 6: Handle Previously Tracked Files

If files now in `.gitignore` were previously tracked:

```bash
# Remove specific file from Git but keep locally
git rm --cached .env

# Remove directory from Git but keep locally
git rm --cached -r node_modules/

# Commit the removal
git commit -m "chore: stop tracking files now in .gitignore"
```

### Step 7: Team Communication

Before pushing changes:

1. **Notify team members** about the .gitattributes addition
2. **Provide instructions** for handling line ending changes
3. **Schedule the commit** to minimize disruption
4. **Document the changes** in CHANGELOG.md

### Step 8: Push Changes

```bash
# Push to Azure Repos
git push azure main

# Or if azure is set as origin
git push origin main
```

### Step 9: Team Setup

Team members should run:

```bash
# Pull the changes
git pull

# If they encounter line ending issues
git config --global core.autocrlf input  # On Mac/Linux
git config --global core.autocrlf true   # On Windows

# Re-clone if serious issues
cd ..
git clone https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform
```

---

## Testing and Validation

### Test .gitignore

```bash
# Check if ignored files are properly excluded
git status --ignored

# Verify specific file is ignored
git check-ignore -v node_modules/

# Test pattern matching
git check-ignore -v *.log
```

### Test .gitattributes

```bash
# Check attributes for a file
git check-attr -a path/to/file.js

# Specific attribute check
git check-attr text path/to/file.js
git check-attr eol path/to/file.js

# List all files and their attributes
git ls-files | xargs -I {} git check-attr -a {}
```

### Verify Line Endings

```bash
# Check line endings in working directory (Unix-like systems)
file * | grep CRLF

# Check line endings in Git index
git ls-files --eol

# Detailed line ending info for specific file
git ls-files --eol path/to/file.js
```

---

## Common Issues and Solutions

### Issue 1: Files Not Being Ignored

**Problem:** Added file to `.gitignore` but still showing in `git status`

**Solution:**
```bash
# File was previously tracked
git rm --cached path/to/file
git commit -m "chore: remove tracked file now in .gitignore"
```

### Issue 2: Line Ending Conflicts

**Problem:** Merge conflicts on every line due to line ending differences

**Solution:**
```bash
# Set up proper line ending handling
git config core.autocrlf input  # Mac/Linux
git config core.autocrlf true   # Windows

# Re-normalize the repository
git add --renormalize .
git commit -m "chore: normalize line endings"
```

### Issue 3: Binary Files Corrupted

**Problem:** Binary files corrupted after clone/pull

**Solution:**
```bash
# Ensure file is marked as binary in .gitattributes
echo "*.png binary" >> .gitattributes
echo "*.jpg binary" >> .gitattributes

# Re-add the files
git add .gitattributes
git add path/to/images/*.png
git commit -m "fix: mark images as binary"
```

### Issue 4: Lock File Conflicts

**Problem:** Constant merge conflicts in `package-lock.json` or `yarn.lock`

**Solution:**
```bash
# Mark as binary in .gitattributes (prevents line-by-line merge)
echo "package-lock.json binary" >> .gitattributes
echo "yarn.lock binary" >> .gitattributes
git commit -am "chore: prevent lock file merge conflicts"
```

**Alternative:** Use merge strategy
```gitattributes
package-lock.json merge=union
yarn.lock merge=union
```

---

## Best Practices

### .gitignore Best Practices

1. **Start with comprehensive template** - Use community templates as base
2. **Comment sections clearly** - Organize by category
3. **Be specific over generic** - Prefer `*.log` over `*`
4. **Don't ignore committed files** - Remove from Git first
5. **Keep it updated** - Add new patterns as project evolves
6. **Document exceptions** - Explain any `!` negation patterns
7. **Test patterns** - Use `git check-ignore` to verify

### .gitattributes Best Practices

1. **Set text=auto globally** - Let Git detect text files
2. **Explicitly set line endings** - Don't rely on defaults
3. **Mark binaries explicitly** - Prevent text treatment
4. **Use export-ignore** - Keep releases clean
5. **Version lock files carefully** - Prevent merge conflicts
6. **Test thoroughly** - Verify on all platforms
7. **Document decisions** - Comment complex patterns

### Migration-Specific Best Practices

1. **Add .gitattributes before migration** - Ensures clean start
2. **Normalize line endings pre-migration** - Avoid confusion
3. **Update .gitignore for Azure** - Add Azure-specific patterns
4. **Archive .github in .gitattributes** - Exclude from exports
5. **Test with fresh clone** - Verify everything works
6. **Document changes** - Update README/CHANGELOG

---

## Checklist

### Pre-Migration Checklist

- [ ] Review current .gitignore
- [ ] Identify missing patterns
- [ ] Create/update .gitattributes
- [ ] Test on sample files
- [ ] Normalize line endings
- [ ] Remove tracked files that should be ignored
- [ ] Commit changes
- [ ] Test with fresh clone

### Post-Migration Checklist

- [ ] Verify .gitignore working in Azure Repos
- [ ] Verify .gitattributes applied correctly
- [ ] Check line endings consistent
- [ ] No binary files corrupted
- [ ] No unexpected files tracked
- [ ] Team members can clone successfully
- [ ] No merge conflicts from line endings
- [ ] CI/CD pipelines working

---

## Summary

### Current State
- ✅ .gitignore is comprehensive and well-organized
- ⚠️ .gitignore needs Azure DevOps additions
- ⚠️ .gitignore needs security enhancements
- ❌ .gitattributes does not exist

### Required Actions

1. **Update .gitignore**
   - Add Azure DevOps patterns
   - Add security patterns
   - Add development tool patterns
   - Add .jest-cache/

2. **Create .gitattributes**
   - Set line ending normalization
   - Mark binary files
   - Configure export settings
   - Set merge strategies for lock files

3. **Normalize Repository**
   - Apply .gitattributes to existing files
   - Commit normalization
   - Verify changes

4. **Team Communication**
   - Notify of changes
   - Provide setup instructions
   - Document new patterns

### Priority

1. **High Priority** (before migration)
   - Create .gitattributes
   - Update .gitignore for security
   - Normalize line endings

2. **Medium Priority** (during migration)
   - Add Azure DevOps patterns
   - Test patterns
   - Update team documentation

3. **Low Priority** (after migration)
   - Optimize patterns
   - Add project-specific patterns as needed
   - Review and refine

---

## Related Documents

- **AZURE_REPOS_MIGRATION_CHECKLIST.md** - Complete migration checklist
- **AZURE_REPOS_BRANCH_POLICIES.md** - Branch strategy
- **AZURE_REPOS_FOLDER_STRUCTURE.md** - Repository organization
- **migrate-to-azure-repos.sh** - Migration script

---

**Last Updated:** December 2025
**Version:** 1.0
**Reviewed By:** DevOps Team

#!/bin/bash

#############################################################################
# Azure Repos Migration Script
# Purpose: Migrate GitHub repository to Azure Repos
# Repository: World-Class-Dating-App-Platform
# Azure Repos: https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform
#############################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AZURE_REPO_URL="https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform"
TEMP_DIR="./temp-migration"
BACKUP_DIR="./backup-$(date +%Y%m%d-%H%M%S)"

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if git is installed
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    print_success "Git is installed: $(git --version)"

    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository. Please run this script from the repository root."
        exit 1
    fi
    print_success "Current directory is a Git repository"

    # Check for uncommitted changes
    if [[ -n $(git status -s) ]]; then
        print_warning "You have uncommitted changes. Please commit or stash them before migration."
        read -p "Do you want to continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Working directory is clean"
    fi

    # Check internet connectivity
    if ! ping -c 1 dev.azure.com &> /dev/null 2>&1; then
        print_warning "Cannot reach dev.azure.com. Please check your internet connection."
    else
        print_success "Internet connectivity confirmed"
    fi
}

# Function to create backup
create_backup() {
    print_header "Creating Backup"

    print_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"

    # Backup .git folder
    print_info "Backing up .git folder..."
    cp -r .git "$BACKUP_DIR/.git"

    print_success "Backup created successfully at: $BACKUP_DIR"
}

# Function to display current repository information
display_repo_info() {
    print_header "Current Repository Information"

    echo "Repository Path: $(pwd)"
    echo "Current Branch: $(git branch --show-current)"
    echo "Total Branches: $(git branch -a | wc -l)"
    echo "Total Tags: $(git tag | wc -l)"
    echo "Total Commits: $(git rev-list --all --count)"
    echo "Repository Size: $(du -sh .git | cut -f1)"
    echo ""
    echo "Current Remotes:"
    git remote -v
}

# Function to add Azure Repos as remote
add_azure_remote() {
    print_header "Adding Azure Repos Remote"

    # Check if azure remote already exists
    if git remote | grep -q "^azure$"; then
        print_warning "Azure remote already exists. Removing old remote..."
        git remote remove azure
    fi

    print_info "Adding Azure Repos as 'azure' remote..."
    git remote add azure "$AZURE_REPO_URL"

    print_success "Azure remote added successfully"
    echo ""
    echo "Updated remotes:"
    git remote -v
}

# Function to fetch all branches and tags
fetch_all() {
    print_header "Fetching All Branches and Tags"

    print_info "Fetching from origin..."
    git fetch origin --tags --prune

    print_success "All branches and tags fetched"
}

# Function to push to Azure Repos
push_to_azure() {
    print_header "Pushing to Azure Repos"

    # Push all branches
    print_info "Pushing all branches to Azure Repos..."
    if git push azure --all; then
        print_success "All branches pushed successfully"
    else
        print_error "Failed to push branches. Please check your credentials and permissions."
        return 1
    fi

    # Push all tags
    print_info "Pushing all tags to Azure Repos..."
    if git tag | grep -q .; then
        if git push azure --tags; then
            print_success "All tags pushed successfully"
        else
            print_warning "Failed to push tags (this is non-critical)"
        fi
    else
        print_info "No tags to push"
    fi

    # Set azure as upstream for current branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ -n "$CURRENT_BRANCH" ]; then
        print_info "Setting azure as upstream for branch: $CURRENT_BRANCH"
        git branch --set-upstream-to=azure/$CURRENT_BRANCH $CURRENT_BRANCH || true
    fi
}

# Function to verify migration
verify_migration() {
    print_header "Verifying Migration"

    print_info "Fetching from Azure Repos..."
    git fetch azure

    # Compare local branches with Azure remote
    print_info "Comparing branches..."
    LOCAL_BRANCHES=$(git branch | sed 's/\*//g' | sed 's/ //g')
    AZURE_BRANCHES=$(git branch -r | grep 'azure/' | sed 's/azure\///g' | sed 's/ //g')

    echo "Local branches:"
    echo "$LOCAL_BRANCHES"
    echo ""
    echo "Azure remote branches:"
    echo "$AZURE_BRANCHES"
    echo ""

    # Verify commit count
    MAIN_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
    LOCAL_COMMITS=$(git rev-list --count $MAIN_BRANCH 2>/dev/null || git rev-list --count main 2>/dev/null || git rev-list --count master 2>/dev/null)
    AZURE_COMMITS=$(git rev-list --count azure/$MAIN_BRANCH 2>/dev/null || git rev-list --count azure/main 2>/dev/null || git rev-list --count azure/master 2>/dev/null)

    echo "Commit count verification:"
    echo "  Local: $LOCAL_COMMITS commits"
    echo "  Azure: $AZURE_COMMITS commits"

    if [ "$LOCAL_COMMITS" -eq "$AZURE_COMMITS" ]; then
        print_success "Commit counts match! Migration verified."
    else
        print_warning "Commit counts don't match. Please review the migration."
    fi
}

# Function to display post-migration instructions
post_migration_instructions() {
    print_header "Post-Migration Instructions"

    cat << EOF
${GREEN}Migration completed successfully!${NC}

${YELLOW}Important Next Steps:${NC}

1. ${BLUE}Verify the migration:${NC}
   - Visit: $AZURE_REPO_URL
   - Check that all branches and commits are present
   - Verify the latest commit matches your local repository

2. ${BLUE}Update team members:${NC}
   - Notify your team about the new repository location
   - Share the Azure Repos URL
   - Provide credentials or access instructions

3. ${BLUE}Update local repository (for team members):${NC}
   git remote add azure $AZURE_REPO_URL
   git fetch azure
   git branch --set-upstream-to=azure/main main

4. ${BLUE}Configure Azure Repos:${NC}
   - Set up branch policies (see AZURE_REPOS_BRANCH_POLICIES.md)
   - Configure PR templates
   - Set up build validation
   - Configure security settings

5. ${BLUE}Update CI/CD pipelines:${NC}
   - Convert GitHub Actions to Azure Pipelines
   - Update webhook configurations
   - Test deployment pipelines

6. ${BLUE}Update documentation:${NC}
   - Update README.md with new repository URL
   - Update package.json repository field
   - Update any hardcoded GitHub URLs

7. ${BLUE}Backup location:${NC}
   - Your original .git folder is backed up at: $BACKUP_DIR
   - Keep this backup until you're confident the migration is successful

${YELLOW}Optional: Update origin to Azure Repos${NC}
If you want to make Azure Repos your primary remote:
   git remote rename origin github
   git remote rename azure origin

${GREEN}For detailed instructions, see:${NC}
   - AZURE_REPOS_MIGRATION_CHECKLIST.md
   - AZURE_REPOS_BRANCH_POLICIES.md
   - AZURE_REPOS_FOLDER_STRUCTURE.md

EOF
}

# Main execution
main() {
    print_header "Azure Repos Migration Script"
    echo "Repository: World-Class-Dating-App-Platform"
    echo "Destination: $AZURE_REPO_URL"
    echo ""

    # Confirm with user
    read -p "Do you want to proceed with the migration? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Migration cancelled by user."
        exit 0
    fi

    # Execute migration steps
    check_prerequisites
    display_repo_info
    create_backup
    fetch_all
    add_azure_remote

    echo ""
    print_warning "Ready to push to Azure Repos."
    print_info "You may be prompted for Azure DevOps credentials."
    echo ""
    read -p "Continue with push? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Migration stopped before push. Azure remote has been added."
        print_info "You can manually push later with: git push azure --all"
        exit 0
    fi

    push_to_azure
    verify_migration
    post_migration_instructions

    print_success "Migration process completed!"
}

# Run main function
main

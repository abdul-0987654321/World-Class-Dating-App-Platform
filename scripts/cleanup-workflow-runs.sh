#!/bin/bash
# Cleanup failed and cancelled workflow runs
# Run this script to delete old workflow runs from GitHub Actions

GH="/c/Program Files/GitHub CLI/gh.exe"
REPO="oks-citadel/World-Class-Dating-App-Platform"

echo "=== GitHub Workflow Cleanup Script ==="
echo "Repository: $REPO"
echo ""

# Function to delete runs by status
delete_runs() {
    local status=$1
    local count=0

    echo "Deleting $status runs..."

    while true; do
        # Get one run at a time to avoid rate limits
        id=$("$GH" run list --repo "$REPO" --status "$status" --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null)

        if [ -z "$id" ] || [ "$id" = "null" ]; then
            echo "No more $status runs found or rate limited"
            break
        fi

        if "$GH" run delete "$id" --repo "$REPO" 2>/dev/null; then
            ((count++))
            echo "Deleted $status run: $id (total: $count)"
        else
            echo "Failed to delete $id, may be rate limited. Waiting 30 seconds..."
            sleep 30
        fi

        # Wait 1 second between deletions to avoid rate limits
        sleep 1
    done

    echo "Deleted $count $status runs"
    return $count
}

# Check auth
echo "Checking GitHub authentication..."
if ! "$GH" auth status &>/dev/null; then
    echo "Not authenticated. Please run: gh auth login"
    exit 1
fi
echo "Authenticated!"
echo ""

# Delete failed runs
delete_runs "failure"
echo ""

# Delete cancelled runs
delete_runs "cancelled"
echo ""

echo "=== Cleanup Complete ==="
echo "Check remaining runs at:"
echo "https://github.com/$REPO/actions"

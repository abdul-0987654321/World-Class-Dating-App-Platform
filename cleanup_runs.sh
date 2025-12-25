#!/bin/bash
# Script to delete failed GitHub workflow runs

GH="/c/Program Files/GitHub CLI/gh.exe"
REPO="oks-citadel/World-Class-Dating-App-Platform"
BATCH_SIZE=50
DELAY=2

echo "=== GitHub Failed Workflow Run Cleanup ==="
echo "Started at: $(date)"

deleted=0
errors=0

while true; do
    # Get count of remaining failed runs
    count=$("$GH" run list --repo "$REPO" --status failure --limit 100 --json databaseId -q 'length' 2>&1)

    if [[ "$count" == *"rate limit"* ]]; then
        echo "Rate limit hit. Waiting 5 minutes..."
        sleep 300
        continue
    fi

    if [[ "$count" == "0" ]] || [[ -z "$count" ]]; then
        echo "No more failed runs to delete!"
        break
    fi

    echo "Remaining failed runs: $count"

    # Get batch of run IDs
    ids=$("$GH" run list --repo "$REPO" --status failure --limit $BATCH_SIZE --json databaseId -q '.[].databaseId')

    if [[ -z "$ids" ]]; then
        echo "No IDs returned, checking if done..."
        break
    fi

    # Delete each run
    for id in $ids; do
        echo "Deleting run $id..."
        result=$("$GH" run delete --repo "$REPO" "$id" 2>&1)

        if [[ $? -eq 0 ]]; then
            ((deleted++))
            echo "  Deleted ($deleted total)"
        else
            if [[ "$result" == *"rate limit"* ]]; then
                echo "Rate limit hit. Waiting 5 minutes..."
                sleep 300
            else
                ((errors++))
                echo "  Error: $result"
            fi
        fi

        sleep $DELAY
    done

    echo "Batch complete. Deleted so far: $deleted, Errors: $errors"
done

echo ""
echo "=== Cleanup Complete ==="
echo "Total deleted: $deleted"
echo "Total errors: $errors"
echo "Finished at: $(date)"

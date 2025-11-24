#!/bin/bash

ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
    # Read GITHUB_TOKEN from .env file
    # Using grep and sed to extract the value
    GITHUB_TOKEN=$(grep -E '^GITHUB_TOKEN=' "$ENV_FILE" | sed -e 's/^GITHUB_TOKEN=//' -e 's/"//g' -e "s/'//g")

    if [ -n "$GITHUB_TOKEN" ]; then
        export GITHUB_TOKEN
        echo "GITHUB_TOKEN has been exported from $ENV_FILE."
    else
        echo "GITHUB_TOKEN not found or is empty in $ENV_FILE."
    fi
else
    echo "$ENV_FILE not found in the current directory."
fi

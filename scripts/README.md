# Script to Set GITHUB_TOKEN

This directory contains utility scripts. The `set_github_token.sh` script is designed to help you load your `GITHUB_TOKEN` from your project's `.env` file and export it as an environment variable in your current shell session. This is particularly useful for authenticating with GitHub Packages when installing private npm packages.

## `set_github_token.sh`

### Usage

1.  **Ensure `.env` file exists**: Make sure you have a `.env` file in the root of your project.
2.  **Add `GITHUB_TOKEN` to `.env`**: Inside your `.env` file, add a line defining your GitHub Personal Access Token (PAT) with `read:packages` scope.

    ```
    GITHUB_TOKEN=your_actual_github_pat_here
    ```

3.  **Source the script**: To set the `GITHUB_TOKEN` environment variable in your current terminal session, `source` the script:

    ```bash
    source ./scripts/set_github_token.sh
    ```

    You should see a message confirming that the `GITHUB_TOKEN` has been exported.

### Why `source`?

When you `source` a script, it runs in the current shell environment. If you were to execute it directly (e.g., `./scripts/set_github_token.sh`), it would run in a subshell, and any environment variables set within that subshell would not persist in your main shell session.

### Troubleshooting

-   **"GITHUB_TOKEN not found or is empty in .env"**: Ensure the `GITHUB_TOKEN` variable is correctly defined in your `.env` file and that there are no typos.
-   **Script not found**: Make sure you are running the `source` command from the root of your project, or adjust the path to the script accordingly.

# Submodule Sync

Automatically update a submodule to the latest commit

## Usage

```yaml
name: Submodule Sync
on:
  schedule:
    - cron: "0 4 * * *"
  workflow_dispatch: ~

jobs:
  submodule-sync:
    name: Submodule Sync
    runs-on: ubuntu-latest
    steps:
      - name: Submodule Sync
        uses: mheap/submodule-sync-action@v1
        with:
          path: my-submodule
          ref: main
          pr_branch: automated-submodule-update
          target_branch: main
```

## Available Configuration

### Inputs

| Name            | Description                                                 | Required | Default               |
| --------------- | ----------------------------------------------------------- | -------- | --------------------- |
| `token`         | The GitHub API token to use                                 | false    | `${{ github.token }}` |
| `path`          | The path in the repo to update                              | true     |                       |
| `ref`           | The branch name to check for updates in the remote repo     | true     |                       |
| `pr_branch`     | The name of the branch to use when creating a pull request  | true     |                       |
| `target_branch` | The name of the branch that the PR should be raised against | true     |                       |
| `pr_body`       | Text to include in the generated PR's description           | false    | `""`                  |

# Repository ownership and integration

## Inventory

| Repository folder | Working role |
|---|---|
| `Inventory` | Main integrated application |
| `Inventory` | Main application |

Other root folders (`Assets/`, `Backups/`, temporary folders) are not repositories unless verified.

## Rules

- Confirm repository root with Git before branch, commit, pull, push, or other repository-specific actions. Run Git commands with the intended repository as working directory.
- A change to module source belongs in that module's repository. An integration shell, shared navigation, or prototype mount belongs in `Inventory/` unless repository documentation says otherwise.
- A cross-repository task can modify multiple repositories only when needed for the requested outcome. Review and report each repository's changes and branch separately.
- Do not infer that a similarly named backup, prototype, or duplicate is authoritative. Inspect references and recent history before selecting the edit target.
- Keep names and paths as they currently are. Propose a rename separately because scripts, imports, and remotes may depend on them.

Create **both**: tag the current commit first to freeze a permanent snapshot of your working cloud-web system, then cut a new **long-lived branch** from that tag to build the standalone/hybrid version. A tag alone is read-only—you cannot commit new standalone wrapper or SQLite code onto a tag, whereas a branch without a baseline tag makes it harder to trace the exact pivot point later.

  

### Tag vs. Branch vs. Separate Repo

| **Git Strategy**                                                 | **Best Used For**                                                                                                                            | **Why It Fits (or Doesn't)**                                                                                                 |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Annotated Tag** _(e.g., `v1.0.0-cloud-baseline`)_              | Freezing the exact commit where the cloud-web app was 100% stable before the pivot.                                                          | Acts as a permanent, immutable bookmark. You can always check it out or deploy it if you need a clean cloud rollback.        |
| **Long-Lived Feature Branch** _(e.g., `feat/standalone-hybrid`)_ | Developing the standalone desktop wrapper (Electron) and local SQLite persistence layer while keeping `main` intact.                         | Lets you cherry-pick UI bug fixes from `main` into `feat/standalone-hybrid` without polluting your working cloud deployment. |
| **Separate Repository / Fork**                                   | Only when the standalone app completely diverges into a different tech stack (e.g., rewriting a React web app into a native C# or Rust app). | Creates double maintenance—every shared UI or business-logic fix has to be manually copied between two repos.                |

### Step-by-Step: Safeguarding `main` and Cutting the Standalone Branch

Run these commands in your project root to lock your baseline and start your standalone workspace cleanly:

1. **Verify a Clean Working Tree on `main`**
    
    - Commit or stash any uncommitted changes on `main` so your baseline snapshot is complete.
        
    - Run `git status` and `git checkout main && git pull origin main`.
        
    - _Verification:_ `git status` outputs `nothing to commit, working tree clean`.
        
2. **Create an Annotated Baseline Tag**
    
    - Tag the current `main` commit so you have an immutable reference to the pure cloud-web version:
        
        Bash
        
        ```
        git tag -a v1.0.0-cloud-baseline -m "Stable cloud-web version prior to standalone hybrid pivot"
        git push origin v1.0.0-cloud-baseline
        ```
        
    - _Verification:_ Run `git tag -l -n1` and confirm `v1.0.0-cloud-baseline` appears with your message.
        
3. **Cut and Push Your Standalone Hybrid Branch**
    
    - Create a new branch directly from `main` (or from the tag) so all Electron/SQLite work stays isolated:
        
        Bash
        
        ```
        git checkout -b feat/standalone-hybrid
        git push -u origin feat/standalone-hybrid
        ```
        
    - _Verification:_ Run `git branch -vv` and confirm `* feat/standalone-hybrid` is checked out and tracking `origin/feat/standalone-hybrid`.
        
4. **Isolate Environment Variables Immediately**
    
    - Before adding local SQLite or Electron dependencies, duplicate your `.env` file into `.env.standalone.example` (and confirm `.env*` is in `.gitignore`) so local database paths and cloud mirror keys never overwrite your production cloud credentials on `main`.
        
    - _Verification:_ Run `git status` and confirm `.env` files do not appear as untracked changes.
        

### How to Keep Both Versions Synced While Building

- **Shared UI & Business Logic:** Whenever you fix a layout bug or calculation rule on `main`, bring it into your standalone branch using `git cherry-pick <commit-hash>` or `git merge main` rather than rewriting it twice.
    
- **Storage Adapter Pattern:** Isolate your database calls inside a single data-access folder (e.g., `src/services/db/`) on `feat/standalone-hybrid`. That way, 90% of your frontend components remain identical to `main`, and only the storage adapter swaps from direct Supabase API calls to local SQLite + background sync.
Both pipelines follow a **local-first, hub-and-spoke replication model**—clients write to local disk first, never connect directly peer-to-peer, and stream deltas through a central server. The fundamental difference is **granularity**: your PowerSync + PostgreSQL + Tailscale stack replicates **structured database rows**, while Obsidian Sync replicates **unstructured files and folders**.

  

### Side-by-Side Pipeline Comparison

|**Architecture Dimension**|**Your Stack (SQLite + PowerSync + Postgres + Tailscale)**|**Obsidian Sync Pipeline**|
|---|---|---|
|**Unit of Replication**|**Database Rows & Columns** (PostgreSQL Write-Ahead Log deltas streamed into local SQLite tables).|**Whole Files & Paths** (Markdown notes, JSON settings, canvases, and binary attachments tracked by file hash).|
|**Local Storage Engine**|Embedded **SQLite** database (`ps_crud` outbox queue + relational tables).|Plain filesystem directory (**Vault folder** on disk).|
|**Central Hub**|Self-hosted **PostgreSQL + PowerSync** on your Dell Inspiron 3000.|Proprietary **Obsidian Remote Vault** cloud relay servers.|
|**Transport & Network Security**|**WireGuard VPN mesh (Tailscale)**—zero public ports; encrypted at the network tunnel layer.|**Public Internet TLS/WSS**—requires outbound internet to Obsidian's cloud endpoints.|
|**Data Encryption at Rest**|Encrypted on disk/in transit by WireGuard, unless you add custom client-side column encryption.|**Mandatory Zero-Knowledge E2EE**—both file contents and filenames are encrypted locally before upload.|
|**Conflict Resolution**|**Server-Authoritative / Role-Locked**—your backend/Postgres decides merges, and your Authorized Viewer is strictly read-only.|**Client-Side Line Merge**—uses Google's `diff-match-patch` for Markdown text and "last modified wins" for binaries.|
|**Disaster Recovery**|**Point-in-time relational integrity**—SQLite can be wiped and rebuilt cleanly from Postgres + nightly `pg_dump` backups.|**File version history**—retains previous file snapshots for 1–12 months, though bulk deletes still propagate to all synced clients.|

### Why Your Stack Fits a Store System (Where File Sync Would Break)

If you tried to use an Obsidian-style file-sync pipeline (like Syncthing or Obsidian Sync) to replicate a SQLite database file directly between the Store Device and Authorized Device, **the database would corrupt**:

  

- **Atomic Transaction Safety:** SQLite splits live transactions across three files (`.db`, `.db-wal`, and `.db-shm`). File-level sync engines copy these files asynchronously at different speeds, which frequently leaves the remote device with a half-written WAL file and a corrupted database.
    
- **Row-Level Concurrency vs. File Overwrites:** Your PowerSync pipeline captures individual `INSERT`/`UPDATE` mutations in `ps_crud` and replays them cleanly into PostgreSQL, letting the Store Device write continuously while the Authorized Device reads live SQL queries without file-locking collisions.
    
- **Network Sovereignty:** Unlike Obsidian Sync—which depends on third-party cloud servers—your Tailscale + Dell Inspiron pipeline keeps the central hub physically inside the store while still letting the client inspect live totals from outside.
    

### One Lesson Worth Borrowing from Obsidian Sync

Obsidian Sync's strongest design choice is **Zero-Knowledge Encryption** before data leaves the client. While your Tailscale tunnel already encrypts data in transit between the store and the client's phone, adding **automated encrypted backups** (`pg_dump` encrypted with `age` or `gpg`) on the Dell server gives you Obsidian Sync's version-history safety net without exposing plaintext store records if a backup drive is ever lost.
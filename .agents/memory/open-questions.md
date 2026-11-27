# Open questions

Keep only questions that affect future work. Add a next step; delete or resolve entries when answered.

## Retail database follow-up

- **Question:** How should repayments be allocated to individual credit sales, and how should voids/refunds reverse those allocations?
- **Next step:** Define allocation and reversal rules before enabling financial edits or refunds for `UTANG`/`PARTIAL` sales.
- **Status:** Active

- **Question:** When should the separate PostgreSQL `products`/`inventory_batches` subsystem be merged with the SQLite workspace inventory catalog?
- **Next step:** Map current product IDs, batches, API consumers, and restore behavior before planning a cutover.
- **Status:** Active

- **Question:** What backup cadence, retention, and recovery targets are required for the counter installation?
- **Next step:** Decide targets and rehearse restore on representative data before operating the retail ledger in production.
- **Status:** Active

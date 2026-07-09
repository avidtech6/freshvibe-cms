---
id: fvcms.stub.queries.001
status: STUB
freshvibe_way_version: v8
date: 2026-07-09
---

# STUB: Queries

> **This is a STUB.** It documents a feature that **does not exist** in freshvibe-cms today. Per V8 §8 anti-drift rule 3 ("no invention"), no code is added until the operator signs off on building it.

---

## What queries would be

A query is a saved filter that returns content-type instances. Examples:

- **Latest 3 books** — `Book` ordered by `publishedAt DESC` limit 3
- **All recipes tagged "quick"** — `Recipe WHERE tags CONTAINS "quick"`
- **Lessons in chapter 5** — `Lesson WHERE chapter = 5 ORDER BY position`

When queries exist, the frontend editor can:
- Add a "Latest Books" widget to any page (renders as a carousel of Book cards)
- Show "+ New Book" inside the query panel (creates a new Book instance)
- Edit the query inline ("change limit to 6")

## Why it's a stub

Queries require content types to exist. See `stubs/content-types.md`.

## What this stub will contain when built

- `app-fragments/queries/fragment.md` — the contract
- `app-fragments/queries/<query-name>/fragment.md` — one per query
- A query descriptor (type, filter, sort, limit)
- A renderer that resolves the query and renders each result as a content-type instance
- Edit-in-place UI for the query itself (not the results)

## Open questions for the operator

1. Are queries stored in the same IndexedDB as modules, or a separate collection?
2. Do queries support cross-page references ("show the same Latest Books on the home page AND the books page")?
3. Do queries have caching (e.g. pre-rendered into static HTML at build time)?

## Cross-references

- `stubs/content-types.md` — prerequisite
- `stubs/templates.md` — depends on queries
- `app-fragments/fragments.md §Stubs` — the index entry
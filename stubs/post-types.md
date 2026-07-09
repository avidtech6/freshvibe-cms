---
id: fvcms.stub.post-types.001
status: STUB
freshvibe_way_version: v8
date: 2026-07-09
---

# STUB: Post Types (admin UI)

> **This is a STUB.** It documents a feature that **does not exist** in freshvibe-cms today, and may never — the operator has signalled that the admin-UI side is out of scope for freshvibe-cms. Per V8 §8 anti-drift rule 3 ("no invention"), no code is added unless the operator explicitly says otherwise.

---

## What post types would be

A "post type" in the WordPress sense is the admin-list side of a content type: the table view of all Book instances, the "+ Add New" button, the bulk actions, the categories/tags taxonomy.

freshvibe-cms today has none of that. It is a frontend editor for a rendered page. The "admin" (if any) lives in the consumer app — Oscar-web might eventually have its own admin UI for managing Books, Lessons, etc., but that admin UI would be Oscar-web's fragment, not freshvibe-cms.

## Why it's a stub

Per the pact (`app-pact.md §7`):

> freshvibe-cms is NOT WordPress. No post type admin UI. No admin user roles. No settings menu.

If freshvibe-cms started providing a post-type admin UI, it would creep into "WordPress territory" — which is explicitly out of scope.

If a consumer needs post-type admin UI, they build it themselves and use freshvibe-cms for the frontend editing layer only.

## What this stub WILL contain if ever built

Probably nothing. This is a placeholder to mark the gap explicitly so future contributors don't accidentally add WordPress-style admin features.

## Open questions for the operator

1. Confirm: is post-type admin UI explicitly out of scope for freshvibe-cms?
   - (a) Yes — never. This stub stays as a marker only.
   - (b) Maybe — if a consumer needs it, we revisit.
   - (c) No — actually, let's build it. (Would require a new V8 module.)

## Cross-references

- `stubs/content-types.md` — the data model side (separate concern)
- `app-pact.md §7` — what freshvibe-cms is NOT
- `app-fragments/fragments.md §Stubs` — the index entry
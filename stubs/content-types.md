---
id: fvcms.stub.content-types.001
status: STUB
freshvibe_way_version: v8
date: 2026-07-09
---

# STUB: Content Types

> **This is a STUB.** It documents a feature that **does not exist** in freshvibe-cms today. Per V8 §8 anti-drift rule 3 ("no invention"), no code is added until the operator signs off on building it.

---

## What content types would be

A content type is a schema for a piece of content. Examples:

- **Book** — title, author, ISBN, cover image, blurb, publish date, tags
- **Lesson** — title, video URL, transcript, prerequisites, exercises
- **Recipe** — title, ingredients[], steps[], cook time, difficulty
- **Page** — title, slug, hero image, body

When content types exist, the frontend editor can:
- Show a "+ New Book" button next to a list widget
- Render a Book card from a query result
- Edit a Book's fields in the same inspector as a regular module

## Why it's a stub

freshvibe-cms today is the **frontend editing layer** for an existing HTML page. It edits regions, modules, and inline text. There is no concept of "this is a Book" vs "this is a Lesson" yet.

When Oscar-web (or another consumer) actually has post types to model — distinct schemas with their own admin UIs — then content types become real. Until then, every module is a one-off layout.

## What this stub will contain when built

- `app-fragments/content-types/fragment.md` — the contract
- `app-fragments/content-types/<type-name>/fragment.md` — one per content type
- A schema descriptor (fields, types, validation)
- A renderer that takes a content-type instance and produces HTML
- An admin UI for adding/editing instances (or a programmatic API for the consumer to expose)

## Open questions for the operator

1. Where do content-type instances live? IndexedDB (like modules)? External CMS? Static JSON?
2. Does freshvibe-cms provide an admin UI, or only a programmatic API the consumer uses?
3. How do queries get data? Push (instances pushed to the store) or pull (queries fetch from the consumer)?

## Cross-references

- `stubs/queries.md` — depends on content types existing
- `stubs/templates.md` — depends on queries
- `stubs/post-types.md` — the WordPress-style admin UI (separate concern)
- `app-fragments/fragments.md §Stubs` — the index entry
---
id: fvcms.stub.templates.001
status: STUB
freshvibe_way_version: v8
date: 2026-07-09
---

# STUB: Templates (Stitch)

> **This is a STUB.** It documents a feature that **does not exist** in freshvibe-cms today. Per V8 §8 anti-drift rule 3 ("no invention"), no code is added until the operator signs off on building it.

---

## What templates would be

A template is a reusable page composition. Operator's phrase for this: "Stitch — page = cover + 3 cards + query."

Examples:

- **Book page** — hero (Book cover) + title + blurb + chapters (query)
- **Recipe page** — hero (Recipe image) + ingredients + steps + related recipes (query)
- **Lesson page** — hero (video) + transcript + exercises + next lesson (query)

When templates exist, the frontend editor can:
- Insert a template as a starting point for a new page
- Override any slot in the template (e.g. swap the Book cover with a video)
- Edit the underlying query without losing the template structure

## Why it's a stub

Templates require queries to exist. See `stubs/queries.md`.

## What this stub will contain when built

- `app-fragments/templates/fragment.md` — the contract
- `app-fragments/templates/<template-name>/fragment.md` — one per template
- A template descriptor (slots, default content for each slot, allowed overrides)
- A composer that lays out the slots (grid? flex? vertical stack?)
- An "Insert from template" UI action

## Open questions for the operator

1. Are templates page-scoped or global?
2. Can a template include another template (composition)?
3. Does freshvibe-cms define its own template format, or use a standard (Handlebars, Liquid, JSX)?

## Cross-references

- `stubs/queries.md` — prerequisite
- `stubs/content-types.md` — the data that fills the slots
- `app-fragments/fragments.md §Stubs` — the index entry
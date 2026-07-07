# FreshVibe CMS — AI Integration Spec

**For AI agents and tool authors who want to use FreshVibe CMS to edit
sites safely.**

## The promise

FreshVibe CMS gives AI agents:
- A typed schema for every editable piece of content on the page
- A scoped addressing system (page → region → group → module → field)
- A scope-aware permission system that prevents overreach
- AI only ever edits what was asked. Modules outside the scope
  are not touched.

## The contract

An AI agent always works within a scope:

```js
import { resolveScope, assertOp } from 'freshvibe-cms/runtime/scope.js';
import { query } from 'freshvibe-cms/runtime/query.js';
```

### 1. Resolve a request to a scope

The agent's natural-language prompt is reduced to a scope by the
caller (the host app, not the AI itself). Examples:

| User says | Scope |
|---|---|
| "Make the CTA on the hero say 'Get started today'" | `{ type: 'field', moduleInstanceId: 'MI-cta-hero', field: 'text' }` |
| "Make the hero region better" | `{ type: 'region', regionId: 'R-hero' }` |
| "All the CTAs across the site" | iterate `query({ moduleId: 'M-cta' })`, one scope per result |
| "This page" | `{ type: 'page', pageId: '<current>' }` |

### 2. Check the AI's proposal against the scope

Before applying any edit:

```js
const { ops } = resolveScope(scope);
if (!ops.editContent) throw new Error('Not allowed to edit content here');
if (ops.create && proposedNewModule) {
  // Creation is allowed too
}
```

### 3. Apply the edit

Use store methods, never direct DOM mutation:

```js
import { getStore } from 'freshvibe-cms/runtime/store.js';
const store = getStore();

assertOp({ type: 'field', moduleInstanceId: 'id', field: 'text' }, 'editContent');
store.updateField('id', 'text', 'Get started today');
// Renderer auto-runs → DOM updates immediately
```

Or for full module replacement:

```js
const m = store.getModule('id');
m.config = { ...m.config, text: 'New text', href: '/new-target' };
store.putModule(m);
// Renderer subscribed → re-renders
```

### 4. Scope-tighten if the user refines

If the user says "actually just the button on the hero" after the agent
proposed a region-wide change:

- Old scope: `{ type: 'region', regionId: 'R-hero' }`
- New scope: `{ type: 'module', moduleInstanceId: 'MI-cta-hero' }`

Re-apply edits with the new scope. The AI is now forbidden from
touching sibling modules in the same region.

## Querying the store

The `query()` API lets the agent find targets:

```js
import { query } from 'freshvibe-cms/runtime/query.js';

// Find all heading modules on this page
query({ moduleId: 'M-heading' })
// → { results: [{ scope: { type: 'module', moduleInstanceId: 'MI-heading-1' }, ... }], count: 8 }

// Find all CTA modules with text containing 'Learn'
query({ moduleId: 'M-cta', where: { text: 'Learn' } })
// → { results: [...], count: 3 }

// List regions on the active page
query({ listRegions: true })
// → { results: [{ scope: { type: 'region', regionId: 'R-hero' }, ... }] }

// List all pages
query({ listPages: true })
```

The `results[].scope` field is what you pass to `resolveScope` /
`assertOp` / `updateField`. Use the scope mechanism, not the raw id.

## Safety guarantees

1. **Scope boundary enforced.** `assertOp(scope, op)` throws if the op
   isn't allowed at the scope. An agent running `assertOp({type: 'page', ...}, 'delete')`
   followed by a delete will succeed at the page level. An agent that
   only has module scope running the same code path will throw on the
   assertOp.

2. **Field writes only via store.** The store is the only path to
   persistent edits. Direct DOM mutation doesn't persist (the next
   render would clobber it). AI agents that try to bypass via DOM
   mutation produce nothing durable.

3. **Renderer subscribed.** Every `updateField` and `putModule` triggers
   `renderModule(id)`, which calls the registered render function. The
   render function patches the DOM. An AI's edit is immediately visible.

4. **No free-form HTML.** Modules have typed schemas with `type: 'string' | 'number' | ...`.
   An AI can't inject arbitrary HTML — it can only set strings to values
   that fit the schema. (Thread B may add a 'html' field type for
   specifically-approved modules.)

## Prompt template for an AI agent

Here's a prompt you can give to an AI assistant:

```
You are editing a website's content using FreshVibe CMS.

You will be given a scope (page, region, group, module, or field).
You may only edit within that scope. Other modules will not be touched.

You will receive:
- SCOPE: { ... }
- OPS: { read, rearrange, editContent, create, delete }
- TARGETS: array of {kind, id, label, config}

You can edit a target's config using:
  store.updateField(id, fieldName, newValue)
or replace a whole module config using:
  store.putModule({ id, ..., config: newConfig })

If you want to do something outside the scope's ops (e.g. create a new
module when the scope says create=false), STOP and report. Do not
attempt to bypass the scope.

Return: { changes: [{scope, field, oldValue, newValue}], notes: '...' }
```

## What AI CANNOT do (v1)

- Edit modules outside its scope
- Add new module types to the canonical library (only humans do)
- Edit freeform HTML chunks (only typed module fields)
- Modify detectors (only humans add new stacks)
- Mutate scope / ops / target metadata

These are by design. AI edits WHAT. Humans design WHAT IS EDITABLE.

## Future additions (Thread B)

The scope system already has shape for:
- `gating` — restrict edits based on subscription tier
- `progress` — read-only access to user progress
- `currentUser` — apply conditional logic to scope resolution
- `metadata` — open bag for per-instance context

These will hook into the existing `resolveScope()` and `assertOp()`
functions without changing their signature.
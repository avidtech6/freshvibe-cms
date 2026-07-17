# FvCMS data model contract — for any AI generating or consuming FvCMS data

**Date written:** 2026-07-17
**Audience:** Any AI (current model, future model, fine-tune, human
auditor) that generates, validates, reads, or writes FreshVibe CMS
runtime data. That includes annotations (the source-of-truth
descriptions of regions/groups/modules on a page), module
definitions, skin definitions, scope calculations, and anything else
that flows through the store.

This document exists because **the FvCMS data model is defined in
TypeScript pseudo-types in `schemas/data-model.md` and TS-pseudo
stubs in `stubs/*.md` — and a future AI can drift the same way GLM
drifts on JSON output**: inventing a new field name, picking a
different union member, omitting a required field, or using a
stack-specific class name in a selector. The contract below pulls
the types into one place, adds a worked example, an anti-example, and
explicit rules for which layer enforces what.

If you are an AI writing or validating FvCMS data, read this first.

## What is FvCMS data?

FvCMS data is the runtime state for the freshvibe-cms package. It
consists of:

- **Pages** — keyed by URL pathname, contain region ids
- **Regions** — top-level containers on a page, addressable by selector
- **Groups** — wrappers inside a region, may be promoted to modules
- **Module instances** — actual occurrences of a module on a page,
  with config matching a module definition
- **Module definitions** — the canonical library of module types
  (M-heading, M-cta, M-image, etc.)
- **Skins** — named bundles of module defaults + CSS tokens
- **Scopes** — addressable positions in the runtime graph; the safety
  boundary for AI editing
- **Runtime context** — the global state for an editor session

The runtime reads/writes this data. The detector produces it. AI
editing operates on it. The renderer patches the live DOM from it.

The runtime sits at the **store + editor + renderer** layer. It does
not contain the words "Elementor", "WordPress", "Shopify", "Webflow",
or "Next.js" anywhere. If you find yourself writing FvCMS data with
those words, you're at the wrong layer.

## 1. Top-level shapes (canonical TypeScript)

The full types live in `schemas/data-model.md`. Pulled here for
reference; that file is the source of truth and this section must
not drift from it. If you change a type, change it in `data-model.md`
and bump the version header in that file.

```ts
// A page is keyed by URL pathname. It contains regions.
type Page = {
  id: string;                    // "p-home", "p-about"
  pathname: string;              // "/", "/about/"
  label?: string;                // "Home"
  regionIds: string[];           // ordered
  activeSkin?: string;           // page-level skin override
  metadata?: Record<string, any>;
};

// A named, addressable area on a page.
type Region = {
  id: string;                    // "R-hero", "R-books", "R-friends"
  pageId: string;                // "p-home", "p-about"
  label?: string;                // "Hero" — display name in editor UI
  selector: string;              // CSS selector to locate on page
  order: number;                 // visual order on page (0-based)
  skin?: string;                 // optional per-region skin override
  config?: {
    background?: string;
    paddingX?: string;
    paddingY?: string;
    maxWidth?: 'narrow' | 'normal' | 'wide' | 'full';
    textColor?: string;
  };
  gating?: {
    level: 'free' | 'pro' | 'school';
    until?: string;              // ISO date
  };
  metadata?: Record<string, any>;
};

// A wrapper inside a region. May be promoted to a module.
type Group = {
  id: string;                    // "G-1", "G-2"
  regionId: string;              // parent
  selector: string;              // CSS selector to locate
  order: number;                 // visual order within region
  isModule: boolean;             // MANUAL toggle in v1
  moduleInstanceId?: string;     // present iff isModule === true
  metadata?: Record<string, any>;
};

// A typed component definition. Lives in the canonical library.
type ModuleDef = {
  id: string;                    // "M-heading", "M-cta", "M-image"
  label: string;
  schema: ModuleSchema;          // typed field schema
  defaultConfig: any;            // default field values
  editor?: string;               // editor component id
  variants?: ModuleVariant[];
};

type ModuleSchema = { [fieldName: string]: FieldDef; };

type FieldDef = {
  type: 'string' | 'number' | 'boolean' | 'color' | 'url'
      | 'image' | 'select' | 'array' | 'object';
  label?: string;
  required?: boolean;
  default?: any;
  options?: string[];            // for 'select'
  min?: number;                  // for 'number'
  max?: number;
  pattern?: string;              // regex for 'string'
  itemType?: FieldDef;           // for 'array'
  fields?: ModuleSchema;         // for 'object'
};

type ModuleVariant = {
  id: string;                    // "outline", "ghost", "filled"
  label: string;
  config: any;                   // partial config overrides
};

// One actual occurrence of a module on a page.
type ModuleInstance = {
  id: string;                    // "MI-cta-12"
  moduleId: string;              // "M-cta"
  groupId: string;               // parent group
  selector: string;              // CSS selector to locate on page
  config: any;                   // current field values (must match schema)
  skin?: string;
  progress?: Record<string, number>;
  gating?: {
    level: 'free' | 'pro' | 'school';
    until?: string;
  };
  metadata?: Record<string, any>;
};

// A named bundle of module defaults + CSS tokens.
type Skin = {
  id: string;
  label: string;
  moduleDefaults: Record<string, any>;
  cssTokens: Record<string, string>;
  metadata?: Record<string, any>;
};

// A queryable address used by AI editing + UI navigation.
type Scope =
  | { type: 'page', pageId: string }
  | { type: 'region', regionId: string }
  | { type: 'group', groupId: string }
  | { type: 'module', moduleInstanceId: string }
  | { type: 'field', moduleInstanceId: string, field: string };

type ScopeOps = {
  read: boolean;
  rearrange: boolean;
  editContent: boolean;
  create: boolean;
  delete: boolean;
};

// Global state for an editor session.
type RuntimeContext = {
  page: Page | null;
  regions: Record<string, Region>;
  groups: Record<string, Group>;
  modules: Record<string, ModuleInstance>;
  moduleDefs: Record<string, ModuleDef>;
  skins: Record<string, Skin>;
  activeSkin: string | null;
  currentUser?: {
    id: string;
    role: 'admin' | 'editor' | 'teacher' | 'learner' | 'guest';
  };
  scopes: Record<string, ScopeOps>;
};
```

---

## 2. ID conventions (strict)

The runtime relies on these prefixes to find things. Don't invent
new ones; don't drop them.

| Prefix | Type | Example |
|---|---|---|
| `p-` | Page | `p-home`, `p-about` |
| `R-` | Region | `R-hero`, `R-books` |
| `G-` | Group | `G-1`, `G-friends-grid` |
| `M-` | Module definition | `M-heading`, `M-cta` |
| `MI-` | Module instance | `MI-cta-12` |

**Why:** the runtime uses string prefix matching for lookups and
consistency checks. `getModuleDef('heading')`, `getModuleDef('M-heading')`,
and `getModuleDef('heading.default')` all resolve to the same
definition (see invariant I-003). The bare-name match is a tolerance
for convenience; the `M-` prefix is the canonical form. **Don't use
other prefixes** — if you invent `mod-` or `mod_`, the runtime won't
find it.

---

## 3. Selector rules

Selectors are how the runtime finds the element on the page. They
must be **page-builder-agnostic** wherever possible. Specifically:

| Selector form | OK? | When |
|---|---|---|
| `'.e-con[data-id="abc"]'` | ⚠️ use only for **Elementor source** detectors | When the FvCMS runtime runs on top of an Elementor page and the detector produced the annotation from it |
| `'.my-class'` | ✓ | When the host site has its own semantic class |
| `'[data-region="hero"]'` | ✓ | When the host site uses data attributes for region markers |
| `'.elementor-section .e-con'` | ✗ **FORBIDDEN in the runtime** | Selector should be a single root, not a path |
| `'div'` | ✗ **FORBIDDEN** | Too broad, will match many elements |

The runtime's `region-scanner.js` and `config-from-dom.js` use these
selectors to bind runtime data to DOM elements. Bad selectors = bad
edits. The detector is responsible for producing selectors that point
at exactly one element per id.

**Stack-agnostic check** (see invariant I-001): a grep for
`querySelector` calls in the runtime layer (`runtime/*.js` except
`runtime/renderer.js`) that use framework-specific prefixes
(`elementor-`, `wp-block-`, `eael-`, `fl-builder`, `divi-`) must
return zero matches. The renderer can have fallbacks but the
scanner, store, and editor cannot.

---

## 4. Config typing rules

`ModuleInstance.config` and `Skin.moduleDefaults[moduleId]` must
**validate against `ModuleDef.schema`**. Specifically:

- Every key in `config` must be a key in `schema`.
- Every value must satisfy the corresponding `FieldDef.type`:
  - `'string'` → string
  - `'number'` → number, respecting `min`/`max` if set
  - `'boolean'` → boolean
  - `'color'` → CSS color string (`#hex`, `rgb()`, `hsl()`, `var(--token)`)
  - `'url'` → string starting with `http://` or `https://` or `/`
  - `'image'` → `{ src: string, alt?: string }` object
  - `'select'` → one of `options[]`
  - `'array'` → array of `itemType`-typed values
  - `'object'` → object matching `fields` (recursively)
- If `required: true`, the key MUST be present.
- Unknown extra keys are allowed (forward-compat) but ignored by the
  renderer.

If you are a future AI producing a `ModuleInstance.config`, run
`validateConfig(config, schema)` mentally before emitting. If you're
implementing the validator, it's the runtime's job to reject
invalid configs and surface the error to the operator.

---

## 5. Worked example (correct shape)

A small page with one region, one group, one module instance.

```ts
// Page
const home: Page = {
  id: 'p-home',
  pathname: '/',
  label: 'Home',
  regionIds: ['R-hero'],
};

// Region
const heroRegion: Region = {
  id: 'R-hero',
  pageId: 'p-home',
  label: 'Hero',
  selector: '[data-region="hero"]',
  order: 0,
  config: {
    background: '#ffffff',
    paddingX: '64px',
    paddingY: '80px',
    maxWidth: 'wide',
    textColor: '#1a1a1a',
  },
};

// Group
const heroGroup: Group = {
  id: 'G-hero-1',
  regionId: 'R-hero',
  selector: '[data-group="hero-cta"]',
  order: 0,
  isModule: true,
  moduleInstanceId: 'MI-cta-12',
};

// Module instance
const ctaInstance: ModuleInstance = {
  id: 'MI-cta-12',
  moduleId: 'M-cta',
  groupId: 'G-hero-1',
  selector: '[data-module="cta-12"]',
  config: {
    text: 'Get started',
    url: 'https://example.com/start',
    color: '#0066ff',
    size: 'large',
  },
};

// Module definition
const ctaDef: ModuleDef = {
  id: 'M-cta',
  label: 'Call to action',
  schema: {
    text: { type: 'string', label: 'Button text', required: true, default: 'Click me' },
    url: { type: 'url', label: 'Target URL', required: true },
    color: { type: 'color', label: 'Button color', default: '#0066ff' },
    size: {
      type: 'select',
      label: 'Button size',
      options: ['small', 'medium', 'large'],
      default: 'medium',
    },
  },
  defaultConfig: {
    text: 'Click me',
    url: '#',
    color: '#0066ff',
    size: 'medium',
  },
};

// Skin
const defaultSkin: Skin = {
  id: 'skin-default',
  label: 'Default',
  moduleDefaults: {
    'M-cta': { color: '#0066ff', size: 'medium' },
  },
  cssTokens: {
    '--font-base': '"Inter", system-ui, sans-serif',
    '--color-primary': '#0066ff',
  },
};
```

Every id has the right prefix. Selectors are single roots with
semantic attributes. Config keys match the schema. `required` fields
are present. Stack-agnostic.

---

## 6. Anti-examples (forbidden shapes)

### 6a. Wrong id prefix

```ts
// WRONG: no M- prefix
const ctaDef: ModuleDef = { id: 'cta', ... };

// WRONG: lowercase prefix
const heroRegion: Region = { id: 'r-hero', ... };

// WRONG: completely different convention
const homePage: Page = { id: 'home', ... };  // missing p- prefix
```

The runtime won't find these. Use the prefixes from §2.

### 6b. Stack-specific selector in runtime

```ts
// WRONG: framework-specific selector in the runtime layer
// (see invariant I-001)
const heroRegion: Region = {
  selector: '.elementor-element-abc123 .e-con-inner',  // Elementor internal
};

// WRONG: a CSS path (chain of selectors)
const group: Group = {
  selector: 'body > .elementor > section.elementor-section-1 > .e-con',
};
```

Use a single semantic selector. The detector is allowed to know
about `.elementor-` etc. (it produces the annotation from the source
page). The runtime is not.

### 6c. Invalid config

```ts
// WRONG: missing required field
const cta: ModuleInstance = {
  id: 'MI-cta-12',
  moduleId: 'M-cta',
  config: { text: 'Get started' },  // url is required, missing
  ...
};

// WRONG: wrong type
const cta: ModuleInstance = {
  id: 'MI-cta-12',
  moduleId: 'M-cta',
  config: { text: 'Get started', url: 'https://x.com', color: 'blue' },  // color must be #hex etc.
  ...
};

// WRONG: select value not in options
const cta: ModuleInstance = {
  id: 'MI-cta-12',
  moduleId: 'M-cta',
  config: { size: 'enormous' },  // options are small/medium/large
  ...
};
```

### 6d. Module instance with no module definition

```ts
// WRONG: moduleId doesn't exist in the canonical library
const cta: ModuleInstance = {
  id: 'MI-cta-12',
  moduleId: 'M-magic-button',  // not a real module
  ...
};
```

If `M-magic-button` doesn't exist in `moduleDefs`, the renderer
falls back to a generic "unknown module" view and the operator
can't edit it. The detector must only emit `moduleId` values that
have matching `ModuleDef` entries.

### 6e. Page-region-group module instance cross-references

```ts
// WRONG: page references region that doesn't exist
const home: Page = {
  id: 'p-home',
  regionIds: ['R-hero', 'R-ghost'],  // R-ghost never created
};

// WRONG: group references module instance that doesn't exist
const group: Group = {
  id: 'G-1',
  moduleInstanceId: 'MI-cta-12',  // never created
  ...
};

// WRONG: module instance references group that doesn't exist
const cta: ModuleInstance = {
  id: 'MI-cta-12',
  groupId: 'G-ghost',  // never created
  ...
};
```

The runtime validates these cross-references on load and surfaces
errors to the operator. But if you produce broken refs in the first
place, you've created work for everyone. Validate before emitting.

---

## 7. What enforces this contract

The contract is enforced at four layers, in increasing order of
strictness:

1. **The detector** — produces annotations from source pages. If
   the detector produces an invalid annotation, the operator sees
   "broken editor" on first load. The detector is allowed to know
   about specific page-builder class names (Elementor, EAEL, etc.)
   because that's its job — translating source DOM to FvCMS data.

2. **The store** — loads annotations and module definitions into
   IndexedDB. Should validate the annotation against the data model
   on load and reject with a clear error if invalid. See
   `runtime/load-annotation.js`.

3. **The editor** — operators interact through the editor UI. The
   editor should validate any operator-driven change before
   committing. See `runtime/form-editor.js`.

4. **The renderer** — reads FvCMS data and patches the live DOM.
   The renderer is the **most tolerant** layer. It accepts best-effort
   data and degrades gracefully. If a config is invalid, the renderer
   uses the module's `defaultConfig` and warns the operator. This is
   the same two-layer model the FES spec contract captures: the
   producer is strict, the consumer is tolerant.

For invariants, see `app-pact/invariants.md`. The grep-based
invariants (I-001, I-002, I-003) are machine-checkable and should
be added to the CI pipeline.

---

## 8. Note to a different model

If you are not GLM-4.7-flash — if you are a future GLM, a different
LLM entirely, or a fine-tune — the specific drift patterns described
in §6 (wrong id prefixes, framework selectors in the runtime, invalid
configs) may not be the exact ways you drift. You will drift, but
in different ways.

The contract rules in §1–§6 are model-agnostic. They are the shapes
the runtime requires, full stop. Whatever shape you produce, the
runtime will tolerate as much as it can and reject the rest.

If you produce shapes the runtime doesn't yet tolerate, the
operator will see broken edits. The right response is:

1. Add the new tolerance to the relevant runtime module and document
   it here in the same commit.
2. Add a forbidden-shape example to §6 so future models learn not
   to do it.
3. Tighten the detector's instructions (if it uses an LLM) so it
   actively produces the right shape.
4. Add a check to the store's loader so invalid annotations are
   rejected at load time.

The two-layer model is the invariant: the renderer is the contract,
the detector is the teaching, the validator is the gate, the doc
is the reference. Keep all four in sync.

---

## 9. Cross-references

- `schemas/data-model.md` — the source of truth for TypeScript types
- `app-pact/app-pact.md` — the package constitution (what the runtime
  is, what it isn't, the rules it follows)
- `app-pact/invariants.md` — the testable invariants (machine-checkable
  greps and assertions)
- `stubs/*.md` — parked features (templates, queries, content types)
  with their proposed shapes
- `app-fragments/fragments.md` — the per-feature contracts
- `runtime/*.js` — the implementation, with comments linking back to
  the rules

If you change the data model, update `schemas/data-model.md` first,
then this contract doc, then the implementation. Never change
implementation without updating both docs.

---

## 10. What to do if you break this contract

1. **Stop and read this doc.**
2. Add a test case that exercises the broken shape. Put it in
   `tests/fixtures/annotations/` with a clear filename
   (`broken-wrong-id-prefix.json` etc.).
3. Fix the producer (detector or AI editing step) so the shape
   comes out right. Update the detector's source-to-annotation
   mapping or the AI editing prompt.
4. If you can't fix the producer, fix the consumer (runtime) to
   tolerate the shape. Update this doc to record the new
   tolerance.
5. Re-run the broken fixture through the test harness. Confirm the
   invariant greps still pass.
6. Update the runtime stats and the PB deployment row if the
   runtime changed.

**Never ship a runtime that crashes on shapes the detector
produces.** The detector is a moving target; the runtime is the
contract.

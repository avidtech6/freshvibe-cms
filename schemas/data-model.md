# FreshVibe CMS — Data Model

**Status:** v1.0.0 — foundation document. Everything in the runtime
references these shapes. Do not rename fields without a migration plan.

## Layer cake

```
Source site (any stack)
    │ detected by
    ▼
Detector (stack-specific: Elementor / Shopify / raw HTML / ...)
    │ produces
    ▼
Annotation (regions, groups, module instances)
    │ stored in
    ▼
Store (IndexedDB, page-keyed)
    │ edited via
    ▼
Editor (panel, inline, skin switcher)
    │ consumes
    ▼
Renderer (the live site, updated from store)
```

The runtime sits at the **store + editor + renderer** layer. It does not
contain the words "Elementor", "WordPress", "Shopify", "Webflow", or
"Next.js" anywhere.

## Core types

### Region

A named, addressable area on a page. In the source site it corresponds
to a top-level container (`.e-con`, `<section>`, etc.). Regions are
**detected, not moved** by the runtime — they're the chrome.

```ts
type Region = {
  id: string;                    // "R-hero", "R-books", "R-friends"
  pageId: string;                // "p-home", "p-about"
  label?: string;                // "Hero" — display name in editor UI
  selector: string;              // CSS selector to locate on page
  order: number;                 // visual order on page (0-based)
  skin?: string;                 // optional per-region skin override

  // Per-region layout/style config — operator-editable
  config?: {
    background?: string;         // CSS background: e.g. '#fff', 'linear-gradient(...)'
    paddingX?: string;           // horizontal padding: e.g. '64px', '2rem'
    paddingY?: string;           // vertical padding
    maxWidth?: 'narrow' | 'normal' | 'wide' | 'full'; // content max-width preset
    textColor?: string;          // inherited text colour for this region
  };

  // Thread B (Oscar platform) hooks — unused in v1, present in v1 shape
  gating?: {
    level: 'free' | 'pro' | 'school';   // who can see this region
    until?: string;                      // ISO date — free preview until then
  };
  metadata?: Record<string, any>;        // open bag for future fields
};
```

### Group

A wrapper inside a region. Used for layout. May or may not be a module.

```ts
type Group = {
  id: string;                    // "G-1", "G-2"
  regionId: string;              // parent
  selector: string;              // CSS selector to locate
  order: number;                 // visual order within region
  isModule: boolean;             // MANUAL toggle in v1 — operator marks
  moduleInstanceId?: string;     // present iff isModule === true
  metadata?: Record<string, any>;
};
```

**The isModule rule:** the runtime does NOT auto-promote groups to
modules in v1. Operator toggles a group to be a module, then picks a
module type from the catalogue. Auto-detect may come later as a
suggestion, never automatic.

### Module definition (the type, not the instance)

A typed component with a schema. Lives in the canonical library.

```ts
type ModuleDef = {
  id: string;                    // "M-heading", "M-cta", "M-image"
  label: string;                 // "Heading"
  schema: ModuleSchema;          // typed field schema (see below)
  defaultConfig: any;            // default field values
  editor?: string;               // editor component id (optional)
  variants?: ModuleVariant[];    // named presets
  // Future:
  // gating?: ...;               // optional per-type gating
};

type ModuleSchema = {
  [fieldName: string]: FieldDef;
};

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
```

### Module instance

One actual occurrence of a module on a page. Lives in the annotation,
edited via the runtime.

```ts
type ModuleInstance = {
  id: string;                    // "MI-cta-12"
  moduleId: string;              // "M-cta"
  groupId: string;               // parent group
  selector: string;              // CSS selector to locate on page
  config: any;                   // current field values (must match schema)
  skin?: string;                 // optional per-instance skin override

  // Thread B hooks
  progress?: Record<string, number>;   // userId -> 0..1 progress
  gating?: {
    level: 'free' | 'pro' | 'school';
    until?: string;
  };
  metadata?: Record<string, any>;
};
```

### Skin

A named bundle of module defaults + CSS tokens. Applied at runtime.

```ts
type Skin = {
  id: string;                    // "skin-reign", "skin-buddYx"
  label: string;
  moduleDefaults: Record<string, any>;   // moduleId -> config overrides
  cssTokens: Record<string, string>;     // "--font-base": "..."
  metadata?: Record<string, any>;
};
```

### Page

A page is keyed by URL pathname. It contains regions.

```ts
type Page = {
  id: string;                    // "p-home", "p-about"
  pathname: string;              // "/", "/about/"
  label?: string;                // "Home"
  regionIds: string[];           // ordered
  activeSkin?: string;           // page-level skin override
  metadata?: Record<string, any>;
};
```

### Scope

A queryable address used by AI editing + UI navigation. The runtime
resolves a scope to a set of (region | group | module | field) targets.
This is the AI safety boundary.

```ts
type Scope =
  | { type: 'page', pageId: string }
  | { type: 'region', regionId: string }
  | { type: 'group', groupId: string }
  | { type: 'module', moduleInstanceId: string }
  | { type: 'field', moduleInstanceId: string, field: string };

// Operations allowed at each scope:
type ScopeOps = {
  read: boolean;          // can read
  rearrange: boolean;     // can move groups/modules within the scope
  editContent: boolean;   // can rewrite text/values inside the scope
  create: boolean;        // can create new groups/modules in the scope
  delete: boolean;        // can remove
};

// Example: at module scope, you can rearrange the module's fields
// but not its position in the page; at region scope, you can
// rearrange groups within the region but not edit other regions.
```

### Runtime context

Global state for the editor session. Present in v1 shape, even if some
fields are stubs.

```ts
type RuntimeContext = {
  page: Page | null;
  regions: Record<string, Region>;
  groups: Record<string, Group>;
  modules: Record<string, ModuleInstance>;
  moduleDefs: Record<string, ModuleDef>;   // loaded from canonical library
  skins: Record<string, Skin>;
  activeSkin: string | null;
  currentUser?: {                          // optional, populated by auth
    id: string;
    role: 'admin' | 'editor' | 'teacher' | 'learner' | 'guest';
  };
  scopes: Record<string, ScopeOps>;        // computed per scope
};
```

## What v1 implements vs what v1 just has shape for

| Concept | v1 implementation | v1 shape |
|---|---|---|
| Region | full | ✓ |
| Group | full | ✓ |
| Module def | 3 (Heading, CTA, Image) | ✓ |
| Module instance | full | ✓ |
| Skin | full | ✓ |
| Scope | full (resolve + ops) | ✓ |
| Page | full | ✓ |
| Region.gating | **not in UI** | ✓ |
| Region.metadata | **not in UI** | ✓ |
| Module.progress | **not in UI** | ✓ |
| Module.gating | **not in UI** | ✓ |
| Module.metadata | **not in UI** | ✓ |
| Runtime.currentUser | **stub** (no auth yet) | ✓ |

Adding Thread B features later = filling in implementations, not
reshaping the data.

## What "stack-agnostic" means concretely

The runtime imports NOTHING from a specific stack. It does not know
class names. It does not parse HTML structure to identify modules —
that is the detector's job.

The detector knows everything about the stack (Elementor class names,
EAEL class names, Shopify Liquid output, etc.) and produces
**annotation** that conforms to the shapes above.

A new stack = a new detector. No runtime change.
# FES spec contract — for any AI generating or consuming FES modules

**Date written:** 2026-07-17 (locked after the broken `theme-post-content`
spec was discovered in production)
**Audience:** Any AI (current model, future model, fine-tune, human
auditor) that generates, validates, renders, or audits FreshVibe
Extracted Spec (FES) modules. Especially the GLM worker that produces
them and the FES inspector dispatcher that renders them.

This document exists because **GLM-4.7-flash drifts when modules get
large.** On small modules (heading, button — 3-5 controls) it follows
the convention. On big modules (post-content — 30 controls) it
shortcuts: bare type-name strings for `fieldSchema`, raw primitive
names like `HEADING_FONT_FAMILY` in `inspector.Style`, and
inconsistent id vs `name` fields. This drift breaks the dispatcher,
which then shows the operator "HEADING_FONT_FAMILY" as a label inside
a text input. The contract below is the strict shape the FES worker
MUST produce and the dispatcher MUST tolerate.

If you are an AI modifying either the worker or the dispatcher, read
this first and follow the rules exactly.

## What is FES?

FreshVibe Extracted Spec (FES) is the canonical recipe format produced
by the FES worker from raw page-builder widgets (Elementor, EAEL, etc.)
and consumed by the FES inspector dispatcher. A FES spec describes one
module type (e.g. "heading", "button", "post-content") with a schema,
default config, and the inspector form the operator sees in the FreshVibe
chrome.

The FES worker is the only producer. The FES inspector dispatcher is
the only consumer. Both are linked from this doc in §6 and §7.

---

## 1. Top-level shape

```jsonc
{
  "moduleType": "M-...",          // REQUIRED, "M-" prefix, kebab-or-snake
  "fieldSchema": { ... },         // REQUIRED, see §2
  "sourceAdapter": { ... },       // OPTIONAL, maps canonical fields to source fields
  "inspector": {                  // REQUIRED, see §3
    "Settings": [...],
    "Style": [...],
    "Advanced": [...]
  },
  "demoConfig": { ... },          // OPTIONAL, sample values for previews
  "metadata": { ... },            // OPTIONAL, provenance
  "wcpPrimitivesUsed": [...],     // FILLED BY compose_wcp() — don't pre-fill
  "wcpVersion": "...",            // FILLED BY compose_wcp() — don't pre-fill
  "provenance": { ... }           // FILLED BY worker — don't pre-fill
}
```

The four top-level fields `moduleType`, `fieldSchema`, `inspector` are
**always required**. The `wcpPrimitivesUsed` / `wcpVersion` / `provenance`
keys are filled in by `FESWorker.compose_wcp()` after the LLM call —
do not pre-fill them in the prompt output.

---

## 2. `fieldSchema` rules

**Every value MUST be an object with at least `{type, label}`.**

| Form | Example | Status |
|---|---|---|
| `{"title": {"type": "string", "label": "Title"}}` | ✓ correct |
| `{"title": {"type": "select", "label": "Tag", "options": [...]}}` | ✓ correct (with options) |
| `{"title": {"type": "media", "label": "Image", "source": "image.url"}}` | ✓ correct (with source hint) |
| `{"title": "String"}` | ✗ **FORBIDDEN** — bare type string |
| `{"title": "Select(content, excerpt)"}` | ✗ **FORBIDDEN** — type signature as string |
| `{"title": {"source": "text"}}` | ✗ **FORBIDDEN** — missing type+label |
| `{"title": {"label": "Title"}}` | ✗ **FORBIDDEN** — missing type |
| `{"title": {"type": "string"}}` | ✗ **FORBIDDEN** — missing label |

The dispatcher's fallback handles a missing label by synthesising one from
the key name (e.g. `HEADING_FONT_FAMILY` → "Heading Font Family"), but you
should not rely on that — write the label explicitly.

The `type` field is one of: `string`, `text`, `textarea`, `select`, `choose`,
`number`, `size`, `slider`, `dimensions`, `boolean`, `switch`, `color`,
`media`, `link`, `url`, `repeater`, `typography`, `background`, `border`,
`box_shadow`, `text_shadow`, `motion_effects`, `responsive_visibility`,
`css_classes`, `custom_css`, `additional_classes`.

For `select` / `choose`, the value MUST have an `options: [{value, label}]`
array. Options without `value` or `label` are invalid.

---

## 3. `inspector` rules

The `inspector` object has three tabs: `Settings`, `Style`, `Advanced`.
Each tab's value is an array of control specs. **Each control spec is
EITHER a full inline object OR a string ref to a `fieldSchema` key.**

### 3a. Inline object form (preferred)

```jsonc
{
  "id": "title",                  // REQUIRED — settings key
  "type": "string",               // REQUIRED — renderer type
  "label": "Heading Text",        // REQUIRED — display name
  "binding": "title_text",        // OPTIONAL — overrides settings key
  "default": "Hello",             // OPTIONAL — default value
  "options": [{ "value": "h1", "label": "H1" }, ...]  // OPTIONAL, for select
}
```

The dispatcher also tolerates these alternative field names (GLM drifts
between them — keep the renderer tolerant):

| Canonical | Accepted alternatives | Used for |
|---|---|---|
| `id` | `name`, `wcp_id`, `key`, `_fieldName` | settings key |
| `type` | `primitive`, `wcp_id` | renderer type |
| `label` | (synthesised from id if missing) | display name |

The dispatcher lowercases `type` before matching renderers, so
`TYPOGRAPHY` and `typography` and `Typography` all map to the same
control. You should still use lowercase to be consistent.

### 3b. String ref form

```jsonc
"title"   // refers to fieldSchema.title
```

The string ref must be lowercase. It must have a corresponding
`fieldSchema[key]` entry, and that entry must be a proper object (not a
bare type string). Use this form for fields that are clearly reusable
primitives (text, media, link). Use inline objects for local-to-this-
module controls.

**Do not** use WCP composite primitive names as string refs.
`"TYPOGRAPHY"`, `"BORDER"`, `"BOX_SHADOW"`, `"MOTION_EFFECTS"` etc. are
**single composite controls** — the renderer expands them into many
sub-controls at render time. Never decompose them into their sub-fields.

### 3c. Style tab requirements

**The Style tab MUST have at least 8 controls.** Each control should be
a WCP composite primitive (typography, background, border, box_shadow,
color, hover_effects, dimensions, text_shadow). No exceptions — even
simple widgets like dividers and titles get the full 8-control treatment.

The validator rejects specs with fewer than 8 Style controls. If you are
the worker, do not produce such specs. If you are a human reviewing
output, re-prompt the worker.

### 3d. Advanced tab requirements

The Advanced tab must include at least: `motion_effects`,
`responsive_visibility`, `css_classes`. `custom_css` is optional but
recommended for custom-widget types.

### 3e. Forbidden inspector patterns

```jsonc
// WRONG: raw primitive name as a string ref
"inspector": {
  "Style": ["HEADING_FONT_FAMILY", "HEADING_FONT_SIZE", "HEADING_FONT_WEIGHT"]
}

// WRONG: decomposed sub-fields
"inspector": {
  "Style": [
    {"name": "font_family", "label": "Font Family"},
    {"name": "font_size", "label": "Font Size"}
  ]
}

// WRONG: mixed conventions
"inspector": {
  "Settings": [
    {"name": "title"},         // use 'id' or 'name' consistently per item
    {"key": "content"}         // 'key' is not a recognised alias
  ]
}
```

---

## 4. Worked example — correct shape

This is the `heading-default` spec, hand-curated from a real Elementor
heading widget. **Every spec should match this structure.**

```jsonc
{
  "moduleType": "M-heading",
  "fieldSchema": {
    "title": {
      "source": "text",
      "type": "string",
      "label": "Heading Text"
    },
    "tag": {
      "source": "type",
      "type": "select",
      "label": "Tag",
      "options": [
        {"value": "h1", "label": "H1"},
        {"value": "h2", "label": "H2"},
        {"value": "h3", "label": "H3"},
        {"value": "h4", "label": "H4"},
        {"value": "h5", "label": "H5"},
        {"value": "h6", "label": "H6"}
      ]
    }
  },
  "sourceAdapter": {
    "text": "title",
    "type": "tag"
  },
  "inspector": {
    "Settings": [
      {"id": "title", "type": "string", "label": "Heading Text"},
      {"id": "tag", "type": "select", "label": "Tag", "options": [
        {"value": "h1", "label": "H1"},
        {"value": "h2", "label": "H2"}
      ]}
    ],
    "Style": [
      {"id": "title_typography", "type": "typography", "label": "Title Typography", "binding": "title"},
      {"id": "title_color", "type": "color", "label": "Title Color", "binding": "title"},
      {"id": "title_background", "type": "background", "label": "Title Background", "binding": "title"},
      {"id": "title_alignment", "type": "select", "label": "Title Alignment", "options": [
        {"value": "left", "label": "Left"},
        {"value": "center", "label": "Center"},
        {"value": "right", "label": "Right"}
      ]},
      {"id": "title_border", "type": "border", "label": "Title Border", "binding": "title"},
      {"id": "title_box_shadow", "type": "box_shadow", "label": "Title Box Shadow", "binding": "title"},
      {"id": "title_text_shadow", "type": "text_shadow", "label": "Title Text Shadow", "binding": "title"},
      {"id": "title_hover_effects", "type": "hover_effects", "label": "Title Hover Effects", "binding": "title"}
    ],
    "Advanced": [
      {"id": "motion", "type": "motion_effects", "label": "Motion Effects"},
      {"id": "responsive", "type": "responsive_visibility", "label": "Responsive Visibility"},
      {"id": "css_classes", "type": "css_classes", "label": "CSS Classes"},
      {"id": "custom_css", "type": "custom_css", "label": "Custom CSS"}
    ]
  },
  "demoConfig": {
    "title": "Welcome",
    "tag": "h1"
  },
  "metadata": {
    "sourcePlugin": "elementor",
    "widgetType": "heading.default",
    "instanceCount": 1
  }
}
```

Note: 8 Style controls, 4 Advanced controls, fieldSchema values are all
proper objects, inspector items are all proper objects (no string refs
needed for this simple module), `wcpPrimitivesUsed` and `provenance`
are NOT pre-filled.

---

## 5. Anti-example — the broken shape we keep seeing

This is roughly what GLM-4.7-flash produced for `theme-post-content` on
2026-07-16. **Never produce this.**

```jsonc
{
  "moduleType": "M-post-block",
  "fieldSchema": {
    "content_text": "String",                              // ✗ bare type string
    "content_type": "Select(content, excerpt)",            // ✗ type signature
    "heading_level": "Number",                             // ✗ bare type string
    "show_date": "Boolean",                                // ✗ bare type string
    "show_image": "Boolean"                                // ✗ bare type string
  },
  "inspector": {
    "Settings": [
      "content_type",        // string ref to fieldSchema.content_type
                              // which is a bare string — broken lookup
      "heading_level",       // same problem
      "show_image",
      "show_date"
    ],
    "Style": [
      "HEADING_FONT_FAMILY",  // ✗ raw primitive name, not a control
      "HEADING_FONT_SIZE",    // ✗ same
      "HEADING_FONT_WEIGHT",  // ✗ same — these 5 should be ONE
                                // typography control
      "HEADING_COLOR",
      "HEADING_MARGIN",
      "CONTENT_FONT_FAMILY",  // ✗ same pattern repeated for content
      "CONTENT_FONT_SIZE",
      // ... 18 items like this
    ],
    "Advanced": [
      "ANIMATION_TYPE",       // ✗ raw primitive name
      "DESKTOP_VISIBLE",      // ✗ decomposed responsive_visibility
      "TABLET_VISIBLE",
      "MOBILE_VISIBLE",
      "ADDITIONAL_CLASSES",
      "CSS_SELECTOR"
    ]
  }
}
```

This spec passed JSON parsing but rendered with labels like
`"HEADING_FONT_FAMILY"`, `"CONTENT_TYPE"`, and 18 text inputs instead
of 4 composite WCP controls.

---

## 6. Worker prompt template (for any AI generating FES specs)

The exact prompt that produces correct specs (locked 2026-07-17 after the
broken-shape incident):

```
SYSTEM:
You are the FreshVibe Recipe Extractor (FES). You produce canonical FvCMS
modules from raw page-builder widgets.

AVAILABLE WCP PRIMITIVES (composite controls that expand at render time):
[TYPOGRAPHY, COLOR, BACKGROUND, BORDER, BOX_SHADOW, TEXT_SHADOW, DIMENSIONS,
 MEDIA, ICON, LINK, MOTION_EFFECTS, RESPONSIVE_VISIBILITY, CSS_CLASSES,
 CUSTOM_CSS, HOVER_EFFECTS, ALIGNMENT]

EXISTING CANONICAL MODULES: M-testimonial, M-heading, M-paragraph, M-button,
 M-image, ...

=== OUTPUT SHAPE CONTRACT ===
[full §1-§3 of this doc, abbreviated]

1. fieldSchema values MUST be objects with {type, label, options?}.
2. inspector items are EITHER full inline objects with {id, type, label}
   OR string refs to fieldSchema keys.
3. Style/Advanced controls must use WCP primitive types as SINGLE controls.
   Never decompose a primitive (e.g. do NOT list HEADING_FONT_FAMILY,
   HEADING_FONT_SIZE, HEADING_FONT_WEIGHT as three items — list ONE
   typography control instead).
4. Style tab: at least 8 controls using WCP primitives.
5. Advanced tab: motion_effects, responsive_visibility, css_classes.
6. If config is empty, infer fields from widget type semantics.
7. Output JSON only.

=== WORKED EXAMPLE (correct shape) ===
[embed a correct spec from §4 here, abbreviated]

=== ANTI-EXAMPLE (FORBIDDEN SHAPES) ===
[embed the broken shape from §5 here]

USER:
Build canonical module for this widget.
WIDGET TYPE: {wtype}
SOURCE CONFIG: {config}

Return JSON in this exact shape: {moduleType, fieldSchema, sourceAdapter,
inspector:{Settings,Style,Advanced}, demoConfig, metadata}.

CRITICAL REMINDERS:
- fieldSchema values are OBJECTS, not bare type names.
- inspector items are OBJECTS with at least id+type+label, OR string refs.
- WCP primitive names (typography, border, etc.) are SINGLE controls, not split apart.
- At least 8 Style controls using WCP primitives. No exceptions.

Output ONLY the JSON object. No markdown fences, no prose.
```

The current implementation lives at
`/workspace/fvsf-fes/worker/fes_worker.py`, method `FESWorker.build_fes_prompt`.

---

## 7. Dispatcher tolerance contract (for any AI modifying the renderer)

The dispatcher at
`/workspace/oscar-fresh-dist-organized/app-fragments/oscar-fes-inspector/oscar-inspector-dispatcher.js`
MUST tolerate the following shapes:

- Inline control objects with any of: `id`, `name`, `wcp_id`, `key`,
  `_fieldName` for the settings key.
- Inline control objects with any of: `type`, `primitive`, `wcp_id` for
  the renderer hint.
- String refs to `fieldSchema` keys, lowercased.
- `fieldSchema` values that are bare type-name strings ("String",
  "Number", "Boolean", "Select(content, excerpt)") — treat them as
  type-only and synthesise a label from the key.
- `fieldSchema` keys with no matching `inspector` item — synthesise a
  text input.
- `inspector` items with no matching `fieldSchema` key — synthesise
  label from the item name.
- Mixed-case types (lowercase before matching).
- WCP primitives not yet rendered (motion_effects, responsive_visibility,
  css_classes) — render inline mini-forms.

If you are an AI modifying the dispatcher, **add new tolerance before
you change the prompt or worker**. Every shape the operator sees as
broken text input is a shape the renderer doesn't tolerate. Tightening
the renderer only makes the operator's experience worse; tolerating
more shapes makes it work.

---

## 8. Validator

The worker has `FESWorker.validate_fes_shape(fes_output)` which returns
a list of human-readable violation messages. Call it after every LLM
response. Reject and re-prompt on violation. The full rule set is in
the source. If you are an AI adding a new rule to the contract, add
the corresponding check to `validate_fes_shape()` and document it
here in the same commit.

---

## 9. Reference shapes (canonical, verified)

These are the modules in `/workspace/oscar-fresh-dist-organized/app-fragments/fes-modules/`
that pass validation as of 2026-07-17:

- `animated-headline-default.json` — 21 Style + 0 Advanced (animated-headline is special)
- `heading-default.json` — 8 Style + 4 Advanced, full inline objects
- `shortcode-default.json` — 8 Style + 4 Advanced
- `template-default.json` — 8 Style + 4 Advanced

The remaining 17 modules have shape issues that the dispatcher tolerates
but that the worker should not be producing. They are tracked in the
regen batch at `/workspace/fvsf-fes/worker/regen-batch.json` and the
pre-regen outputs are preserved at
`/workspace/fvsf-fes/outputs/phase4-batch-pre-regen-2026-07-17/` for diffing.

---

## 10. What to do if you break this contract

1. **Stop and read this doc.**
2. Add a test case to `/workspace/fvsf-fes/worker/regen-batch.json` that
   exercises the broken shape.
3. Fix the producer (worker prompt) so the shape comes out right. Add
   the rule to `validate_fes_shape()` so it can't happen again.
4. If you can't fix the producer, fix the renderer to tolerate the
   shape. Update §3 or §7 here to document the new tolerance.
5. Re-run the broken modules through the worker with the new prompt.
6. Update the worker stats and the PB deployment row.

**Never ship a dispatcher that breaks for shapes the LLM produces.**
The LLM is a moving target; the renderer is the contract.

## 11. Note to a different model

If you are not GLM-4.7-flash — if you are a future GLM, a different
LLM entirely, or a fine-tune of any of them — the specific drift
patterns described in this doc (bare type-name strings, raw primitive
names in `inspector.Style`, mixed `id`/`name` field conventions) may
not be the exact ways you drift. You will drift, but in different
ways.

The contract rules in §1–§3 are model-agnostic. They are the shape
that the renderer requires, full stop. Whatever shape you produce,
the renderer will tolerate as much as it can (see §7 for the current
tolerance list) and will reject the rest.

If you are a new model and you produce shapes the renderer doesn't
yet tolerate, the operator will see broken output. The right response
is:

1. Add the new shape to `normalizeCtrl()` in the dispatcher and
   document the tolerance in §7.
2. Add a forbidden-shape example to §5 so future models learn not
   to do it.
3. Tighten the worker prompt in §6 to actively instruct against the
   new shape.
4. Add a check to `validate_fes_shape()` so the worker rejects
   malformed output before saving.

The two-layer model is the invariant: the renderer is the contract,
the prompt is the teaching, the validator is the gate, the doc is the
reference. Keep all four in sync.

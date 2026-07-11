// app-fragments/editor-outline/index.js
//
// Public API surface for the outline module.
// Per FreshVibe Way V8 §10 + app-pact §3.9: a module's public API
// lives in its index.js. Cross-module imports go through this file,
// not through runtime.js.
//
// DO NOT import from '../runtime/outline.js' directly from another
// module. Always import from '../editor-outline/index.js' (or this
// path). This keeps outline implementation private to this folder.

export {
  startOutlines,
  stopOutlines,
  isOutlinesActive,
  refreshOutlines,
  _resetOutlineForTest,
} from '../../runtime/outline.js';

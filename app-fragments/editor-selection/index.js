// app-fragments/editor-selection/index.js
//
// Public API surface for the selection module.
// Per FreshVibe Way V8 §10 + app-pact §3.9: a module's public API
// lives in its index.js. Cross-module imports go through this file,
// not through runtime.js.
//
// DO NOT import from '../runtime/selection.js' directly from another
// module. Always import from '../editor-selection/index.js' (or this
// path). This keeps selection implementation private to this folder.

export {
  getSelection,
  _resetSelection,
} from '../../runtime/selection.js';

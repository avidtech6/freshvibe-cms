// app-fragments/editor-navigator/index.js
//
// Public API surface for the navigator module.
// Per FreshVibe Way V8 §10 + app-pact §3.9: a module's public API
// lives in its index.js. Cross-module imports go through this file,
// not through runtime.js.
//
// DO NOT import from '../runtime/navigator.js' directly from another
// module. Always import from '../editor-navigator/index.js' (or this
// path). This keeps navigator implementation private to this folder.

export {
  buildNavigator,
  mountNavigator,
  refreshNavigator,
  _resetNavigatorForTest,
} from '../../runtime/navigator.js';

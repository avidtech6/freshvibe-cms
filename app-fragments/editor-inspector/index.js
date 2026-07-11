// app-fragments/editor-inspector/index.js
//
// Public API surface for the inspector module.
// Per FreshVibe Way V8 §10 + app-pact §3.9: a module's public API
// lives in its index.js. Cross-module imports go through this file,
// not through runtime.js.
//
// DO NOT import from '../runtime/editor-shell.js' directly from another
// module. Always import from '../editor-inspector/index.js' (or this
// path). This keeps inspector implementation private to this folder.

export {
  openEditorShell,
  closeEditorShell,
  _resetInspectorForTest,
} from '../../runtime/editor-shell.js';

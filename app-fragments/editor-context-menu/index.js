// app-fragments/editor-context-menu/index.js
//
// Public API surface for the context menu module.
// Per FreshVibe Way V8 §10 + app-pact §3.9: a module's public API
// lives in its index.js. Cross-module imports go through this file,
// not through runtime.js.
//
// DO NOT import from '../runtime/context-menu.js' directly from another
// module. Always import from '../editor-context-menu/index.js' (or this
// path). This keeps context-menu implementation private to this folder.

export {
  openContextMenu,
  closeContextMenu,
  isContextMenuOpen,
  _resetContextMenuForTest,
} from '../../runtime/context-menu.js';

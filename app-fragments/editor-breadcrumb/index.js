// app-fragments/editor-breadcrumb/index.js
//
// Public API surface for the breadcrumb module.
// Per FreshVibe Way V8 §10 + app-pact §3.9: a module's public API
// lives in its index.js. Cross-module imports go through this file,
// not through runtime.js.
//
// DO NOT import from '../runtime/breadcrumb.js' directly from another
// module. Always import from '../editor-breadcrumb/index.js' (or this
// path). This keeps breadcrumb implementation private to this folder.

export {
  mountBreadcrumb,
  unmountBreadcrumb,
  isBreadcrumbMounted,
  _resetBreadcrumbForTest,
} from '../../runtime/breadcrumb.js';

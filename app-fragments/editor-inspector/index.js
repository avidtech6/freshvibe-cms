// editor-inspector — the world-class form renderer + namespace bridge.
// Per fragment.md: opens as a PanelManager panel when a module is selected.
// This index.js exposes the canonical v2 form renderer + the FES_V2_INSPECTOR
// namespace that the legacy oscar-fes-inspector dispatcher looks for.

export { v2Inspect, adaptSpecForV2, ensureShell } from './v2-inspector.js';
export { default as openV2 } from './open-v2.js';

// Side-effect import: installs window.FES_V2_INSPECTOR when the page loads this file
import './open-v2.js';

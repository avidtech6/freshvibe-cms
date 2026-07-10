// runtime/selection.js — central selection state (fragment.editor-selection)
//
// Single source of truth for what the user is currently focused on
// in the frontend editor. Other fragments (outline, inspector,
// navigator, breadcrumb, context-menu) read from and write to this.
//
// Per fragment contract app-fragments/editor-selection/fragment.md.
// Per V8 §10.1, selection is a behaviour cluster: removing any one of
// {get, set, subscribe, history, multi-kind} would break the editor's value.
//
// Per app-pact §3.1 Layer A: this file MUST NOT contain framework names.
// Per app-pact §3.4: this file touches only its own DOM hooks (the
// data-* attributes on <body>). It does NOT read or mutate host DOM.
// Per invariants.md I-009: host-specific glue stays in the consumer app.

const HISTORY_CAP = 20;

function createSelection() {
  const state = {
    current: null,            // { kind, id } | null
    history: [],              // [{ kind, id, at }, ...] — capped at HISTORY_CAP
    listeners: new Set(),     // (state, prev) => void
  };

  function sameSelection(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.kind === b.kind && a.id === b.id;
  }

  function syncDom(prev) {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (!body) return;
    if (state.current) {
      body.dataset.fvcmsSelectedKind = state.current.kind;
      body.dataset.fvcmsSelectedId = state.current.id;
    } else {
      delete body.dataset.fvcmsSelectedKind;
      delete body.dataset.fvcmsSelectedId;
    }
    // CSS animation pulse on change — uses the existing
    // .oscar-just-updated class. Remove after 800ms.
    body.classList.remove('oscar-just-updated');
    // force reflow so re-adding the class restarts the animation
    void body.offsetWidth;
    body.classList.add('oscar-just-updated');
  }

  function notify(prev) {
    for (const fn of state.listeners) {
      try { fn(state.current, prev); } catch (e) {
        console.error('[freshvibe-cms] selection listener error:', e);
      }
    }
  }

  function select({ kind, id } = {}) {
    if (kind == null && id == null) {
      return clear();
    }
    if (typeof kind !== 'string' || typeof id !== 'string' || !id) {
      console.warn('[freshvibe-cms] select() requires { kind, id } both as non-empty strings');
      return;
    }
    const next = { kind, id };
    if (sameSelection(state.current, next)) return;
    const prev = state.current;
    state.current = next;
    state.history.push({ ...next, at: Date.now() });
    if (state.history.length > HISTORY_CAP) {
      state.history.splice(0, state.history.length - HISTORY_CAP);
    }
    syncDom(prev);
    notify(prev);
  }

  function clear() {
    if (state.current === null) return;
    const prev = state.current;
    state.current = null;
    syncDom(prev);
    notify(prev);
  }

  function undo() {
    // Pop the most recent entry; that becomes the new current.
    // (Invariant 7: undo does not cross kinds — popping a module
    // selection from history returns to whatever was before, which
    // could be a region or null.)
    if (state.history.length === 0) return;
    const popped = state.history.pop();
    const prev = state.current;
    // The popped entry is the current selection (we always push on select).
    // The new current is whatever was in history before it.
    const next = state.history.length > 0
      ? (() => {
          const last = state.history[state.history.length - 1];
          return { kind: last.kind, id: last.id };
        })()
      : null;
    state.current = next;
    syncDom(prev);
    notify(prev);
    return popped;
  }

  function get() {
    return state.current;
  }

  function onChange(fn) {
    if (typeof fn !== 'function') return () => {};
    state.listeners.add(fn);
    return () => state.listeners.delete(fn);
  }

  function withSelection(fn) {
    return fn(state.current);
  }

  // Custom event bridge so non-React / non-module consumers can listen
  // without importing this file directly.
  function dispatchDom(prev) {
    if (typeof document === 'undefined') return;
    document.dispatchEvent(new CustomEvent('fvcms:selection-change', {
      detail: { current: state.current, previous: prev },
    }));
  }

  // Wire the DOM event into the notify chain
  state.listeners.add(dispatchDom);

  return {
    get state() { return state; },
    get current() { return state.current; },
    select,
    clear,
    undo,
    get,
    onChange,
    withSelection,
  };
}

// Singleton — exposed as window.FreshVibeCmsSelection
let _selection = null;

export function getSelection() {
  if (!_selection) {
    _selection = createSelection();
    if (typeof window !== 'undefined') {
      window.FreshVibeCmsSelection = _selection;
    }
  }
  return _selection;
}

// For tests / reset
export function _resetSelection() {
  _selection = createSelection();
  if (typeof window !== 'undefined') {
    window.FreshVibeCmsSelection = _selection;
  }
  return _selection;
}
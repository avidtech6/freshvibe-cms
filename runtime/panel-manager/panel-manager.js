// Panel Manager v2 — dock-based system (forked from oscar-panel-manager, fvcms-pm-* prefix)
//
// Mental model:
//   - A Dock is a thin black strip on one of 4 screen edges (max 45px wide).
//   - Each dock has 0..N pills (one per docked panel).
//   - Each pill has 2 visual states: collapsed (just the green button) and
//     active (panel content sits full-height next to the dock).
//   - Only ONE pill per dock is active at any time.
//   - Dock disappears when its last pill leaves.
//   - Drag a floating panel to an edge -> dock appears, panel becomes a pill.
//
// API:
//   const mgr = window.PanelManager.create(opts);
//   mgr.addPanel({id, title, content, icon}) -> panel state
//   mgr.removePanel(id)
//   mgr.activate(id)        // expand this panel on its dock (others collapse)
//   mgr.collapse(id)        // collapse active panel on its dock back to a pill
//   mgr.detach(id)          // remove from dock, becomes floating
//   mgr.dock(id, edge)      // move floating panel to a dock edge
//   mgr.list()              // {panels: [...], docks: {left, right, top, bottom}}

(function () {
  'use strict';

  // ---------- utilities ----------

  function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function uid() {
    return 'p-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
  }

  function elFromHTML(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function panelToast(msg) {
    var t = document.getElementById('fvcms-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.__oscarToastTimer);
    window.__oscarToastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  // ---------- DockManager ----------

  const DOCK_WIDTH = 16;          // CSS px wide on vertical edges (matches unslimmed pill)
  const DOCK_HEIGHT = 44;         // CSS px tall on horizontal edges
  const EDGES = ['left', 'right', 'top', 'bottom'];

  function DockManager(opts) {
    this.opts = opts || {};
    this.panels = {};   // id -> PanelState
    this.docks = {};    // edge -> Dock (only present when non-empty)
    this.lastUsedEdge = null;  // last edge used for docking (for smart dock from floating)
    this.containerEl = null;  // single root <div> that holds all dock DOM
    this.dragState = null;
    this._init();
  }

  DockManager.prototype._init = function () {
    // Single container for all dock DOM. Sits at the end of <body>.
    this.containerEl = document.createElement('div');
    this.containerEl.className = 'fvcms-dock-root';
    document.body.appendChild(this.containerEl);
  };

  // ---------- public API ----------

  DockManager.prototype.addPanel = function (panelOpts) {
    const id = panelOpts.id || uid();
    if (this.panels[id]) return this.panels[id];
    const panel = {
      id: id,
      title: panelOpts.title || 'Panel',
      icon: panelOpts.icon || null,           // small icon string (HTML allowed)
      content: panelOpts.content || '',      // string HTML or HTMLElement
      state: 'floating',                       // floating | docked-collapsed | docked-active | hidden
      dockEdge: null,
      position: panelOpts.position || { x: 80, y: 80, w: 380, h: 480 },
      isFocused: false,                        // operator's current focus within in-play panels
      onClose: panelOpts.onClose || null
    };
    this.panels[id] = panel;
    // Create the panel's floating DOM (only used when floating)
    this._ensurePanelEl(panel);
    this._renderPanelState(panel);
    return panel;
  };

  DockManager.prototype.removePanel = function (id) {
    const panel = this.panels[id];
    if (!panel) return;
    // Remove from dock if docked
    if (panel.dockEdge) {
      this._removePillFromDock(panel.dockEdge, id);
    }
    // Remove floating DOM
    if (panel.el && panel.el.parentNode) panel.el.parentNode.removeChild(panel.el);
    delete this.panels[id];
  };

  DockManager.prototype.list = function () {
    const self = this;
    return {
      panels: Object.values(this.panels).map(function (p) {
        return { id: p.id, title: p.title, state: p.state, dockEdge: p.dockEdge };
      }),
      docks: EDGES.reduce(function (acc, e) {
        acc[e] = self.docks[e] ? self.docks[e].pills.slice() : null;
        return acc;
      }, {})
    };
  };

  DockManager.prototype.activate = function (id) {
    const panel = this.panels[id];
    if (!panel) return;
    // The model the operator wants:
    //   - Multiple panels can be in-play (docked-active) at the
    //     same time. Both their pills and panels are visible.
    //   - One of those in-play panels is the operator's current
    //     FOCUS (the one they're typing in right now).
    //   - Clicking an in-play panel's pill/header while it IS
    //     the focus collapses that panel to a parked pill
    //     (docked-collapsed, hidden). Its pill slims down.
    //   - Clicking a parked pill activates it (becomes the
    //     new focus, panel is shown).
    //   - Clicking another in-play (but not focused) panel
    //     just shifts focus to that one; nothing collapses.

    if (panel.state === 'docked-active') {
      if (panel.isFocused) {
        // Already focused + active: treat as a hide-this-panel
        // request — collapse to parked pill.
        this.collapse(id);
        return;
      }
      // Already in-play but not focused: just shift focus.
      this._setFocus(panel);
      this._refreshDockAfterFocus(panel);
      return;
    }

    if (panel.state === 'docked-collapsed') {
      // Parked pill clicked — bring the panel in to play.
      panel.state = 'docked-active';
      this._setFocus(panel);
      this._renderPanelState(panel);
      const dock = this.docks[panel.dockEdge];
      if (dock) this._updateDockPills(dock);
      return;
    }

    // If floating, dock it first. Prefer the panel's remembered
    // home edge so it returns to the same dock it came from,
    // otherwise default to left. dock() already sets state to
    // docked-active and focuses, so no need to call activate().
    if (panel.state === 'floating') {
      const home = (panel.dockEdge === 'right') ? 'right' : 'left';
      this.dock(id, home);
      return;
    }

    // If hidden, dock to the remembered edge (no focus tweak)
    if (panel.state === 'hidden') {
      const home = (panel.dockEdge === 'right') ? 'right' : 'left';
      this.dock(id, home);
    }
  };

  // Mark a single panel as the operator's current focus. Other
  // in-play panels remain in-play but lose the focus badge.
  // Mark a panel as the operator's current focus AND collapse any
  // other docked-active panel on the same edge. The previously
  // focused panel becomes docked-collapsed (slim pill) — so on
  // each edge, only one panel is "shown" at a time. Panels on
  // different edges are not affected.
  DockManager.prototype._setFocus = function (panel) {
    Object.keys(this.panels).forEach(function (pid) {
      const p = this.panels[pid];
      if (!p) return;
      const wasFocused = p.isFocused;
      p.isFocused = (p === panel);
      // If we're focusing a different panel on the same edge and the
      // previously focused panel was docked-active, collapse it.
      if (!p.isFocused && wasFocused && p.dockEdge && p.dockEdge === panel.dockEdge
          && p.state === 'docked-active') {
        p.state = 'docked-collapsed';
        this._renderPanelState(p);
      }
    }.bind(this));
  };

  // Re-render the dock's pills (so colours update after a focus
  // shift) and also nudge any cross-edge docks so the new focused
  // panel's pill is reflected.
  DockManager.prototype._refreshDockAfterFocus = function (panel) {
    Object.keys(this.docks).forEach(function (edge) {
      const dock = this.docks[edge];
      if (dock) this._updateDockPills(dock);
    }.bind(this));
  };

  DockManager.prototype.collapse = function (id) {
    const panel = this.panels[id];
    if (!panel) return;
    // Smart collapse: if floating, dock it to the nearest edge first
    // (or the most recently used edge if there's a tie), then collapse.
    if (panel.state === 'floating') {
      const edge = this._pickSmartDockEdge(panel);
      this.dock(id, edge);
      // dock() leaves it active; collapse to pill now
      panel.state = 'docked-collapsed';
      this._renderPanelState(panel);
      const dock = this.docks[panel.dockEdge];
      if (dock) this._updateDockPills(dock);
      return;
    }
    if (panel.state !== 'docked-active') return;
    panel.state = 'docked-collapsed';
    panel.isFocused = false;
    this._renderPanelState(panel);
    const dock = this.docks[panel.dockEdge];
    if (dock) this._updateDockPills(dock);
  };

  // Pick the best edge to dock a floating panel to:
  // 1) nearest edge by panel center distance
  // 2) tie-break: most recently used edge (this.lastUsedEdge)
  DockManager.prototype._pickSmartDockEdge = function (panel) {
    const x = (panel.position.x || 0) + (panel.position.w || 380) / 2;
    const y = (panel.position.y || 0) + (panel.position.h || 480) / 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dLeft = x;
    const dRight = vw - x;
    let nearest = 'left';
    if (dRight < dLeft) nearest = 'right';
    // Tie-break with lastUsedEdge
    if (dLeft === dRight && this.lastUsedEdge && (this.lastUsedEdge === 'left' || this.lastUsedEdge === 'right')) {
      return this.lastUsedEdge;
    }
    return nearest;
  };

  DockManager.prototype.detach = function (id) {
    const panel = this.panels[id];
    if (!panel) return;
    if (panel.state === 'floating') return;
    // KEEP the pill in the dock — every visible (non-closed) panel
    // gets a dock pill so the operator can summon it back or see
    // its type colour. The panel body just stops being pinned.
    panel.state = 'floating';
    this._renderPanelState(panel);
  };

  DockManager.prototype.dock = function (id, edge) {
    const panel = this.panels[id];
    if (!panel) return;
    if (!EDGES.includes(edge)) return;
    // Retired: only left/right docks are supported now (vertical edges only).
    if (edge !== 'left' && edge !== 'right') return;
    this.lastUsedEdge = edge;  // remember for smart-dock from floating
    // If already docked-active on the same edge, just activate
    // (the panel body is already on the edge; refreshing the focus
    // is enough). A floating panel whose home edge matches the
    // request FALLS THROUGH to the normal dock path below.
    if (panel.dockEdge === edge && panel.state === 'docked-active') {
      this.activate(id);
      return;
    }
    // Remove pill from old dock if any (pill stays when floating
    // — see detach(); we don't remove pills for floating panels).
    if (panel.dockEdge && panel.state !== 'floating') {
      this._removePillFromDock(panel.dockEdge, id);
    }
    // Add to new dock
    panel.dockEdge = edge;
    panel.state = 'docked-active';  // docking defaults to active
    this._setFocus(panel);
    this._addPillToDock(edge, id);
    // NOTE: the previous 'collapse others on this dock' rule is
    // removed. The new model allows multiple in-play panels per
    // dock. Each in-play panel keeps its docked-active state and
    // shows as a soft amber pill (or bright yellow if focused).
    const dock = this.docks[edge];
    if (dock) {
      this._updateDockPills(dock);
    }
    this._renderPanelState(panel);
    // Re-render ALL other active panels on perpendicular edges so they
    // pick up this new dock's offset.
    Object.values(this.panels).forEach(function (p) {
      if (p.id !== id && p.state === 'docked-active' && p.dockEdge !== edge) {
        this._renderPanelState(p);
      }
    }.bind(this));
  };

  // ---------- panel DOM ----------

  DockManager.prototype._ensurePanelEl = function (panel) {
    if (panel.el) return;
    const root = elFromHTML(
      '<div class="fvcms-pm-panel" data-panel-id="' + panel.id + '">' +
        '<header class="fvcms-pm-header" data-pm-role="header">' +
          '<span class="fvcms-pm-title">' + escapeHtml(panel.title) + '</span>' +
          '<span class="fvcms-pm-controls">' +
            '<button class="fvcms-pm-btn fvcms-pm-squeeze" title="Squeeze (push page) / Overlay (sit on top)" type="button">⇔</button>' +
            '<button class="fvcms-pm-btn fvcms-pm-collapse" title="Collapse to pill" type="button">−</button>' +
            '<button class="fvcms-pm-btn fvcms-pm-detach" title="Detach from dock (drag pill)" type="button"><span class="fvcms-pm-grip"></span></button>' +
            '<button class="fvcms-pm-btn fvcms-pm-close" title="Close" type="button">×</button>' +
          '</span>' +
        '</header>' +
        '<div class="fvcms-pm-body"></div>' +
        '<div class="fvcms-pm-resize" title="Drag to resize"></div>' +
      '</div>'
    );
    // Body
    const body = root.querySelector('.fvcms-pm-body');
    if (panel.content instanceof HTMLElement) body.appendChild(panel.content);
    else if (typeof panel.content === 'string') body.innerHTML = panel.content;
    panel.el = root;
    // Wire header buttons
    root.querySelector('.fvcms-pm-collapse').addEventListener('click', function (e) {
      e.stopPropagation();
      this.collapse(panel.id);
    }.bind(this));
    root.querySelector('.fvcms-pm-detach').addEventListener('click', function (e) {
      e.stopPropagation();
      this.detach(panel.id);
    }.bind(this));
    root.querySelector('.fvcms-pm-squeeze').addEventListener('click', function (e) {
      e.stopPropagation();
      // Toggle overlay mode
      const cur = panel.el.dataset.overlayMode;
      if (cur === '1') delete panel.el.dataset.overlayMode;
      else panel.el.dataset.overlayMode = '1';
      this._renderPanelState(panel);
    }.bind(this));
    root.querySelector('.fvcms-pm-close').addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.onClose) panel.onClose();
      this.removePanel(panel.id);
    }.bind(this));
    // Drag from header (only when floating or docked-active)
    const startDrag = function (ev) {
      // Only when in a state that allows dragging
      if (panel.state === 'docked-active') {
        // Drag the dock handle / panel to a new edge or detach
        // For now: drag = detach (becomes floating)
        this._startDrag(ev, panel, 'detach');
      } else if (panel.state === 'floating') {
        this._startDrag(ev, panel, 'move');
      }
    }.bind(this);
    const header = root.querySelector('.fvcms-pm-header');
    header.addEventListener('mousedown', function (e) {
      if (e.target.closest('button')) return;
      startDrag(e);
    });
    header.addEventListener('touchstart', function (e) {
      if (e.target.closest('button')) return;
      startDrag(e);
    }, { passive: false });

    // Resize handle: drag to resize docked panel
    const resizeEl = root.querySelector('.fvcms-pm-resize');
    if (resizeEl) {
      const self = this;
      const startResize = function (ev) {
        if (ev.cancelable) ev.preventDefault();
        const startPoint = self._getPoint(ev);
        const startW = panel.position.w || 380;
        const startH = panel.position.h || 480;
        function onMove(e) {
          const p = self._getPoint(e);
          const dx = p.x - startPoint.x;
          const dy = p.y - startPoint.y;
          if (panel.state === 'floating') {
            // Free 2-axis resize: drag corner
            panel.position.w = Math.max(220, Math.min(window.innerWidth - 40, startW + dx));
            panel.position.h = Math.max(150, Math.min(window.innerHeight - 40, startH + dy));
          } else if (panel.dockEdge === 'left') {
            // Drag inner (right) edge: dx positive = wider
            panel.position.w = Math.max(220, Math.min(window.innerWidth - 80, startW + dx));
          } else if (panel.dockEdge === 'right') {
            // Drag inner (left) edge: dx negative = wider
            panel.position.w = Math.max(220, Math.min(window.innerWidth - 80, startW - dx));
          } else if (panel.dockEdge === 'top') {
            // Drag inner (bottom) edge: dy positive = taller
            panel.position.h = Math.max(150, Math.min(window.innerHeight - 80, startH + dy));
          } else if (panel.dockEdge === 'bottom') {
            panel.position.h = Math.max(150, Math.min(window.innerHeight - 80, startH - dy));
          }
          self._renderPanelState(panel);
        }
        function onUp() {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          document.removeEventListener('touchmove', onMove);
          document.removeEventListener('touchend', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
      };
      resizeEl.addEventListener('mousedown', function (e) { startResize(e); });
      resizeEl.addEventListener('touchstart', function (e) { startResize(e); }, { passive: false });
    }
  };

  // ---------- rendering ----------

  DockManager.prototype._renderPanelState = function (panel) {
    if (!panel || !panel.el) return;
    const el = panel.el;
    el.dataset.state = panel.state;
    el.dataset.dockEdge = panel.dockEdge || '';
    if (panel.state === 'floating') {
      // Position absolutely. No padding on body — the panel is no
      // longer docked, so the pill isn't overlaying anything.
      el.style.position = 'fixed';
      el.style.left = panel.position.x + 'px';
      el.style.top = panel.position.y + 'px';
      el.style.width = panel.position.w + 'px';
      el.style.height = panel.position.h + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.paddingLeft = '0px';
      el.style.paddingRight = '0px';
      const body = el.querySelector('.fvcms-pm-body');
      if (body) {
        body.style.paddingLeft = '';
        body.style.paddingRight = '';
      }
      el.classList.add('fvcms-pm-floating');
      el.classList.remove('fvcms-pm-docked');
      document.body.appendChild(el);
    } else if (panel.state === 'docked-active') {
      // Docked panel: full height, touches the screen edge. Sits ON TOP of
      // page content (overlay by default). Toggle to squeeze via panel's
      // data-overlayMode attribute (set by the squeeze button in the panel
      // header). When squeeze, body gets padding equal to panel width.
      el.style.position = 'fixed';
      const requestedW = panel.position && panel.position.w ? panel.position.w : 380;
      // On mobile, cap docked width to leave room for the dock strip itself.
      // Operator can still re-resize via the inner-edge drag handle.
      const isMobile = window.innerWidth <= 600;
      const maxW = isMobile ? (window.innerWidth - DOCK_WIDTH) : Infinity;
      const w = Math.min(requestedW, maxW);
      const overlay = el.dataset.overlayMode !== '1';  // default = overlay

      // Calculate offsets from ACTIVE panels on perpendicular edges so
      // panels on different edges don't overlap each other.
      const allPanels = Object.values(this.panels);
      const leftActive = allPanels.find(function (p) { return p.id !== panel.id && p.state === 'docked-active' && p.dockEdge === 'left'; });
      const rightActive = allPanels.find(function (p) { return p.id !== panel.id && p.state === 'docked-active' && p.dockEdge === 'right'; });
      const topActive = allPanels.find(function (p) { return p.id !== panel.id && p.state === 'docked-active' && p.dockEdge === 'top'; });
      const bottomActive = allPanels.find(function (p) { return p.id !== panel.id && p.state === 'docked-active' && p.dockEdge === 'bottom'; });
      const leftW = leftActive ? (leftActive.position.w || 380) + DOCK_WIDTH : 0;
      const rightW = rightActive ? (rightActive.position.w || 380) + DOCK_WIDTH : 0;
      const topH = topActive ? (topActive.position.h || 420) + DOCK_HEIGHT : 0;
      const bottomH = bottomActive ? (bottomActive.position.h || 420) + DOCK_HEIGHT : 0;

      if (panel.dockEdge === 'left') {
        // Flush with the left edge. The pill overlays the panel body
        // (not the header) at x=0..DOCK_WIDTH. The body has padding-
        // left so text content doesn't sit behind the pill. The header
        // extends edge-to-edge (no padding).
        el.style.left = '0px';
        el.style.top = topH + 'px';
        el.style.right = 'auto';
        el.style.width = w + 'px';
        // Full viewport height — docked panels fill the screen edge to edge.
        el.style.bottom = bottomH + 'px';
        el.style.height = 'auto';
        el.style.maxHeight = (window.innerHeight - topH - bottomH) + 'px';
        el.style.paddingLeft = '0px';
        el.style.paddingRight = '0px';
        // Push the body content past the pill on the left side.
        const body = el.querySelector('.fvcms-pm-body');
        if (body) {
          body.style.paddingLeft = (DOCK_WIDTH + 8) + 'px';
          body.style.paddingRight = '';
        }
        if (overlay) {
          document.documentElement.style.setProperty('--fvcms-pm-pinned-w', '0px');
        } else {
          document.documentElement.style.setProperty('--fvcms-pm-pinned-w', w + 'px');
        }
      } else if (panel.dockEdge === 'right') {
        el.style.right = '0px';
        el.style.top = topH + 'px';
        el.style.left = 'auto';
        el.style.width = w + 'px';
        el.style.bottom = bottomH + 'px';
        el.style.height = 'auto';
        el.style.maxHeight = (window.innerHeight - topH - bottomH) + 'px';
        el.style.paddingLeft = '0px';
        el.style.paddingRight = '0px';
        const body = el.querySelector('.fvcms-pm-body');
        if (body) {
          body.style.paddingLeft = '';
          body.style.paddingRight = (DOCK_WIDTH + 8) + 'px';
        }
        if (overlay) {
          document.documentElement.style.setProperty('--fvcms-pm-pinned-w', '0px');
        } else {
          document.documentElement.style.setProperty('--fvcms-pm-pinned-w', w + 'px');
        }
      } else if (panel.dockEdge === 'top' || panel.dockEdge === 'bottom') {
        // Top/bottom docks retired. Force re-dock to left.
        panel.dockEdge = 'left';
        this._renderPanelState(panel);
        return;
      }
      el.classList.add('fvcms-pm-docked');
      el.classList.remove('fvcms-pm-floating');
      document.body.appendChild(el);
    } else if (panel.state === 'docked-collapsed' || panel.state === 'hidden') {
      // Panel DOM is hidden; the pill represents it
      el.style.display = 'none';
    }
    if (panel.state !== 'hidden' && panel.state !== 'docked-collapsed') {
      el.style.display = '';
    }
  };

  // ---------- dock lifecycle ----------

  DockManager.prototype._addPillToDock = function (edge, panelId) {
    let dock = this.docks[edge];
    if (!dock) {
      dock = this._createDock(edge);
      this.docks[edge] = dock;
    }
    if (!dock.pills.includes(panelId)) dock.pills.push(panelId);
    this._updateDockPills(dock);
  };

  DockManager.prototype._removePillFromDock = function (edge, panelId) {
    const dock = this.docks[edge];
    if (!dock) return;
    dock.pills = dock.pills.filter(function (x) { return x !== panelId; });
    if (dock.pills.length === 0) {
      // Dock disappears
      if (dock.el && dock.el.parentNode) dock.el.parentNode.removeChild(dock.el);
      delete this.docks[edge];
    } else {
      this._updateDockPills(dock);
    }
  };

  DockManager.prototype._createDock = function (edge) {
    const dock = {
      edge: edge,
      pills: [],
      activePillId: null,
      el: null
    };
    const el = elFromHTML(
      '<div class="fvcms-dock fvcms-dock-' + edge + '" data-dock-edge="' + edge + '">' +
        '<div class="fvcms-dock-pills" data-pm-role="dock-pills"></div>' +
      '</div>'
    );
    dock.el = el;
    this.containerEl.appendChild(el);
    return dock;
  };

  DockManager.prototype._updateDockPills = function (dock) {
    // Sync pill DOM with dock.pills array
    const container = dock.el.querySelector('[data-pm-role="dock-pills"]');
    // Re-render all pills
    container.innerHTML = '';
    dock.pills.forEach(function (panelId, idx) {
      const panel = this.panels[panelId];
      if (!panel) return;
      // Three visual tiers:
      //   - focused   = docked-active + isFocused     -> .focused class (bright yellow)
      //   - in-play   = docked-active + !isFocused    -> .in-play class (softer amber)
      //   - hidden    = docked-collapsed              -> nothing (type colour, parked slice)
      const cls = [];
      if (panel.state === 'docked-active' && panel.isFocused) cls.push('focused');
      else if (panel.state === 'docked-active') cls.push('in-play');
      const pill = elFromHTML(
        '<div class="fvcms-dock-pill' + (cls.length ? ' ' + cls.join(' ') : '') + '" data-pm-panel-id="' + panelId + '" title="' + escapeHtml(panel.title) + '">' +
          '<span class="fvcms-dock-pill-grip" aria-hidden="true">⋮⋮</span>' +
          '<span class="fvcms-dock-pill-label">' + escapeHtml(panel.title) + '</span>' +
        '</div>'
      );
      // Pill interactions:
      //  - Click anywhere except the grip span activates the panel.
      //  - Click on the grip starts a real drag that can detach or
      //    move the pill to a different edge.
      //  - Touch on a non-grip part starts a drag-to-reveal: the
      //    pill follows the finger; releasing in the shown position
      //    leaves it there for a follow-up tap. A tap (no drag)
      //    activates the panel.
      // The drag system already calls preventDefault on mousedown,
      // which suppresses the synthetic click — so we hook the
      // activate logic into the mousedown directly.
      const isGripTarget = function (e) {
        return e.target && e.target.closest && e.target.closest('.fvcms-dock-pill-grip');
      };
      const me2 = this;
      pill.addEventListener('mousedown', function (e) {
        if (!isGripTarget(e)) {
          e.preventDefault();
          me2.activate(panelId);
          return;
        }
        e.preventDefault();
        me2._startDrag(e, panel, 'pill');
      });

      // ---- Touch drag-to-reveal for mobile ----
      // On touch devices :hover is sticky and unreliable, so we
      // implement the slide-in interaction directly: the pill
      // follows the finger, and on release the operator can tap
      // again to activate.
      pill.addEventListener('touchstart', function (e) {
        if (isGripTarget(e)) {
          // Grip drag: same as mouse — detach or move edge
          e.preventDefault();
          me2._startDrag(e, panel, 'pill');
          return;
        }
        // Non-grip touch: start a drag-to-reveal.
        e.preventDefault();
        const t = e.touches[0];
        const startX = t.clientX;
        const startY = t.clientY;
        // Read the current transform so we start from the actual
        // parked position (CSS default or a previous in-line value).
        const cs = getComputedStyle(pill);
        const matrix = new DOMMatrixReadOnly(cs.transform);
        const startTx = matrix.m41 || 0;
        const isLeftDock = pill.closest('.fvcms-dock-left') !== null;
        const isRightDock = pill.closest('.fvcms-dock-right') !== null;
        // Parked offset depends on edge (defined in CSS).
        const PARK = isLeftDock ? -30 : isRightDock ? 30 : 0;
        let moved = false;
        let lastDx = 0;
        function onTouchMove(ev) {
          const t2 = ev.touches[0];
          const dx = t2.clientX - startX;
          const dy = t2.clientY - startY;
          // Only treat as a slide-reveal when motion is dominantly
          // horizontal. Vertical motion means the user is scrolling
          // the page, not revealing the pill — let the browser handle
          // the scroll.
          if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            ev.preventDefault();
            moved = true;
            lastDx = dx;
            // Clamp between PARK (or further) and 0
            let tx = startTx + dx;
            if (isLeftDock) tx = Math.min(0, Math.max(PARK - 4, tx));
            else if (isRightDock) tx = Math.max(0, Math.min(-PARK + 4, tx));
            pill.style.transform = 'translateX(' + tx + 'px)';
            pill.style.transition = 'none';
          }
        }
        function onTouchEnd(ev) {
          pill.removeEventListener('touchmove', onTouchMove);
          pill.removeEventListener('touchend', onTouchEnd);
          pill.removeEventListener('touchcancel', onTouchEnd);
          pill.style.transition = '';
          if (!moved) {
            // It was a tap, not a drag. Activate the panel.
            if (panel.state === 'docked-active') me2.collapse(panelId);
            else me2.activate(panelId);
            // The active class on the panel will translate the
            // pill back to 0 via CSS.
            pill.style.transform = '';
            return;
          }
          // A real drag. Decide whether to leave the pill in view
          // (operator slid it in) or snap it back to parked.
          // Threshold: if the final position is closer to fully
          // shown than to fully parked, leave it shown — set the
          // inline transform to translateX(0) so it stays fully
          // visible after the finger lifts. Otherwise clear the
          // inline transform and let CSS snap it back to parked.
          const cs2 = getComputedStyle(pill);
          const finalTx = (new DOMMatrixReadOnly(cs2.transform)).m41 || 0;
          if (isLeftDock && finalTx > -15) {
            // Operator pulled it most of the way in — leave it
            // fully shown so a follow-up tap can activate.
            pill.style.transition = 'transform 0.18s ease';
            pill.style.transform = 'translateX(0)';
            setTimeout(function () { pill.style.transition = ''; }, 200);
          } else if (isRightDock && finalTx < 15) {
            pill.style.transition = 'transform 0.18s ease';
            pill.style.transform = 'translateX(0)';
            setTimeout(function () { pill.style.transition = ''; }, 200);
          } else {
            // Not far enough in — snap back to parked.
            pill.style.transition = 'transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            pill.style.transform = '';
            setTimeout(function () { pill.style.transition = ''; }, 240);
          }
        }
        pill.addEventListener('touchmove', onTouchMove, { passive: false });
        pill.addEventListener('touchend', onTouchEnd);
        pill.addEventListener('touchcancel', onTouchEnd);
      }, { passive: false });
      container.appendChild(pill);
    }.bind(this));
  };

  // ---------- drag system ----------

  DockManager.prototype._getPoint = function (ev) {
    if (ev.touches && ev.touches.length) {
      return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
    }
    if (ev.changedTouches && ev.changedTouches.length) {
      return { x: ev.changedTouches[0].clientX, y: ev.changedTouches[0].clientY };
    }
    return { x: ev.clientX, y: ev.clientY };
  };

  DockManager.prototype._startDrag = function (ev, panel, mode) {
    // mode: 'move' (floating), 'detach' (docked-active -> floating), 'pill' (dock pill)
    if (ev.cancelable) ev.preventDefault();
    const startPoint = this._getPoint(ev);
    const startState = panel.state;
    const startDockEdge = panel.dockEdge;
    const startPos = Object.assign({}, panel.position);
    const startOffset = { x: startPoint.x - (panel.el ? panel.el.getBoundingClientRect().x : 0), y: startPoint.y - (panel.el ? panel.el.getBoundingClientRect().y : 0) };
    const me = this;
    this.dragState = { panel, mode, startState, startDockEdge, startPos, startOffset, startPoint, moved: false };

    function onMove(e) {
      const p = me._getPoint(e);
      const dx = p.x - startPoint.x;
      const dy = p.y - startPoint.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) me.dragState.moved = true;
      // Detect snap-to-edge
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const SNAP = 60;
      let snapEdge = null;
      if (p.x < SNAP) snapEdge = 'left';
      else if (p.x > vw - SNAP) snapEdge = 'right';
      else if (false) snapEdge = 'top'; // retired
      else if (false) snapEdge = 'bottom'; // retired
      // Visual feedback
      me._showSnapHint(snapEdge);
      if (me.dragState.moved) {
        // If docked-active or pill, detach first so the panel becomes floating
        if (panel.state !== 'floating') {
          // CRITICAL: capture the panel's CURRENT rendered position
          // BEFORE detach() runs. dock() never updates panel.position.x/y,
          // so panel.position still holds whatever it had before docking
          // (often the initial 80/80 default). Reading the live element
          // rect gives us the actual on-screen position so the panel
          // doesn't snap to the stale position.
          const rect = panel.el ? panel.el.getBoundingClientRect() : null;
          if (rect) {
            panel.position.x = rect.x;
            panel.position.y = rect.y;
            if (panel.position.w !== rect.width)  panel.position.w = rect.width;
            if (panel.position.h !== rect.height) panel.position.h = rect.height;
            // Update startPos so the dx/dy math below is from the
            // ACTUAL current on-screen position, not the stale one.
            startPos.x = rect.x;
            startPos.y = rect.y;
          }
          me.detach(panel.id);
        }
        // Move panel (relative to startPos which now matches reality)
        panel.position.x = Math.max(0, startPos.x + dx);
        panel.position.y = Math.max(0, startPos.y + dy);
        me._renderPanelState(panel);
      }
    }
    function onUp(e) {
      const p = me._getPoint(e);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const SNAP = 60;
      let snapEdge = null;
      if (p.x < SNAP) snapEdge = 'left';
      else if (p.x > vw - SNAP) snapEdge = 'right';
      else if (false) snapEdge = 'top'; // retired
      else if (false) snapEdge = 'bottom'; // retired
      me._hideSnapHint();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      const wasMoved = me.dragState && me.dragState.moved;
      const wasMode = me.dragState ? me.dragState.mode : mode;
      me.dragState = null;
      if (snapEdge && wasMoved) {
        me.dock(panel.id, snapEdge);
        panelToast('Docked to ' + snapEdge);
      } else if (!wasMoved && wasMode === 'pill') {
        // Click without drag on pill = toggle activate/collapse
        if (panel.state === 'docked-active') {
          me.collapse(panel.id);
        } else {
          me.activate(panel.id);
        }
      } else if (!wasMoved && wasMode === 'detach') {
        // Click without drag on docked-active header = collapse
        me.collapse(panel.id);
      }
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  };

  DockManager.prototype._showSnapHint = function (edge) {
    let hint = this.containerEl.querySelector('.fvcms-snap-hint');
    if (!edge) {
      if (hint) hint.style.display = 'none';
      return;
    }
    if (!hint) {
      hint = elFromHTML('<div class="fvcms-snap-hint"></div>');
      this.containerEl.appendChild(hint);
    }
    hint.className = 'fvcms-snap-hint fvcms-snap-hint-' + edge;
    hint.style.display = 'block';
  };

  DockManager.prototype._hideSnapHint = function () {
    const hint = this.containerEl.querySelector('.fvcms-snap-hint');
    if (hint) hint.style.display = 'none';
  };

  // ---------- public singleton ----------

  let instance = null;
  const api = {
    create: function (opts) {
      if (instance) return instance;
      instance = new DockManager(opts);
      return instance;
    },
    get: function () { return instance; },
    list: function () { return instance ? instance.list() : null; }
  };

  if (typeof window !== 'undefined') {
    window.PanelManager = api;
    window.OscarPanelManager = api;
  }

})();
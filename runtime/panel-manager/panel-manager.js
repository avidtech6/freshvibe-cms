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
    var t = document.getElementById('oscar-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.__oscarToastTimer);
    window.__oscarToastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  // ---------- DockManager ----------

  const DOCK_WIDTH = 44;          // CSS px wide on vertical edges (max 45)
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
    this.containerEl.className = 'oscar-dock-root';
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
    if (panel.state === 'docked-active') return; // already active
    if (panel.state === 'docked-collapsed') {
      // Collapse currently-active on same dock, expand this one
      const dock = this.docks[panel.dockEdge];
      if (!dock) return;
      dock.pills.forEach(function (pid) {
        const p = this.panels[pid];
        if (!p) return;
        if (p.id === id) {
          p.state = 'docked-active';
        } else if (p.state === 'docked-active') {
          p.state = 'docked-collapsed';
        }
      }.bind(this));
      this._renderPanelState(panel);
      this._renderPanelState(this.panels[dock.pills.find(function (x) { return x !== id; })]);
      this._updateDockPills(dock);
    }
    // If floating, dock it first (default edge = left)
    else if (panel.state === 'floating') {
      this.dock(id, 'left');
      this.activate(id);
    }
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
    const edge = panel.dockEdge;
    this._removePillFromDock(edge, id);
    panel.state = 'floating';
    panel.dockEdge = null;
    this._renderPanelState(panel);
  };

  DockManager.prototype.dock = function (id, edge) {
    const panel = this.panels[id];
    if (!panel) return;
    if (!EDGES.includes(edge)) return;
    // Retired: only left/right docks are supported now (vertical edges only).
    if (edge !== 'left' && edge !== 'right') return;
    this.lastUsedEdge = edge;  // remember for smart-dock from floating
    // If already docked on same edge, just activate
    if (panel.dockEdge === edge) {
      this.activate(id);
      return;
    }
    // Remove from current dock if any
    if (panel.dockEdge) this._removePillFromDock(panel.dockEdge, id);
    // Add to new dock
    panel.dockEdge = edge;
    panel.state = 'docked-active';  // docking defaults to active
    this._addPillToDock(edge, id);
    // Collapse others on this dock and re-render them
    const dock = this.docks[edge];
    if (dock) {
      dock.pills.forEach(function (pid) {
        if (pid === id) return;
        const p = this.panels[pid];
        if (p && p.state === 'docked-active') {
          p.state = 'docked-collapsed';
          this._renderPanelState(p);
        }
      }.bind(this));
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
      // Position absolutely
      el.style.position = 'fixed';
      el.style.left = panel.position.x + 'px';
      el.style.top = panel.position.y + 'px';
      el.style.width = panel.position.w + 'px';
      el.style.height = panel.position.h + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.classList.add('fvcms-pm-floating');
      el.classList.remove('fvcms-pm-docked');
      document.body.appendChild(el);
    } else if (panel.state === 'docked-active') {
      // Docked panel: full height, touches the screen edge. Sits ON TOP of
      // page content (overlay by default). Toggle to squeeze via panel's
      // data-overlayMode attribute (set by the squeeze button in the panel
      // header). When squeeze, body gets padding equal to panel width.
      el.style.position = 'fixed';
      const w = panel.position && panel.position.w ? panel.position.w : 380;
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
        el.style.left = DOCK_WIDTH + 'px';
        el.style.top = topH + 'px';
        el.style.right = 'auto';
        el.style.width = w + 'px';
        // Full viewport height — docked panels fill the screen edge to edge.
        el.style.bottom = bottomH + 'px';
        el.style.height = 'auto';
        el.style.maxHeight = (window.innerHeight - topH - bottomH) + 'px';
        if (overlay) {
          document.documentElement.style.setProperty('--fvcms-pm-pinned-w', '0px');
        } else {
          document.documentElement.style.setProperty('--fvcms-pm-pinned-w', (w + DOCK_WIDTH) + 'px');
        }
      } else if (panel.dockEdge === 'right') {
        el.style.right = DOCK_WIDTH + 'px';
        el.style.top = topH + 'px';
        el.style.left = 'auto';
        el.style.width = w + 'px';
        el.style.bottom = bottomH + 'px';
        el.style.height = 'auto';
        el.style.maxHeight = (window.innerHeight - topH - bottomH) + 'px';
        if (overlay) {
          document.documentElement.style.setProperty('--fvcms-pm-pinned-w', '0px');
        } else {
          document.documentElement.style.setProperty('--fvcms-pm-pinned-w', (w + DOCK_WIDTH) + 'px');
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
      '<div class="oscar-dock oscar-dock-' + edge + '" data-dock-edge="' + edge + '">' +
        '<div class="oscar-dock-pills" data-pm-role="dock-pills"></div>' +
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
      const isActive = panel.state === 'docked-active';
      const pill = elFromHTML(
        '<div class="oscar-dock-pill' + (isActive ? ' active' : '') + '" data-pm-panel-id="' + panelId + '" title="' + escapeHtml(panel.title) + '">' +
          '<span class="oscar-dock-pill-grip" aria-hidden="true">⋮⋮</span>' +
          '<span class="oscar-dock-pill-label">' + escapeHtml(panel.title) + '</span>' +
        '</div>'
      );
      // Click pill = activate (or collapse if already active)
      pill.addEventListener('click', function (e) {
        if (e.target.closest('.oscar-dock-pill-grip')) return; // grip = drag, not click
        if (panel.state === 'docked-active') {
          // Already active — collapse to a pill only
          this.collapse(panelId);
        } else {
          this.activate(panelId);
        }
      }.bind(this));
      // Drag pill = detach
      const startPillDrag = function (ev) {
        ev.preventDefault();
        this._startDrag(ev, panel, 'pill');
      }.bind(this);
      pill.addEventListener('mousedown', function (e) { startPillDrag(e); });
      pill.addEventListener('touchstart', function (e) { startPillDrag(e); }, { passive: false });
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
          me.detach(panel.id);
        }
        // Move panel
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
    let hint = this.containerEl.querySelector('.oscar-snap-hint');
    if (!edge) {
      if (hint) hint.style.display = 'none';
      return;
    }
    if (!hint) {
      hint = elFromHTML('<div class="oscar-snap-hint"></div>');
      this.containerEl.appendChild(hint);
    }
    hint.className = 'oscar-snap-hint oscar-snap-hint-' + edge;
    hint.style.display = 'block';
  };

  DockManager.prototype._hideSnapHint = function () {
    const hint = this.containerEl.querySelector('.oscar-snap-hint');
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
    window.PanelManager = api; window.OscarPanelManager = api;
  }

})();
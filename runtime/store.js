// runtime/store.js — in-memory store with IndexedDB persistence
// Holds: pages, regions, groups, moduleInstances, skins, activeContext.
// Thread B fields (gating, progress, currentUser) live in the same
// records but are not used by v1 UI.

const DB_NAME = 'freshvibe-cms';
const DB_VERSION = 1;
const STORES = {
  pages: 'pages',
  regions: 'regions',
  groups: 'groups',
  modules: 'modules',
  skins: 'skins',
};

class Store {
  constructor() {
    this.pages = new Map();
    this.regions = new Map();
    this.groups = new Map();
    this.modules = new Map();
    this.skins = new Map();
    this.activeContext = {
      page: null,
      activeSkin: null,
      currentUser: null,
    };
    this._db = null;
  }

  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        Object.values(STORES).forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = (e) => {
        this._db = e.target.result;
        resolve(this._db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // ---- pages ----
  putPage(page) { this.pages.set(page.id, page); this._persist(STORES.pages, page); }
  getPage(id) { return this.pages.get(id) || null; }
  getPageByPathname(pathname) {
    for (const p of this.pages.values()) if (p.pathname === pathname) return p;
    return null;
  }
  listPages() { return Array.from(this.pages.values()); }

  // ---- regions ----
  putRegion(region) { this.regions.set(region.id, region); this._persist(STORES.regions, region); }
  getRegion(id) { return this.regions.get(id) || null; }
  listRegionsForPage(pageId) {
    const page = this.getPage(pageId);
    if (!page) return [];
    return page.regionIds.map(id => this.regions.get(id)).filter(Boolean);
  }

  // ---- groups ----
  putGroup(group) { this.groups.set(group.id, group); this._persist(STORES.groups, group); }
  getGroup(id) { return this.groups.get(id) || null; }
  listGroupsForRegion(regionId) {
    return Array.from(this.groups.values()).filter(g => g.regionId === regionId);
  }

  // ---- module instances ----
  putModule(m) { this.modules.set(m.id, m); this._persist(STORES.modules, m); }
  getModule(id) { return this.modules.get(id) || null; }
  listModulesForGroup(groupId) {
    return Array.from(this.modules.values()).filter(m => m.groupId === groupId);
  }

  // ---- skins ----
  putSkin(skin) { this.skins.set(skin.id, skin); this._persist(STORES.skins, skin); }
  getSkin(id) { return this.skins.get(id) || null; }
  listSkins() { return Array.from(this.skins.values()); }

  // ---- active context ----
  setActivePage(pageId) { this.activeContext.page = pageId; }
  setActiveSkin(skinId) { this.activeContext.activeSkin = skinId; }
  setCurrentUser(user) { this.activeContext.currentUser = user; }

  // ---- field-level update (used by inline editor + panel editor) ----
  updateField(moduleInstanceId, field, value) {
    const m = this.modules.get(moduleInstanceId);
    if (!m) return null;
    m.config = { ...m.config, [field]: value };
    this._persist(STORES.modules, m);
    return m;
  }

  // ---- internal ----
  _persist(storeName, record) {
    if (!this._db) return;
    try {
      const tx = this._db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
    } catch (e) {
      console.warn('[freshvibe-cms] persist failed:', e);
    }
  }
}

let _instance = null;

export function getStore() {
  if (!_instance) _instance = new Store();
  return _instance;
}

export { Store };
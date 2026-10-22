import {
  CustomAssetRecord,
  DEFAULT_GLOBAL_SETTINGS,
  GlobalAppSettings,
  SavedProjectRecord,
  SerializedProjectFile,
} from '../types/studio';

const DB_NAME = 'PerabotStudioDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_ASSETS = 'customAssets';
const SETTINGS_LS_KEY = 'perabot_global_settings_v1';

let dbPromise: Promise<IDBDatabase> | null = null;
const memoryProjectsFallback = new Map<string, SavedProjectRecord>();
const memoryAssetsFallback = new Map<string, CustomAssetRecord>();

function openStudioDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        const pStore = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        pStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        const aStore = db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
        aStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB open error'));
  });

  return dbPromise;
}

export function loadGlobalSettings(): GlobalAppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_LS_KEY);
    if (!raw) return { ...DEFAULT_GLOBAL_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GlobalAppSettings>;
    return {
      ...DEFAULT_GLOBAL_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_GLOBAL_SETTINGS };
  }
}

export function saveGlobalSettings(settings: GlobalAppSettings): void {
  try {
    localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota issues in restricted browsers
  }
}

export async function listProjects(): Promise<SavedProjectRecord[]> {
  try {
    const db = await openStudioDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as SavedProjectRecord[]) ?? [];
        items.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return Array.from(memoryProjectsFallback.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
  }
}

export async function saveProjectRecord(record: SavedProjectRecord): Promise<void> {
  memoryProjectsFallback.set(record.id, record);
  try {
    const db = await openStudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      tx.objectStore(STORE_PROJECTS).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback map already holds latest state in memory
  }
}

export async function deleteProjectRecord(id: string): Promise<void> {
  memoryProjectsFallback.delete(id);
  try {
    const db = await openStudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      tx.objectStore(STORE_PROJECTS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignored
  }
}

export async function duplicateProjectRecord(
  source: SavedProjectRecord,
  copySuffix = ' (Salinan)'
): Promise<SavedProjectRecord> {
  const now = Date.now();
  const newId = `proj_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const copyName = `${source.name}${copySuffix}`;
  const clonedScene: SerializedProjectFile = JSON.parse(
    JSON.stringify(source.scene)
  );
  clonedScene.id = newId;
  clonedScene.name = copyName;
  clonedScene.createdAt = now;
  clonedScene.updatedAt = now;

  const next: SavedProjectRecord = {
    ...source,
    id: newId,
    name: copyName,
    createdAt: now,
    updatedAt: now,
    scene: clonedScene,
  };
  await saveProjectRecord(next);
  return next;
}

export async function renameProjectRecord(
  record: SavedProjectRecord,
  newName: string
): Promise<SavedProjectRecord> {
  const trimmed = newName.trim() || record.name;
  const updated: SavedProjectRecord = {
    ...record,
    name: trimmed,
    updatedAt: Date.now(),
    scene: {
      ...record.scene,
      name: trimmed,
      updatedAt: Date.now(),
    },
  };
  await saveProjectRecord(updated);
  return updated;
}

export function downloadProjectBackup(record: SavedProjectRecord): void {
  const json = JSON.stringify(record.scene, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const safeName =
    record.name
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'proyek-perabot';

  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.perabot`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importProjectBackupFile(
  file: File
): Promise<SavedProjectRecord> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<SerializedProjectFile>;
  if (!parsed || !Array.isArray(parsed.objects)) {
    throw new Error('Invalid .perabot project file');
  }

  const now = Date.now();
  const newId = `proj_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanName =
    parsed.name?.trim() || file.name.replace(/\.(perabot|json)$/i, '') || 'Impor Proyek';

  const scene: SerializedProjectFile = {
    format: 'perabot-project-v1',
    id: newId,
    name: cleanName,
    mode: parsed.mode === 'house' ? 'house' : 'modeling',
    createdAt: parsed.createdAt ?? now,
    updatedAt: now,
    objects: parsed.objects,
    gridSettings: parsed.gridSettings,
    lightingMood: parsed.lightingMood,
  };

  const record: SavedProjectRecord = {
    id: newId,
    name: cleanName,
    mode: scene.mode,
    thumbnailDataUrl: '',
    objectCount: scene.objects.length,
    createdAt: scene.createdAt,
    updatedAt: now,
    scene,
  };

  await saveProjectRecord(record);
  return record;
}

/* =========================================================
   Custom Assets ("Koleksi Properti Saya") Persistence
   ========================================================= */
export async function listCustomAssets(): Promise<CustomAssetRecord[]> {
  try {
    const db = await openStudioDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ASSETS, 'readonly');
      const req = tx.objectStore(STORE_ASSETS).getAll();
      req.onsuccess = () => {
        const list = (req.result as CustomAssetRecord[]) ?? [];
        list.sort((a, b) => b.createdAt - a.createdAt);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return Array.from(memoryAssetsFallback.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }
}

export async function saveCustomAssetRecord(
  asset: CustomAssetRecord
): Promise<void> {
  memoryAssetsFallback.set(asset.id, asset);
  try {
    const db = await openStudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ASSETS, 'readwrite');
      tx.objectStore(STORE_ASSETS).put(asset);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignored
  }
}

export async function deleteCustomAssetRecord(id: string): Promise<void> {
  memoryAssetsFallback.delete(id);
  try {
    const db = await openStudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ASSETS, 'readwrite');
      tx.objectStore(STORE_ASSETS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignored
  }
}

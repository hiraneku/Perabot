import {
  CustomAssetRecord,
  DEFAULT_GLOBAL_SETTINGS,
  GlobalAppSettings,
  ImportedModelBlobRecord,
  SavedProjectRecord,
  SerializedProjectFile,
} from '../types/studio';

const DB_NAME = 'PerabotStudioDB';
const DB_VERSION = 2;
const STORE_PROJECTS = 'projects';
const STORE_ASSETS = 'customAssets';
const STORE_IMPORTED_MODELS = 'importedModels';
const SETTINGS_LS_KEY = 'perabot_global_settings_v1';

let dbPromise: Promise<IDBDatabase> | null = null;
const memoryProjectsFallback = new Map<string, SavedProjectRecord>();
const memoryAssetsFallback = new Map<string, CustomAssetRecord>();
const memoryImportedModelsFallback = new Map<string, ImportedModelBlobRecord>();

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

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
      if (!db.objectStoreNames.contains(STORE_IMPORTED_MODELS)) {
        db.createObjectStore(STORE_IMPORTED_MODELS, { keyPath: 'id' });
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

/* =========================================================
   Imported 3D Model Binary Cache (GLB ArrayBuffer in IndexedDB)
   ========================================================= */
export async function saveImportedModelBlob(
  record: ImportedModelBlobRecord
): Promise<void> {
  memoryImportedModelsFallback.set(record.id, record);
  try {
    const db = await openStudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_IMPORTED_MODELS, 'readwrite');
      tx.objectStore(STORE_IMPORTED_MODELS).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Kept in memory fallback
  }
}

export async function getImportedModelBlob(
  id: string
): Promise<ImportedModelBlobRecord | null> {
  if (memoryImportedModelsFallback.has(id)) {
    return memoryImportedModelsFallback.get(id)!;
  }
  try {
    const db = await openStudioDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMPORTED_MODELS, 'readonly');
      const req = tx.objectStore(STORE_IMPORTED_MODELS).get(id);
      req.onsuccess = () => {
        const res = (req.result as ImportedModelBlobRecord | undefined) ?? null;
        if (res) memoryImportedModelsFallback.set(id, res);
        resolve(res);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/* =========================================================
   Projects Persistence
   ========================================================= */
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

export async function downloadProjectBackup(
  record: SavedProjectRecord
): Promise<void> {
  const exportScene: SerializedProjectFile = JSON.parse(
    JSON.stringify(record.scene)
  );

  // Embed any referenced imported 3D model binaries into the .perabot backup file!
  const modelIds = new Set<string>();
  for (const obj of exportScene.objects) {
    if (obj.modelAssetId) modelIds.add(obj.modelAssetId);
  }
  if (modelIds.size > 0) {
    const embedded: NonNullable<SerializedProjectFile['embeddedModels']> = {};
    for (const mid of modelIds) {
      const blobRec = await getImportedModelBlob(mid);
      if (blobRec) {
        embedded[mid] = {
          name: blobRec.name,
          format: blobRec.format,
          thumbDataUrl: blobRec.thumbDataUrl,
          base64Glb: arrayBufferToBase64(blobRec.glbBuffer),
        };
      }
    }
    exportScene.embeddedModels = embedded;
  }

  const json = JSON.stringify(exportScene, null, 2);
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

  // Restore any embedded imported 3D models into IndexedDB
  if (parsed.embeddedModels) {
    for (const [mid, item] of Object.entries(parsed.embeddedModels)) {
      if (item && item.base64Glb) {
        await saveImportedModelBlob({
          id: mid,
          name: item.name || 'Model 3D',
          format: item.format || 'GLB',
          thumbDataUrl: item.thumbDataUrl || '',
          glbBuffer: base64ToArrayBuffer(item.base64Glb),
          createdAt: Date.now(),
        });
      }
    }
  }

  const now = Date.now();
  const newId = `proj_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanName =
    parsed.name?.trim() ||
    file.name.replace(/\.(perabot|json)$/i, '') ||
    'Impor Proyek';

  const scene: SerializedProjectFile = {
    format: 'perabot-project-v1',
    id: newId,
    name: cleanName,
    mode: parsed.mode === 'house' ? 'house' : 'modeling',
    createdAt: parsed.createdAt ?? now,
    updatedAt: now,
    objects: parsed.objects,
    gridSettings: parsed.gridSettings,
    snapSettings: parsed.snapSettings,
    surfaceSettings: parsed.surfaceSettings,
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

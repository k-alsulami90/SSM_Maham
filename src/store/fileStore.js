/* Minimal IndexedDB blob store so uploaded documents survive reloads / offline.
   Task state (localStorage) keeps only metadata; the actual file blob lives here,
   keyed by attachment id. */

const DB_NAME = "maham-files";
const STORE = "files";

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putFile(id, blob) {
  try {
    const db = await open();
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch {
    /* private mode / unsupported — non-fatal */
  }
}

export async function getFile(id) {
  try {
    const db = await open();
    return await new Promise((res) => {
      const tx = db.transaction(STORE, "readonly");
      const rq = tx.objectStore(STORE).get(id);
      rq.onsuccess = () => res(rq.result || null);
      rq.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}

export async function delFile(id) {
  try {
    const db = await open();
    await new Promise((res) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch {
    /* ignore */
  }
}

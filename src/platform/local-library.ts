import type { BookResult } from "@/core/books";

export type SavedBook = {
  id: string;
  savedAt: string;
  book: BookResult;
};

export type LocalBookFile = {
  id: string;
  name: string;
  type: "application/pdf" | "application/epub+zip";
  size: number;
  addedAt: string;
};

type StoredBookFile = LocalBookFile & { blob: Blob };

const SHELF_KEY = "shelfmark:shelf:v1";
const DB_NAME = "shelfmark-library";
const DB_VERSION = 1;
const FILE_STORE = "files";
export const MAX_LOCAL_FILE_BYTES = 50 * 1024 * 1024;
export const ACCEPTED_LOCAL_FILE_TYPES = ["application/pdf", "application/epub+zip"] as const;

function hasWindow() {
  return typeof window !== "undefined";
}

export function loadSavedBooks(): SavedBook[] {
  if (!hasWindow()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SHELF_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedBook => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<SavedBook>;
      return typeof candidate.id === "string" && typeof candidate.savedAt === "string" && Boolean(candidate.book);
    });
  } catch {
    return [];
  }
}

function writeSavedBooks(items: SavedBook[]) {
  if (!hasWindow()) throw new Error("Local shelf is unavailable in this browser.");
  window.localStorage.setItem(SHELF_KEY, JSON.stringify(items.slice(0, 100)));
}

export function saveBookToShelf(book: BookResult) {
  const current = loadSavedBooks();
  const existing = current.find((item) => item.id === book.id);
  if (existing) return current;
  const next = [{ id: book.id, savedAt: new Date().toISOString(), book }, ...current];
  writeSavedBooks(next);
  return next;
}

export function removeBookFromShelf(id: string) {
  const next = loadSavedBooks().filter((item) => item.id !== id);
  writeSavedBooks(next);
  return next;
}

function openDatabase() {
  if (!hasWindow() || !("indexedDB" in window)) {
    return Promise.reject(new Error("Local file storage is unavailable in this browser."));
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(FILE_STORE)) {
        database.createObjectStore(FILE_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open the local library."));
  });
}

function completeTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
) {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(FILE_STORE, mode);
        const store = transaction.objectStore(FILE_STORE);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          database.close();
          reject(transaction.error || new Error("Local library transaction failed."));
        };
        operation(store, resolve, reject);
      }),
  );
}

function resolveFileType(file: File): LocalBookFile["type"] {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "application/pdf";
  if (file.type === "application/epub+zip" || file.name.toLowerCase().endsWith(".epub")) return "application/epub+zip";
  throw new Error("Choose an EPUB or PDF file.");
}

export async function importLocalBook(file: File): Promise<LocalBookFile> {
  if (file.size === 0) throw new Error("This file is empty.");
  if (file.size > MAX_LOCAL_FILE_BYTES) throw new Error("Files must be 50 MB or smaller.");
  const type = resolveFileType(file);
  const metadata: LocalBookFile = {
    id: crypto.randomUUID(),
    name: file.name,
    type,
    size: file.size,
    addedAt: new Date().toISOString(),
  };
  const record: StoredBookFile = { ...metadata, blob: file.slice(0, file.size, type) };

  await completeTransaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Could not save this file locally."));
  });
  return metadata;
}

export function listLocalBooks() {
  return completeTransaction<LocalBookFile[]>("readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const records = (request.result as StoredBookFile[]).map((record) => ({
        id: record.id,
        name: record.name,
        type: record.type,
        size: record.size,
        addedAt: record.addedAt,
      }));
      records.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
      resolve(records);
    };
    request.onerror = () => reject(request.error || new Error("Could not read local files."));
  });
}

export function getLocalBook(id: string) {
  return completeTransaction<StoredBookFile | null>("readonly", (store, resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve((request.result as StoredBookFile | undefined) || null);
    request.onerror = () => reject(request.error || new Error("Could not open this local file."));
  });
}

export function removeLocalBook(id: string) {
  return completeTransaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Could not remove this local file."));
  });
}

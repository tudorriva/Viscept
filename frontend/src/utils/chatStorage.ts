/**
 * Chat storage service — persists full chat sessions in IndexedDB
 * and metadata in localStorage for fast listing.
 *
 * Architecture:
 *   localStorage → ChatSessionMeta[] (list, sort, filter)
 *   IndexedDB    → full ChatSession objects (messages, diagram code)
 */

import type {
  ChatSession,
  ChatSessionMeta,
} from '../types/chat';
import { sessionToMeta } from '../types/chat';

// ── localStorage helpers (metadata) ───────────────────────────────────────────

const META_KEY = 'viscept_chat_sessions';

function loadMetas(): ChatSessionMeta[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMetas(metas: ChatSessionMeta[]): void {
  localStorage.setItem(META_KEY, JSON.stringify(metas));
}

const CURRENT_CHAT_KEY = 'viscept_current_chat_id';

export function getCurrentChatId(): string | null {
  return localStorage.getItem(CURRENT_CHAT_KEY);
}

export function setCurrentChatId(id: string | null): void {
  if (id) {
    localStorage.setItem(CURRENT_CHAT_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_CHAT_KEY);
  }
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

const DB_NAME = 'viscept_chats';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(id: string): Promise<ChatSession | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as ChatSession | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(session: ChatSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(session);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/** List all chat session metadata (sorted by updatedAt descending). */
export function listChatSessions(): ChatSessionMeta[] {
  return loadMetas().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/** Load a full chat session from IndexedDB. */
export async function loadChatSession(id: string): Promise<ChatSession | undefined> {
  return idbGet(id);
}

/** Save a full chat session (IndexedDB + metadata in localStorage). */
export async function saveChatSession(session: ChatSession): Promise<void> {
  // Persist full session
  await idbPut(session);

  // Update metadata list
  const metas = loadMetas();
  const meta = sessionToMeta(session);
  const idx = metas.findIndex((m) => m.id === session.id);
  if (idx >= 0) {
    metas[idx] = meta;
  } else {
    metas.push(meta);
  }
  saveMetas(metas);
}

/** Delete a chat session from both IndexedDB and metadata. */
export async function deleteChatSession(id: string): Promise<void> {
  await idbDelete(id);
  const metas = loadMetas().filter((m) => m.id !== id);
  saveMetas(metas);

  // If the deleted session was the current one, clear the pointer
  if (getCurrentChatId() === id) {
    setCurrentChatId(null);
  }
}

/** Rename a chat session title. */
export async function renameChatSession(id: string, newTitle: string): Promise<void> {
  const session = await idbGet(id);
  if (!session) return;
  session.title = newTitle;
  session.updatedAt = new Date().toISOString();
  await saveChatSession(session);
}

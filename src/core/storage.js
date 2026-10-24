// storage.js — wrapper localStorage yang aman (fallback memori bila diblokir/rusak)
const KEY_PREFIX = 'ninja-adventure:';

let memoryStore = null;
let healthy = true;

function isAvailable() {
  try {
    const k = '__adf_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function readJSON(key, fallback) {
  const full = KEY_PREFIX + key;
  try {
    const raw = localStorage.getItem(full);
    if (raw == null) return structuredClone(fallback);
    return JSON.parse(raw);
  } catch {
    healthy = false;
    try { localStorage.removeItem(full); } catch { /* noop */ }
    return structuredClone(fallback);
  }
}

export function writeJSON(key, value) {
  const full = KEY_PREFIX + key;
  try {
    localStorage.setItem(full, JSON.stringify(value));
    healthy = true;
    return true;
  } catch {
    healthy = false;
    memoryStore = { ...memoryStore, [key]: value };
    return false;
  }
}

export function removeKey(key) {
  try { localStorage.removeItem(KEY_PREFIX + key); } catch { /* noop */ }
  if (memoryStore) delete memoryStore[key];
}

export function storageHealthy() {
  return healthy;
}

export const HAS_LOCAL = typeof localStorage !== 'undefined' && isAvailable();

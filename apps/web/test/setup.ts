/**
 * Setup global dos testes web.
 * jsdom do vitest pode não expor localStorage em certas versões/ambientes:
 * polyfill mínimo compatível (contrato get/setItem/removeItem/clear).
 */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as { localStorage: Storage }).localStorage = new MemoryStorage();
}

import { afterEach } from 'vitest';

afterEach(() => {
  globalThis.localStorage?.clear?.();
});

// Cross-browser storage wrapper. Both Chrome (105+) and Firefox return Promises
// from extension storage APIs, but Firefox aliases `chrome.*` to callback-only
// shims; the modern Promise surface lives on `browser.*`. So we prefer the
// `browser` global when present and fall back to `chrome`.

const ext = (((globalThis as unknown) as { browser?: unknown }).browser ?? chrome) as typeof chrome;

export async function getItem<T = unknown>(key: string): Promise<T | undefined> {
  const result = await ext.storage.local.get(key);
  return result[key] as T | undefined;
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  await ext.storage.local.set({ [key]: value });
}

export async function removeItem(key: string): Promise<void> {
  await ext.storage.local.remove(key);
}

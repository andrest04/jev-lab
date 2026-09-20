// Per-viewer conveniences only (theme, policy, draft). Every access is guarded: storage
// can be blocked or throw, and the app must render correctly without it.

export const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore: nothing depends on persistence */
    }
  },
};

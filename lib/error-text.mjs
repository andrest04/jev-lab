// Pure display helper: map a stable error code to t("errors.{code}"), else the
// original English message. Takes `t` as an argument so this module never
// imports the app or the language store.

/**
 * @param {{ code?: string, message?: string, status?: number }} error
 * @param {(key: string, params?: Record<string, string | number>) => string} t
 * @returns {string}
 */
export function errorText(error, t) {
  const message = error?.message ?? "";
  if (!error?.code) return message;

  if (error.status != null) {
    const statusKey = `errors.${error.code}.${error.status}`;
    const specific = t(statusKey);
    if (specific !== statusKey) return specific;
  }

  const key = `errors.${error.code}`;
  const params = error.status != null ? { status: error.status } : undefined;
  const translated = t(key, params);
  if (translated === key) return message;
  return translated;
}

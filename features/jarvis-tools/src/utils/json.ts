export function safeJsonParse<T = unknown>(
  text: string
): { ok: true; value: T } | { ok: false; error: Error } {
  try {
    const value = JSON.parse(text) as T;
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: e as Error };
  }
}

export function safeJsonStringify(
  value: unknown,
  space?: number
): { ok: true; text: string } | { ok: false; error: Error } {
  try {
    const text = JSON.stringify(value, null, space);
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e as Error };
  }
}

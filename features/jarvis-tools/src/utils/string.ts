export function toKebabCase(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')
    .toLowerCase();
}

export function trimToUndefined(input: string | undefined | null): string | undefined {
  if (input == null) return undefined;
  const v = String(input).trim();
  return v === '' ? undefined : v;
}

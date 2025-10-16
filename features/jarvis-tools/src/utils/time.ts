export function formatDate(date: Date | number | string, pattern = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = date instanceof Date ? date : new Date(date);
  const Y = String(d.getFullYear());
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return pattern
    .replace('YYYY', Y)
    .replace('MM', M)
    .replace('DD', D)
    .replace('HH', h)
    .replace('mm', m)
    .replace('ss', s);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

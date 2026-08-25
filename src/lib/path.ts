/** A folder path without trailing separators ("/data/" → "/data"), keeping roots like "/" and "C:\". */
export function normalizeFolder(path: string): string {
  const trimmed = path.trim();
  const stripped = trimmed.replace(/[\\/]+$/, '');
  if (stripped === '') return trimmed === '' ? '' : trimmed[0]!;
  return /^[A-Za-z]:$/.test(stripped) ? trimmed.slice(0, 3) : stripped;
}

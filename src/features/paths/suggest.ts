export function splitPath(value: string): { dir: string; prefix: string } {
  const slash = value.lastIndexOf('/');
  return slash < 0 ? { dir: '', prefix: value } : { dir: value.slice(0, slash + 1), prefix: value.slice(slash + 1) };
}

const baseName = (path: string) => path.replace(/\/+$/, '').slice(path.replace(/\/+$/, '').lastIndexOf('/') + 1);

/** Folders in `entries` (absolute paths) whose name starts with what was typed after the last slash. */
export function pathSuggestions(value: string, entries: readonly string[], limit = 8): string[] {
  const { prefix } = splitPath(value);
  const needle = prefix.toLocaleLowerCase();
  return entries
    .filter((entry) => baseName(entry).toLocaleLowerCase().startsWith(needle) && entry !== value.replace(/\/+$/, ''))
    .sort((a, b) => baseName(a).localeCompare(baseName(b), undefined, { numeric: true, sensitivity: 'base' }))
    .slice(0, limit);
}

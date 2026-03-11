import { FILE_PRIORITY, type FilePriority, type TorrentFile } from '../../api/details';

export type PriorityName = 'skip' | 'normal' | 'high' | 'maximum';

export const PRIORITY_LABEL: Record<PriorityName | 'mixed', string> = { skip: 'Skip', normal: 'Normal', high: 'High', maximum: 'Maximum', mixed: 'Mixed' };
export const PRIORITY_VALUE: Record<PriorityName, FilePriority> = FILE_PRIORITY;

export function priorityName(priority: number): PriorityName {
  if (priority === 0) return 'skip';
  if (priority === 7) return 'maximum';
  if (priority === 6) return 'high';
  return 'normal';
}

export interface FileNode {
  kind: 'file' | 'folder';
  path: string;
  name: string;
  depth: number;
  size: number;
  progress: number;
  priority: PriorityName | 'mixed';
  check: boolean | 'mixed';
  ids: number[];
}

interface Folder {
  name: string;
  path: string;
  folders: Map<string, Folder>;
  files: TorrentFile[];
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

function buildTree(files: readonly TorrentFile[]): Folder {
  const root: Folder = { name: '', path: '', folders: new Map(), files: [] };
  for (const file of files) {
    const parts = file.name.split('/');
    let folder = root;
    for (const part of parts.slice(0, -1)) {
      let next = folder.folders.get(part);
      if (!next) {
        next = { name: part, path: folder.path ? `${folder.path}/${part}` : part, folders: new Map(), files: [] };
        folder.folders.set(part, next);
      }
      folder = next;
    }
    folder.files.push(file);
  }
  return root;
}

function descendants(folder: Folder): TorrentFile[] {
  return [...folder.files, ...[...folder.folders.values()].flatMap(descendants)];
}

function summarize(files: readonly TorrentFile[]): Pick<FileNode, 'size' | 'progress' | 'priority' | 'check' | 'ids'> {
  const size = files.reduce((sum, file) => sum + file.size, 0);
  const done = files.reduce((sum, file) => sum + file.size * file.progress, 0);
  const priorities = new Set(files.map((file) => priorityName(file.priority)));
  const skipped = files.filter((file) => file.priority === 0).length;
  return {
    size,
    progress: size > 0 ? done / size : 1,
    priority: priorities.size === 1 ? [...priorities][0]! : 'mixed',
    check: skipped === 0 ? true : skipped === files.length ? false : 'mixed',
    ids: files.map((file) => file.index),
  };
}

/** Flattened rows for the Files tab: folders first, natural name order, aggregates on folders. */
export function fileRows(files: readonly TorrentFile[], options: { collapsed: ReadonlySet<string>; query: string }): FileNode[] {
  const query = options.query.trim().toLocaleLowerCase();
  const rows: FileNode[] = [];
  const matches = (file: TorrentFile) => !query || baseName(file.name).toLocaleLowerCase().includes(query);

  const walk = (folder: Folder, depth: number) => {
    for (const child of [...folder.folders.values()].sort((a, b) => byName(a.name, b.name))) {
      const inside = descendants(child);
      if (query && !inside.some(matches)) continue;
      rows.push({ kind: 'folder', path: child.path, name: child.name, depth, ...summarize(inside) });
      if (query || !options.collapsed.has(child.path)) walk(child, depth + 1);
    }
    for (const file of [...folder.files].sort((a, b) => byName(baseName(a.name), baseName(b.name)))) {
      if (!matches(file)) continue;
      rows.push({ kind: 'file', path: file.name, name: baseName(file.name), depth, ...summarize([file]) });
    }
  };
  walk(buildTree(files), 0);
  return rows;
}

export function selectedSize(files: readonly TorrentFile[]): number {
  return files.reduce((sum, file) => sum + (file.priority === 0 ? 0 : file.size), 0);
}

export function renamedPath(path: string, newName: string): string {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? newName : `${path.slice(0, slash)}/${newName}`;
}

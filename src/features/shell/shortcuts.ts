/** Every keyboard shortcut: shown in the Keyboard Shortcuts dialog and the README table. */
export interface Shortcut {
  group: 'Torrents' | 'General';
  label: string;
  /** Alternatives, each a key combination; "Mod" is Ctrl, or ⌘ on macOS, and "Alt" is ⌥ there. */
  keys: string[][];
  /** The README's Keys column and, when it differs from the label, its Action column. */
  readme: string;
  readmeAction?: string;
}

export const SHORTCUTS: Shortcut[] = [
  { group: 'Torrents', label: 'Move between torrents', keys: [['↑'], ['↓']], readme: '↑ / ↓' },
  { group: 'Torrents', label: 'Extend the selection', keys: [['Shift', '↑'], ['Shift', '↓']], readme: 'Shift + ↑ / ↓' },
  { group: 'Torrents', label: 'Start or stop', keys: [['Space']], readme: 'Space' },
  { group: 'Torrents', label: 'Delete', keys: [['Delete'], ['Backspace']], readme: 'Delete / Backspace', readmeAction: 'Delete…' },
  { group: 'Torrents', label: 'Rename', keys: [['F2']], readme: 'F2', readmeAction: 'Rename…' },
  { group: 'Torrents', label: 'Select all', keys: [['Mod', 'A']], readme: 'Ctrl/Cmd + A' },
  { group: 'General', label: 'Search', keys: [['Mod', 'F']], readme: 'Ctrl/Cmd + F · type anywhere' },
  { group: 'General', label: 'Add torrents', keys: [['Mod', 'O']], readme: 'Ctrl/Cmd + O' },
  { group: 'General', label: 'Preferences', keys: [['Mod', ',']], readme: 'Ctrl/Cmd + ,' },
  { group: 'General', label: 'Keyboard shortcuts', keys: [['Mod', '?']], readme: 'Ctrl/Cmd + ?' },
  { group: 'General', label: 'Add from the clipboard', keys: [['Mod', 'V']], readme: 'Paste (nothing focused)', readmeAction: 'Add magnet links or URLs' },
  {
    group: 'General',
    label: 'List / table view',
    keys: [['Alt', '1'], ['Alt', '2'], ['Mod', '1'], ['Mod', '2']],
    readme: 'Alt + 1 / 2 (or Ctrl/Cmd + 1 / 2)',
    readmeAction: 'List / Table view',
  },
  { group: 'Torrents', label: 'Open details', keys: [['Enter']], readme: 'Enter' },
  {
    group: 'General',
    label: 'Close or go back',
    keys: [['Esc']],
    readme: 'Esc',
    readmeAction: 'Close menu or dialog → clear search → close search → leave selection mode → close details',
  },
];

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export interface IconPath {
  d: string;
  fill?: boolean;
}

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;

const definitions = {
  pause: [{ d: 'M4.2 2.5h1.2a1.2 1.2 0 0 1 1.2 1.2v8.6a1.2 1.2 0 0 1-1.2 1.2H4.2A1.2 1.2 0 0 1 3 12.3V3.7a1.2 1.2 0 0 1 1.2-1.2zm6.4 0h1.2A1.2 1.2 0 0 1 13 3.7v8.6a1.2 1.2 0 0 1-1.2 1.2h-1.2a1.2 1.2 0 0 1-1.2-1.2V3.7a1.2 1.2 0 0 1 1.2-1.2z', fill: true }],
  play: [{ d: 'M4.5 2.9v10.2c0 .7.8 1.2 1.4.8l8-5.1c.6-.4.6-1.2 0-1.6l-8-5.1c-.6-.4-1.4.1-1.4.8z', fill: true }],
  'go-down': [{ d: 'M8 2.2v11M3.2 8.6 8 13.3l4.8-4.7' }],
  'go-up': [{ d: 'M8 13.8v-11M3.2 7.4 8 2.7l4.8 4.7' }],
  exclamation: [{ d: `M7 3.5a1 1 0 0 1 2 0v5.5a1 1 0 0 1-2 0z${circle(8, 12.2, 1.25)}`, fill: true }],
  warning: [{ d: 'M8 1.8 14.6 13.6H1.4z' }, { d: 'M8 6.2v3.3M8 11.6v.1' }],
  folder: [{ d: 'M1.8 4.3c0-.7.5-1.2 1.2-1.2h3.2l1.6 1.6h5.2c.7 0 1.2.5 1.2 1.2v6.3c0 .7-.5 1.2-1.2 1.2H3c-.7 0-1.2-.5-1.2-1.2z' }],
  tag: [{ d: 'M2.2 2.2h5.4l6.3 6.3-5.4 5.4-6.3-6.3z' }, { d: circle(5.3, 5.3, 1.1), fill: true }],
  'pan-down': [{ d: 'M3.2 5.8 8 10.6l4.8-4.8' }],
  'pan-end': [{ d: 'M5.8 3.2 10.6 8l-4.8 4.8' }],
  magnet: [{ d: 'M3.1 2.3h3v5.5a1.9 1.9 0 0 0 3.8 0V2.3h3v5.5a4.9 4.9 0 0 1-9.8 0z' }, { d: 'M3.1 5h3M9.9 5h3' }],
  offline: [{ d: 'M5 2.3v11.4M2.4 11.1 5 13.7l2.6-2.6M11 13.7V2.3M8.4 4.9 11 2.3l2.6 2.6' }, { d: 'M2 2l12 12' }],
  close: [{ d: 'm3.8 3.8 8.4 8.4m0-8.4-8.4 8.4' }],
  check: [{ d: 'M2.8 8.4 6.4 12l6.8-7.8' }],
  'pan-start': [{ d: 'M10.2 3.2 5.4 8l4.8 4.8' }],
  'open-menu': [{ d: 'M2.5 3.8h11M2.5 8h11M2.5 12.2h11' }],
  'view-more': [{ d: `${circle(8, 3.2, 1.45)}${circle(8, 8, 1.45)}${circle(8, 12.8, 1.45)}`, fill: true }],
  'selection-mode': [{ d: 'M4.5 2h7A2.5 2.5 0 0 1 14 4.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 11.5v-7A2.5 2.5 0 0 1 4.5 2z' }, { d: 'm5 8.2 2.1 2.1L11.2 6' }],
  'list-add': [{ d: 'M8 3v10M3 8h10' }],
  'list-remove': [{ d: 'M3 8h10' }],
  trash: [{ d: 'M2.3 4.3h11.4M6 4.3V2.6h4v1.7M3.8 4.3l.8 9.3h6.8l.8-9.3' }],
} satisfies Record<string, IconPath[]>;

export type IconName = keyof typeof definitions;
export const ICONS: Record<IconName, IconPath[]> = definitions;

import type { PrefDef, Prefs } from './schema';

/** A limit row's UI value: whether the limit is on, and its number. */
export interface LimitValue {
  on: boolean;
  value: number;
}

const num = (value: unknown, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const pad = (n: number) => String(n).padStart(2, '0');
const round = (value: number, digits = 0) => Number(value.toFixed(digits));

/** A preference in the units and shape its row edits (KiB/s, MiB, on/off limits, list items, HH:MM). */
export function toUi(def: PrefDef, prefs: Prefs): unknown {
  const raw = prefs[def.key];
  switch (def.kind) {
    case 'switch':
      return raw === true;
    case 'spin':
      return round(num(raw) / (def.scale ?? 1), def.digits ?? 0);
    case 'limit': {
      const on = def.enabledKey ? prefs[def.enabledKey] === true : num(raw, -1) > 0;
      return { on, value: on ? num(raw, def.fallback) : def.fallback } satisfies LimitValue;
    }
    case 'combo':
      return raw;
    case 'list':
      return String(raw ?? '')
        .split(def.separator === '\n' ? /\r?\n/ : def.separator)
        .map((item) => item.trim())
        .filter(Boolean);
    case 'time':
      return `${pad(num(raw))}:${pad(num(prefs[def.minuteKey]))}`;
    case 'entry':
    case 'path':
      return typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
    case 'subpage':
    case 'custom':
      return raw;
  }
}

/** The API changes for a row's UI value (only the keys this row owns). */
export function fromUi(def: PrefDef, ui: unknown, prefs: Prefs): Prefs {
  switch (def.kind) {
    case 'spin': {
      const scale = def.scale ?? 1;
      const value = num(ui);
      return { [def.key]: scale === 1 ? round(value, def.digits ?? 0) : Math.round(value * scale) };
    }
    case 'limit': {
      const { on, value } = ui as LimitValue;
      if (def.enabledKey) return on ? { [def.enabledKey]: true, [def.key]: value } : { [def.enabledKey]: false };
      return { [def.key]: on ? value : -1 };
    }
    case 'list': {
      const joiner = def.separator === '\n' ? '\n' : def.separator;
      return { [def.key]: (ui as string[]).map((item) => item.trim()).filter(Boolean).join(joiner) };
    }
    case 'time': {
      const [hour = 0, minute = 0] = String(ui).split(':').map((part) => Number.parseInt(part, 10));
      return { [def.key]: hour, [def.minuteKey]: minute };
    }
    default:
      void prefs;
      return { [def.key]: ui };
  }
}

/** True when sending `changes` would not change anything the server has. */
export function sameAsServer(changes: Prefs, server: Prefs): boolean {
  return Object.entries(changes).every(([key, value]) => JSON.stringify(server[key]) === JSON.stringify(value));
}

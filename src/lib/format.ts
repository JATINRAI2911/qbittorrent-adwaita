/** qBittorrent reports this ETA when a download will never finish. */
export const ETA_INFINITY = 8_640_000;

const UNITS = ['kB', 'MB', 'GB', 'TB', 'PB'] as const;

/** GLib `g_format_size` style: SI units (base 1000), one decimal place. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '–';
  if (bytes < 1000) return bytes === 1 ? '1 byte' : `${Math.round(bytes)} bytes`;
  let value = bytes / 1000;
  let unit = 0;
  while (Math.round(value * 10) / 10 >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${value.toFixed(1)} ${UNITS[unit]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds >= ETA_INFINITY) return '';
  if (seconds < 60) return 'less than a minute left';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min left`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} left`;
}

export function formatPercent(progress: number): string {
  if (!Number.isFinite(progress) || progress <= 0) return '0%';
  if (progress >= 1) return '100%';
  return `${(Math.floor(progress * 1000) / 10).toFixed(1)}%`;
}

export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio < 0) return '–';
  if (ratio >= 9999) return '∞';
  return ratio.toFixed(2);
}

const countFormat = new Intl.NumberFormat();
export function formatCount(n: number): string {
  return countFormat.format(n);
}

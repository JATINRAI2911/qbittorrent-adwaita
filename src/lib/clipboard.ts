/**
 * Copies text. The Clipboard API needs a secure context (https or localhost); a Web UI opened over
 * plain http on a LAN address falls back to a hidden textarea + execCommand.
 */
export async function copyText(
  text: string,
  nav: Pick<Navigator, 'clipboard'> | undefined = globalThis.navigator,
  doc: Document = document,
): Promise<void> {
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text);
      return;
    } catch {
      // fall through to the legacy path
    }
  }
  const area = doc.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  doc.body.appendChild(area);
  area.select();
  const copied = typeof doc.execCommand === 'function' && doc.execCommand('copy');
  area.remove();
  if (!copied) throw new Error('Clipboard unavailable');
}

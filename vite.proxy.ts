import type { ProxyOptions } from 'vite';

type CsrfHeaders = { origin?: string; referer?: string };

/**
 * qBittorrent rejects requests whose Origin/Referer don't match its own origin (CSRF check).
 * During development the page lives on the Vite origin, so the proxy rewrites both headers.
 */
export function rewriteCsrfHeaders(headers: CsrfHeaders, target: string): CsrfHeaders {
  const origin = new URL(target).origin;
  const out: CsrfHeaders = {};
  if (headers.origin) out.origin = origin;
  if (headers.referer) {
    const ref = new URL(headers.referer);
    out.referer = origin + ref.pathname + ref.search;
  }
  return out;
}

export function qbtProxy(target: string): ProxyOptions {
  return {
    target,
    changeOrigin: true, // also satisfies qBittorrent's Host header validation
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq) => {
        const next = rewriteCsrfHeaders(
          {
            origin: proxyReq.getHeader('origin') as string | undefined,
            referer: proxyReq.getHeader('referer') as string | undefined,
          },
          target,
        );
        if (next.origin) proxyReq.setHeader('origin', next.origin);
        if (next.referer) proxyReq.setHeader('referer', next.referer);
      });
    },
  };
}

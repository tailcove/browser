import type { LogContext } from './types.js';

/**
 * Automatic per-page enrichment: URL, user agent, and viewport size.
 * Computed fresh on every call (unlike the Node client's baseContext(),
 * cached once per process) — url/viewport genuinely change within a
 * single-page app's lifetime, so caching them at construction time would
 * go stale.
 */
export function pageContext(): LogContext {
    if (typeof window === 'undefined') {
        return {};
    }

    return {
        url: window.location?.href,
        userAgent: window.navigator?.userAgent,
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
        },
    };
}

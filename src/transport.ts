import type { LogLine } from './types.js';

/**
 * Builds the URL a batch ships to — the browser key travels as a query
 * param, not a header: `navigator.sendBeacon()` cannot set custom headers,
 * so the key has to be reachable from the URL alone for beacon delivery
 * (the unload-safe path) to work at all. Both send functions below use
 * this same URL, so a server-side observer sees one consistent auth shape
 * regardless of which transport actually carried a given batch.
 */
function buildUrl(endpoint: string, key: string): string {
    const url = new URL(endpoint);
    url.searchParams.set('key', key);

    return url.toString();
}

function ndjson(batch: readonly LogLine[]): string {
    return batch.map((line) => JSON.stringify(line)).join('\n');
}

/**
 * Normal-operation flush: a real fetch with a JSON content type. This is
 * deliberately NOT a "simple request" — it requires a CORS preflight,
 * which the server's AuthenticateBrowserKey middleware answers. Throws on
 * a network failure or non-2xx response; callers decide whether that's
 * swallowed or reported via onError.
 */
export async function sendViaFetch(
    endpoint: string,
    key: string,
    batch: readonly LogLine[],
    timeoutMs: number,
): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(buildUrl(endpoint, key), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: ndjson(batch),
            keepalive: true,
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(
                `tailcove: ingest endpoint responded with status ${response.status}`,
            );
        }
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Unload/hidden flush: navigator.sendBeacon with a plain-text body — a
 * "simple request" that never triggers a CORS preflight, which is *why*
 * beacon delivery is reliable at unload (a preflight round-trip would
 * never complete before the page is gone). Returns whether the browser
 * accepted the beacon for delivery, not whether the server accepted the
 * batch — sendBeacon() is fire-and-forget by design, so there's no
 * response to inspect. Callers fall back to sendViaFetch(..., keepalive)
 * when this returns false (queue full, payload too large, or the API
 * isn't available at all).
 */
export function sendViaBeacon(
    endpoint: string,
    key: string,
    batch: readonly LogLine[],
): boolean {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
        return false;
    }

    const blob = new Blob([ndjson(batch)], { type: 'text/plain' });

    return navigator.sendBeacon(buildUrl(endpoint, key), blob);
}

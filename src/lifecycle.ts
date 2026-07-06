export interface UnloadFlushable {
    flushOnUnload(): void;
}

const instances = new Set<UnloadFlushable>();

let listenersRegistered = false;

/**
 * Registers a client for the shared unload/visibilitychange flush. Window
 * and document listeners are added once per page, not once per client —
 * mirroring the Node client's beforeExit/SIGTERM registry (shutdown.ts) —
 * so a page that creates multiple Tailcove instances over its lifetime
 * (hot reload, multiple sources) doesn't accumulate a growing pile of
 * listeners on the shared window/document.
 */
export function registerForLifecycleFlush(client: UnloadFlushable): void {
    instances.add(client);
    ensureListeners();
}

export function unregisterFromLifecycleFlush(client: UnloadFlushable): void {
    instances.delete(client);
}

function ensureListeners(): void {
    if (
        listenersRegistered ||
        typeof window === 'undefined' ||
        typeof document === 'undefined'
    ) {
        return;
    }

    listenersRegistered = true;

    // A hidden tab (visibilitychange -> 'hidden') is the reliable unload
    // signal across desktop and mobile browsers — 'pagehide' is registered
    // too since some navigations (especially on iOS Safari) fire it
    // without a preceding visibilitychange.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushAll();
        }
    });

    window.addEventListener('pagehide', () => {
        flushAll();
    });
}

function flushAll(): void {
    for (const client of instances) {
        client.flushOnUnload();
    }
}

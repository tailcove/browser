import { pageContext } from './context.js';
import { normalizeLevel } from './levels.js';
import {
    registerForLifecycleFlush,
    unregisterFromLifecycleFlush,
} from './lifecycle.js';
import { sendViaBeacon, sendViaFetch } from './transport.js';
import type { LogContext, LogLevel, LogLine, TailcoveOptions } from './types.js';

const DEFAULT_ENDPOINT = 'https://ingest.tailcove.dev/api/v1/browser/logs';
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_BATCH_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Batches log/error lines in memory and ships them to a Tailcove source's
 * browser ingest endpoint — up to `batchSize` lines or `batchIntervalMs`,
 * whichever comes first, mirroring the other clients' thresholds (scaled
 * down: 20/2s rather than 50/2s, since a browser tab produces far less
 * volume than a server process). Never throws: every public method
 * swallows its own failures and reports them to `onError` if one was
 * given, otherwise drops them silently.
 */
export class Tailcove {
    private readonly endpoint: string;
    private readonly key: string;
    private readonly batchSize: number;
    private readonly batchIntervalMs: number;
    private readonly timeoutMs: number;
    private readonly globalContext: LogContext;
    private readonly enabled: boolean;
    private readonly onError?: (error: unknown) => void;

    private buffer: LogLine[] = [];
    private timer: ReturnType<typeof setTimeout> | null = null;

    constructor(options: TailcoveOptions) {
        this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
        this.key = options.key;
        this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
        this.batchIntervalMs =
            options.batchIntervalMs ?? DEFAULT_BATCH_INTERVAL_MS;
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.globalContext = options.context ?? {};
        this.enabled = options.enabled ?? true;
        this.onError = options.onError;

        registerForLifecycleFlush(this);
    }

    log(level: LogLevel, message: string, context: LogContext = {}): void {
        if (!this.enabled) {
            return;
        }

        try {
            this.buffer.push({
                message,
                level: normalizeLevel(level),
                context: {
                    ...pageContext(),
                    ...this.globalContext,
                    ...context,
                },
                host:
                    typeof window !== 'undefined'
                        ? window.location.hostname
                        : '',
                ts: new Date().toISOString(),
            });

            if (this.buffer.length === 1) {
                this.scheduleFlush();
            }

            if (this.buffer.length >= this.batchSize) {
                void this.flush();
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    debug(message: string, context?: LogContext): void {
        this.log('debug', message, context);
    }

    info(message: string, context?: LogContext): void {
        this.log('info', message, context);
    }

    notice(message: string, context?: LogContext): void {
        this.log('notice', message, context);
    }

    warning(message: string, context?: LogContext): void {
        this.log('warning', message, context);
    }

    /** Alias for warning() — console.warn is the naming a JS/browser caller expects. */
    warn(message: string, context?: LogContext): void {
        this.warning(message, context);
    }

    error(message: string, context?: LogContext): void {
        this.log('error', message, context);
    }

    critical(message: string, context?: LogContext): void {
        this.log('critical', message, context);
    }

    alert(message: string, context?: LogContext): void {
        this.log('alert', message, context);
    }

    emergency(message: string, context?: LogContext): void {
        this.log('emergency', message, context);
    }

    /** Sends whatever is buffered right now via a normal fetch. Safe to call directly. Never throws. */
    async flush(): Promise<void> {
        const batch = this.takeBuffer();

        if (batch === null) {
            return;
        }

        try {
            await sendViaFetch(this.endpoint, this.key, batch, this.timeoutMs);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Forces a flush using the beacon-first strategy — called on page
     * unload/hide, where a batching timer or an in-flight fetch would
     * otherwise be cancelled before it completes. sendBeacon is what
     * actually needs to fire here, not the regular flush() path: a
     * scheduled setTimeout or a fetch already in flight has no guarantee
     * of running to completion once the page starts unloading.
     */
    flushOnUnload(): void {
        const batch = this.takeBuffer();

        if (batch === null) {
            return;
        }

        const sent = sendViaBeacon(this.endpoint, this.key, batch);

        if (!sent) {
            void sendViaFetch(this.endpoint, this.key, batch, this.timeoutMs).catch(
                (error) => this.handleError(error),
            );
        }
    }

    private takeBuffer(): LogLine[] | null {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.buffer.length === 0) {
            return null;
        }

        const batch = this.buffer;
        this.buffer = [];

        return batch;
    }

    /**
     * Flushes and stops participating in the shared unload/visibilitychange
     * flush (see lifecycle.ts). Call this if you're tearing a client down
     * before the page itself unloads (e.g. a framework adapter unmounting).
     */
    destroy(): void {
        this.flushOnUnload();
        unregisterFromLifecycleFlush(this);
    }

    private scheduleFlush(): void {
        if (this.timer) {
            return;
        }

        this.timer = setTimeout(() => {
            void this.flush();
        }, this.batchIntervalMs);
    }

    private handleError(error: unknown): void {
        try {
            this.onError?.(error);
        } catch {
            // onError itself must never be able to throw back into the caller.
        }
    }
}

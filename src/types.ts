/** Syslog-style levels, matching the set the ingest endpoint normalizes to (see the log-ingestion skill). Unrecognized strings fall back to `info`, same as the server. */
export type LogLevel =
    | 'debug'
    | 'info'
    | 'notice'
    | 'warning'
    | 'error'
    | 'critical'
    | 'alert'
    | 'emergency';

export const LOG_LEVELS: readonly LogLevel[] = [
    'debug',
    'info',
    'notice',
    'warning',
    'error',
    'critical',
    'alert',
    'emergency',
];

export type LogContext = Record<string, unknown>;

/**
 * The cross-client structured exception shape from the log-ingestion
 * skill — every client that renders a caught exception (rather than a
 * flat string) uses this same field set, since Milestone 11 fingerprinting
 * groups errors by matching on it regardless of which client reported it.
 */
export interface FormattedException {
    class: string;
    message: string;
    location: string;
    trace: string[];
}

/** Wire shape sent to the ingest endpoint — one JSON object per line. */
export interface LogLine {
    message: string;
    level: LogLevel;
    context: LogContext;
    host: string;
    ts: string;
}

export interface TailcoveOptions {
    /** The source's browser key — public by design, see the log-ingestion skill's "Browser client" section. */
    key: string;
    /** Defaults to `https://ingest.tailcove.com/api/v1/browser/logs`. */
    endpoint?: string;
    /** Flush once this many records are buffered. Defaults to 20. */
    batchSize?: number;
    /** Flush once this many milliseconds have passed since the first buffered record. Defaults to 2000. */
    batchIntervalMs?: number;
    /** Milliseconds before a delivery attempt gives up. Defaults to 2000. */
    timeoutMs?: number;
    /** Merged into every line's context, underneath the per-call context. */
    context?: LogContext;
    /** Set `false` to keep the client silent — nothing is buffered or sent. Defaults to `true`. */
    enabled?: boolean;
    /** Called when a batch fails to send. Errors are otherwise dropped silently. */
    onError?: (error: unknown) => void;
    /** Automatic capture hooks — all off by default to avoid noise. See `installAutoCapture`. */
    captureWindowErrors?: boolean;
    captureUnhandledRejections?: boolean;
    /** Opt-in and sampled — console.error is often noisy/expected in dev. */
    captureConsoleErrors?: boolean;
    /** Fraction of console.error calls captured when captureConsoleErrors is on. Defaults to 1 (all). */
    consoleSampleRate?: number;
    /** Frames kept per captured exception. Defaults to 10, matching the other clients' exception_trace_limit convention. */
    traceLimit?: number;
}

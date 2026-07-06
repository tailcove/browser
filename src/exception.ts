import type { FormattedException } from './types.js';

// V8 (Chrome/Edge/Node): "    at fnName (url:line:col)" or "    at url:line:col".
const V8_FRAME = /at\s+(?:.*\s+)?\(?(.+):(\d+):(\d+)\)?$/;

// Firefox/Safari: "fnName@url:line:col" or "@url:line:col" — no leading "at".
const WEBKIT_FRAME = /@(.+):(\d+):(\d+)$/;

/**
 * Renders a caught value into the cross-client structured exception shape
 * from the log-ingestion skill: `{class, message, location, trace}`. This
 * MUST match the PHP ExceptionFormatter / Python format_exception() field
 * set exactly, since Milestone 11 fingerprinting groups a browser error
 * alongside a server-side one of the same shape.
 *
 * `location` is best-effort, parsed from the first stack frame — it's only
 * meaningful against an unminified build. Sourcemap resolution is out of
 * scope for this client (see the docs' "Browser / JS" page).
 */
export function formatError(
    error: unknown,
    traceLimit = 10,
): FormattedException {
    if (!(error instanceof Error)) {
        return {
            class: 'Error',
            message: typeof error === 'string' ? error : safeStringify(error),
            location: 'unknown:0',
            trace: [],
        };
    }

    const frames = stackFrames(error.stack);

    return {
        class: error.name || 'Error',
        message: error.message,
        location: frames.length > 0 ? frameLocation(frames[0]) : 'unknown:0',
        trace: frames.slice(0, traceLimit),
    };
}

/**
 * Splits `error.stack` into just the frame lines, dropping the leading
 * "Name: message" header V8 includes (Firefox/Safari's .stack has no such
 * header) — detected by checking whether the first line itself looks like
 * a frame, rather than assuming one engine's format.
 */
function stackFrames(stack: string | undefined): string[] {
    if (!stack) {
        return [];
    }

    const lines = stack
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length === 0) {
        return [];
    }

    const looksLikeFrame = (line: string): boolean =>
        V8_FRAME.test(line) || WEBKIT_FRAME.test(line);

    return looksLikeFrame(lines[0]) ? lines : lines.slice(1);
}

function frameLocation(frame: string): string {
    const v8Match = frame.match(V8_FRAME);

    if (v8Match) {
        return `${v8Match[1]}:${v8Match[2]}`;
    }

    const webkitMatch = frame.match(WEBKIT_FRAME);

    if (webkitMatch) {
        return `${webkitMatch[1]}:${webkitMatch[2]}`;
    }

    return 'unknown:0';
}

function safeStringify(value: unknown): string {
    try {
        return JSON.stringify(value) ?? String(value);
    } catch {
        return String(value);
    }
}

import type { Tailcove } from './client.js';
import { formatError } from './exception.js';
import type { TailcoveOptions } from './types.js';

export type AutoCaptureOptions = Pick<
    TailcoveOptions,
    | 'captureWindowErrors'
    | 'captureUnhandledRejections'
    | 'captureConsoleErrors'
    | 'consoleSampleRate'
    | 'traceLimit'
>;

/**
 * Wires window.onerror, unhandledrejection, and (opt-in, sampled)
 * console.error interception into a Tailcove client — each rendered
 * through formatError() into context.exception, matching the cross-client
 * exception shape so Milestone 11 fingerprinting groups a browser error
 * alongside a server-side one of the same shape. All three flags default
 * to off: an SDK that starts capturing everything by default is a noisy
 * SDK, and a host app should opt into each surface deliberately.
 */
export function installAutoCapture(
    client: Tailcove,
    options: AutoCaptureOptions,
): void {
    if (typeof window === 'undefined') {
        return;
    }

    const traceLimit = options.traceLimit;

    if (options.captureWindowErrors) {
        window.addEventListener('error', (event: ErrorEvent) => {
            const error = event.error instanceof Error ? event.error : event.message;
            report(client, error, traceLimit);
        });
    }

    if (options.captureUnhandledRejections) {
        window.addEventListener(
            'unhandledrejection',
            (event: PromiseRejectionEvent) => {
                report(client, event.reason, traceLimit);
            },
        );
    }

    if (options.captureConsoleErrors) {
        const sampleRate = options.consoleSampleRate ?? 1;
        const originalConsoleError = console.error.bind(console);

        console.error = (...args: unknown[]) => {
            originalConsoleError(...args);

            if (Math.random() <= sampleRate) {
                const [first] = args;
                report(client, first, traceLimit, args.map(String).join(' '));
            }
        };
    }
}

function report(
    client: Tailcove,
    error: unknown,
    traceLimit: number | undefined,
    fallbackMessage?: string,
): void {
    const formatted = formatError(error, traceLimit);

    client.error(fallbackMessage ?? formatted.message, {
        exception: formatted,
    });
}

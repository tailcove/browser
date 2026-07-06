import { afterEach, describe, expect, it, vi } from 'vitest';
import { installAutoCapture } from '../src/capture.js';
import { Tailcove } from '../src/client.js';
import { linesFromCall, stubFetchOk } from './helpers.js';

// Dispatching a synthetic ErrorEvent through window.dispatchEvent() runs
// its default action (jsdom's own "report exception" logging) unless
// something calls preventDefault() — registered once, before any test's
// own listener, so real browsers' actual window.onerror behavior (the
// listener still runs; only the default logging is suppressed) is what
// these tests exercise, without jsdom escalating the synthetic event into
// a real unhandled exception.
window.addEventListener('error', (event) => {
    event.preventDefault();
});

describe('installAutoCapture', () => {
    const originalConsoleError = console.error;

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        console.error = originalConsoleError;
    });

    it('does nothing when every flag is off (the default)', () => {
        const client = new Tailcove({ key: 'k' });
        const errorSpy = vi.spyOn(client, 'error');

        installAutoCapture(client, {});

        window.dispatchEvent(new ErrorEvent('error', { error: new Error('x') }));

        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('captures window.onerror when captureWindowErrors is on', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({ key: 'k' });

        installAutoCapture(client, { captureWindowErrors: true });

        window.dispatchEvent(
            new ErrorEvent('error', { error: new TypeError('window error') }),
        );
        await client.flush();

        const [line] = linesFromCall(fetchMock) as Array<
            Record<string, unknown>
        >;
        expect(line.level).toBe('error');
        const exception = line.context as { exception: { class: string } };
        expect(exception.exception.class).toBe('TypeError');
    });

    it('captures unhandledrejection when captureUnhandledRejections is on', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({ key: 'k' });

        installAutoCapture(client, { captureUnhandledRejections: true });

        const event = new Event(
            'unhandledrejection',
        ) as PromiseRejectionEvent & { reason: unknown };
        Object.defineProperty(event, 'reason', {
            value: new Error('rejected'),
        });
        window.dispatchEvent(event);
        await client.flush();

        const [line] = linesFromCall(fetchMock) as Array<
            Record<string, unknown>
        >;
        const exception = line.context as {
            exception: { message: string };
        };
        expect(exception.exception.message).toBe('rejected');
    });

    it('captures console.error when captureConsoleErrors is on, at the given sample rate', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({ key: 'k' });

        installAutoCapture(client, {
            captureConsoleErrors: true,
            consoleSampleRate: 1,
        });

        console.error('something went wrong', { detail: 42 });
        await client.flush();

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('never captures console.error at a sample rate of 0', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({ key: 'k' });

        installAutoCapture(client, {
            captureConsoleErrors: true,
            consoleSampleRate: 0,
        });

        console.error('sampled out');
        await client.flush();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('still calls the original console.error so devtools output is unaffected', () => {
        const client = new Tailcove({ key: 'k' });
        const consoleErrorMock = vi.fn();
        console.error = consoleErrorMock;

        installAutoCapture(client, { captureConsoleErrors: true });
        console.error('visible in devtools');

        expect(consoleErrorMock).toHaveBeenCalledWith('visible in devtools');
    });
});

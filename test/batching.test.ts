import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tailcove } from '../src/client.js';
import { flushMicrotasks, linesFromCall, stubFetchOk } from './helpers.js';

describe('batching', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('flushes once batchSize (20 by default) is reached, before the interval elapses', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            key: 'k',
            batchSize: 2,
            batchIntervalMs: 100_000,
        });

        client.log('info', 'one');
        expect(fetchMock).not.toHaveBeenCalled();

        client.log('info', 'two');
        await flushMicrotasks();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const lines = linesFromCall(fetchMock);
        expect(lines).toHaveLength(2);
        expect(lines[0]).toMatchObject({ message: 'one', level: 'info' });
        expect(lines[1]).toMatchObject({ message: 'two', level: 'info' });
    });

    it('flushes after batchIntervalMs (2s by default) even if batchSize was never reached', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            key: 'k',
            batchSize: 50,
            batchIntervalMs: 2_000,
        });

        client.log('info', 'lonely line');
        expect(fetchMock).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(2_000);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(linesFromCall(fetchMock)).toHaveLength(1);
    });

    it('does not send a request while under both thresholds', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            key: 'k',
            batchSize: 50,
            batchIntervalMs: 2_000,
        });

        client.log('info', 'not yet');
        await vi.advanceTimersByTimeAsync(1_000);

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('flush() sends immediately regardless of thresholds', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            key: 'k',
            batchSize: 50,
            batchIntervalMs: 100_000,
        });

        client.log('info', 'first');
        await client.flush();

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('flush() is a no-op when nothing is buffered', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({ key: 'k' });

        await client.flush();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends the key as a query param, JSON content type, with keepalive', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            key: 'secret-key',
            endpoint: 'https://ingest.example.test/api/v1/browser/logs',
        });

        client.log('error', 'boom', { orderId: 42 });
        await client.flush();

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe(
            'https://ingest.example.test/api/v1/browser/logs?key=secret-key',
        );
        expect((init.headers as Record<string, string>)['Content-Type']).toBe(
            'application/json',
        );
        expect(init.keepalive).toBe(true);

        const [line] = linesFromCall(fetchMock) as Array<
            Record<string, unknown>
        >;
        expect(line.message).toBe('boom');
        expect(line.level).toBe('error');
        expect((line.context as Record<string, unknown>).orderId).toBe(42);
        expect(typeof line.host).toBe('string');
        expect(typeof line.ts).toBe('string');
    });

    it('merges page context, global context, and per-call context, with per-call winning', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            key: 'k',
            context: { service: 'checkout', region: 'us-east' },
        });

        client.log('info', 'hi', { region: 'eu-west' });
        await client.flush();

        const [line] = linesFromCall(fetchMock) as Array<
            Record<string, unknown>
        >;
        const context = line.context as Record<string, unknown>;
        expect(context.service).toBe('checkout');
        expect(context.region).toBe('eu-west');
        expect(typeof context.url).toBe('string');
        expect(typeof context.userAgent).toBe('string');
        expect(context.viewport).toMatchObject({
            width: expect.any(Number),
            height: expect.any(Number),
        });
    });

    it('does nothing when enabled is false', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({ key: 'k', enabled: false });

        client.log('info', 'should be dropped');
        await client.flush();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('normalizes an unrecognized level to info instead of throwing', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({ key: 'k' });

        // @ts-expect-error deliberately passing a level outside the LogLevel union
        client.log('trace', 'weird level');
        await client.flush();

        const [line] = linesFromCall(fetchMock) as Array<
            Record<string, unknown>
        >;
        expect(line.level).toBe('info');
    });

    it('warn() is an alias for warning()', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({ key: 'k' });

        client.warn('careful');
        await client.flush();

        const [line] = linesFromCall(fetchMock) as Array<
            Record<string, unknown>
        >;
        expect(line.level).toBe('warning');
    });
});

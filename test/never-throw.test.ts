import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tailcove } from '../src/client.js';
import { stubFetchRejecting } from './helpers.js';

describe('never throws', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('flush() resolves (does not reject) when the network call fails', async () => {
        stubFetchRejecting(new Error('network is down'));
        const client = new Tailcove({ key: 'k' });

        client.log('error', 'will fail to send');

        await expect(client.flush()).resolves.toBeUndefined();
    });

    it('reports delivery failures through onError, silently otherwise', async () => {
        const error = new Error('network is down');
        stubFetchRejecting(error);
        const onError = vi.fn();
        const client = new Tailcove({ key: 'k', onError });

        client.log('error', 'oops');
        await client.flush();

        expect(onError).toHaveBeenCalledWith(error);
    });

    it('never throws even if onError itself throws', async () => {
        stubFetchRejecting(new Error('network is down'));
        const client = new Tailcove({
            key: 'k',
            onError: () => {
                throw new Error('onError blew up');
            },
        });

        client.log('error', 'oops');

        await expect(client.flush()).resolves.toBeUndefined();
    });

    it('a non-2xx response is treated as a failure, not a thrown exception out of log()/flush()', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response(null, { status: 500 })),
        );
        const onError = vi.fn();
        const client = new Tailcove({ key: 'k', onError });

        client.log('error', 'server hiccup');
        await client.flush();

        expect(onError).toHaveBeenCalledTimes(1);
        expect((onError.mock.calls[0][0] as Error).message).toContain('500');
    });

    it('log() never throws synchronously even under a broken context object', () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response(null, { status: 202 })),
        );
        const client = new Tailcove({ key: 'k' });

        const cyclical: Record<string, unknown> = {};
        cyclical.self = cyclical;

        expect(() =>
            client.log('info', 'circular context', cyclical),
        ).not.toThrow();
    });

    it('flushOnUnload() never throws even when sendBeacon is unavailable and fetch also fails', () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new Error('network is down');
        }));
        const onError = vi.fn();
        const client = new Tailcove({ key: 'k', onError });

        client.log('error', 'about to unload');

        expect(() => client.flushOnUnload()).not.toThrow();
    });
});

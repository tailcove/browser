import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tailcove } from '../src/client.js';
import {
    linesFromBeaconCall,
    linesFromCall,
    removeSendBeacon,
    stubFetchOk,
    stubSendBeacon,
} from './helpers.js';

function setHidden(hidden: boolean): void {
    Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => (hidden ? 'hidden' : 'visible'),
    });
}

describe('unload/visibilitychange flush', () => {
    // Tracked and destroy()'d in afterEach — Tailcove registers with a
    // shared, module-level listener registry (lifecycle.ts), so a client
    // left dangling here would still react to the next test's
    // visibilitychange/pagehide dispatch and pollute its assertions.
    let client: Tailcove | undefined;

    afterEach(() => {
        client?.destroy();
        client = undefined;
        vi.unstubAllGlobals();
        removeSendBeacon();
        setHidden(false);
    });

    it('flushes via sendBeacon when the tab becomes hidden', async () => {
        const beaconMock = stubSendBeacon();
        client = new Tailcove({ key: 'k', batchIntervalMs: 100_000 });

        client.log('error', 'about to hide');
        setHidden(true);
        document.dispatchEvent(new Event('visibilitychange'));

        expect(beaconMock).toHaveBeenCalledTimes(1);
        const [url] = beaconMock.mock.calls[0] as [string, Blob];
        expect(url).toContain('key=k');

        const lines = await linesFromBeaconCall(beaconMock);
        expect(lines[0]).toMatchObject({
            message: 'about to hide',
            level: 'error',
        });
    });

    it('flushes via sendBeacon on pagehide', () => {
        const beaconMock = stubSendBeacon();
        client = new Tailcove({ key: 'k', batchIntervalMs: 100_000 });

        client.log('error', 'navigating away');
        window.dispatchEvent(new Event('pagehide'));

        expect(beaconMock).toHaveBeenCalledTimes(1);
    });

    it('falls back to fetch keepalive when sendBeacon is unavailable', () => {
        removeSendBeacon();
        const fetchMock = stubFetchOk();
        client = new Tailcove({ key: 'k', batchIntervalMs: 100_000 });

        client.log('error', 'no beacon here');
        setHidden(true);
        document.dispatchEvent(new Event('visibilitychange'));

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(init.keepalive).toBe(true);
        expect(linesFromCall(fetchMock)).toHaveLength(1);
    });

    it('falls back to fetch keepalive when sendBeacon rejects the payload', () => {
        stubSendBeacon(false);
        const fetchMock = stubFetchOk();
        client = new Tailcove({ key: 'k', batchIntervalMs: 100_000 });

        client.log('error', 'beacon queue full');
        setHidden(true);
        document.dispatchEvent(new Event('visibilitychange'));

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not flush on visibilitychange when the tab becomes visible again', () => {
        const beaconMock = stubSendBeacon();
        client = new Tailcove({ key: 'k', batchIntervalMs: 100_000 });

        client.log('error', 'still here');
        setHidden(false);
        document.dispatchEvent(new Event('visibilitychange'));

        expect(beaconMock).not.toHaveBeenCalled();
    });

    it('is a no-op when nothing is buffered', () => {
        const beaconMock = stubSendBeacon();
        client = new Tailcove({ key: 'k' });

        setHidden(true);
        document.dispatchEvent(new Event('visibilitychange'));

        expect(beaconMock).not.toHaveBeenCalled();
    });
});

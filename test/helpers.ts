import { vi } from 'vitest';

type FetchMock = ReturnType<
    typeof vi.fn<(input: string, init: RequestInit) => Promise<Response>>
>;

export function stubFetchOk(): FetchMock {
    const fetchMock: FetchMock = vi.fn(
        async () => new Response(null, { status: 202 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
}

export function stubFetchRejecting(error: unknown): FetchMock {
    const fetchMock: FetchMock = vi.fn(async () => {
        throw error;
    });
    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
}

/** Lets already-queued microtasks (promise chains inside flush()) settle before assertions run. */
export async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

/** Parses the NDJSON body handed to a mocked fetch call into one object per line. */
export function linesFromCall(fetchMock: FetchMock, callIndex = 0): unknown[] {
    const [, init] = fetchMock.mock.calls[callIndex];
    const body = init.body as string;

    return body
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

type SendBeaconMock = ReturnType<
    typeof vi.fn<(url: string, data?: BodyInit) => boolean>
>;

/**
 * jsdom doesn't implement navigator.sendBeacon at all, so this is a plain
 * assignment rather than a spy-on-existing-method — real browsers ship
 * the method already, but nothing here can rely on jsdom having it.
 */
export function stubSendBeacon(returns = true): SendBeaconMock {
    const beaconMock: SendBeaconMock = vi.fn(() => returns);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).sendBeacon = beaconMock;

    return beaconMock;
}

export function removeSendBeacon(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).sendBeacon;
}

/**
 * Parses the NDJSON body handed to a mocked sendBeacon call into one
 * object per line. Read via FileReader rather than Blob.prototype.text()
 * — jsdom's Blob doesn't implement text()/arrayBuffer(), and the
 * fetch/Response polyfill in this environment doesn't recognize jsdom's
 * Blob as valid body input either. FileReader is the one jsdom-native API
 * that actually reads a jsdom Blob's contents.
 */
export function linesFromBeaconCall(
    beaconMock: SendBeaconMock,
    callIndex = 0,
): Promise<unknown[]> {
    const [, data] = beaconMock.mock.calls[callIndex];

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result);
            resolve(
                text
                    .split('\n')
                    .filter(Boolean)
                    .map((line) => JSON.parse(line)),
            );
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(data as Blob);
    });
}

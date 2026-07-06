import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTailcoveHandleError } from '../src/svelte.js';
import { flushMicrotasks, linesFromCall, stubFetchOk } from './helpers.js';

describe('createTailcoveHandleError', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reports the error through a Tailcove client using the cross-client exception shape', async () => {
        const fetchMock = stubFetchOk();
        // batchSize: 1 so the single logged error triggers an immediate
        // flush — createTailcoveHandleError doesn't expose the underlying
        // client to call flush() on directly.
        const handleError = createTailcoveHandleError({
            key: 'k',
            batchSize: 1,
        });

        handleError({ error: new TypeError('svelte boom') });
        await flushMicrotasks();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [line] = linesFromCall(fetchMock) as Array<
            Record<string, unknown>
        >;
        expect(line.level).toBe('error');
        const exception = line.context as { exception: { class: string } };
        expect(exception.exception.class).toBe('TypeError');
    });
});

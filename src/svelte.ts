import { installAutoCapture } from './capture.js';
import { Tailcove } from './client.js';
import { formatError } from './exception.js';
import type { TailcoveOptions } from './types.js';

/**
 * Loosely typed to match SvelteKit's HandleClientError signature without
 * depending on @sveltejs/kit just for a type import — the only fields
 * this package actually reads are `error`/`event.error`.
 */
export type SvelteErrorInput = { error: unknown; event?: unknown };
export type SvelteHandleError = (
    input: SvelteErrorInput,
) => void | Record<string, unknown>;

/**
 * Factory for SvelteKit's hooks.client.ts:
 *
 *   import { createTailcoveHandleError } from '@tailcove/browser/svelte';
 *   export const handleError = createTailcoveHandleError({key: '...'});
 *
 * Constructs its own client rather than accepting one, mirroring the
 * Vue/React adapters' "one client per adapter instance" shape.
 */
export function createTailcoveHandleError(
    options: TailcoveOptions,
): SvelteHandleError {
    const client = new Tailcove(options);
    installAutoCapture(client, options);

    return ({ error }) => {
        const formatted = formatError(error);

        client.error(formatted.message, { exception: formatted });
    };
}

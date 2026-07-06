import type { Tailcove } from './client.js';
import { formatError } from './exception.js';

// Client-side only. This is NOT the same package as @tailcove/node's
// serverless additions — a full-stack Next.js app wants BOTH:
// @tailcove/browser/nextjs for the browser bundle (this file, wired via
// instrumentation-client.ts) and @tailcove/node for anything that runs on
// the server (route handlers, server components, middleware). See the
// docs' "Browser / JS" page for the split.
export { init, Tailcove } from './index.js';
export type { TailcoveOptions } from './index.js';

/**
 * Next.js App Router error boundaries (app/global-error.tsx,
 * app/error.tsx) receive `(error, reset)` rather than React's
 * componentDidCatch(error, errorInfo) — this helper adapts that shape,
 * including the Next.js-specific `error.digest` (its server-side error
 * reference id) as extra context alongside the usual exception shape.
 *
 *   'use client';
 *   import { init, reportGlobalError } from '@tailcove/browser/nextjs';
 *   const tailcove = init({ key: '...' });
 *   export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
 *       useEffect(() => reportGlobalError(tailcove, error), [error]);
 *       ...
 *   }
 */
export function reportGlobalError(
    client: Tailcove,
    error: Error & { digest?: string },
): void {
    const formatted = formatError(error);

    client.error(formatted.message, {
        exception: formatted,
        digest: error.digest,
    });
}

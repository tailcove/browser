# @tailcove/browser

Browser client for [Tailcove](https://tailcove.com) — ship logs and
captured errors straight from the frontend. Batches up to 20 lines (or 2
seconds, whichever comes first); flushes reliably on tab hide/page unload
via `navigator.sendBeacon`. A delivery failure never throws into your
app — it's dropped silently unless you pass `onError`.

Authenticated with a **browser key**, not the server-side ingest token —
a browser key is meant to be public (it ships in client-side JS), and
access is controlled by the allowed origins you configure for it in the
source's Settings tab, not by keeping the key secret. Generate one there
before using this package.

## Install

### npm / a bundler

```bash
npm install @tailcove/browser
```

```ts
import { init } from '@tailcove/browser';

const tailcove = init({
    key: '<your source's browser key>',
});

tailcove.error('checkout failed', { orderId: 99 });
```

### Plain `<script>` (no build step)

```html
<script src="https://unpkg.com/@tailcove/browser/dist/tailcove.umd.global.js"></script>
<script>
    const tailcove = Tailcove.init({ key: '<your source's browser key>' });
    tailcove.error('checkout failed');
</script>
```

Level helpers: `debug`, `info`, `notice`, `warning` (`warn` as a
console-style alias), `error`, `critical`, `alert`, `emergency` — or call
`log(level, message, context)` directly.

## Options

| Option | Default | Purpose |
|---|---|---|
| `key` | — | The source's browser key. Required. |
| `endpoint` | `https://ingest.tailcove.com/api/v1/browser/logs` | Your source's browser ingest URL. |
| `batchSize` | `20` | Flush once this many lines are buffered. |
| `batchIntervalMs` | `2000` | Flush once this many milliseconds have passed since the first buffered line, whichever comes first. |
| `timeoutMs` | `2000` | Milliseconds before a delivery attempt gives up. |
| `context` | `{}` | Merged into every line's context, underneath the per-call context. |
| `enabled` | `true` | Set `false` to keep the client silent — nothing is buffered or sent. |
| `onError` | — | Called with the error when a batch fails to send. Omit to drop failures silently. |
| `captureWindowErrors` | `false` | Capture uncaught errors via `window.onerror`. |
| `captureUnhandledRejections` | `false` | Capture unhandled promise rejections. |
| `captureConsoleErrors` | `false` | Capture `console.error(...)` calls (sampled — see `consoleSampleRate`). |
| `consoleSampleRate` | `1` | Fraction of `console.error` calls captured when `captureConsoleErrors` is on. |
| `traceLimit` | `10` | Stack frames kept per captured exception. |

Every auto-capture flag is **off by default** — an SDK that captures
everything out of the box is a noisy SDK. Turn on what you actually want.

## Context enrichment

Every line automatically gets, without any code changes on your end:

- `url` — `window.location.href`
- `userAgent` — `navigator.userAgent`
- `viewport` — `{ width, height }`

Pass `context` in the constructor to merge additional fields (e.g. `userId`,
`plan`) onto every line; per-call context passed to `log()`/`error()`/etc.
wins on key collision.

## Reliable delivery on unload

A normal `log()`/`error()` call is batched and eventually sent over a
regular `fetch()`. When the tab is hidden or the page is navigating away
(`visibilitychange` -> `hidden`, or `pagehide`), the client instead flushes
via `navigator.sendBeacon` — a fetch already in flight, or a batching timer
that hasn't fired yet, has no guarantee of completing once the page starts
unloading, but a beacon does. If `sendBeacon` isn't available (or rejects
the payload), it falls back to `fetch(..., {keepalive: true})`.

Multiple `Tailcove` instances on one page share a single set of
`visibilitychange`/`pagehide` listeners rather than each registering their
own. If you need to tear a client down before the page unloads (e.g. a
framework adapter unmounting), call `client.destroy()` — it flushes and
unregisters from the shared listeners.

## Automatic error capture

All three flags are opt-in:

```ts
const tailcove = init({
    key: '...',
    captureWindowErrors: true,
    captureUnhandledRejections: true,
    captureConsoleErrors: true,
    consoleSampleRate: 0.1, // sample 10% of console.error calls
});
```

Captured errors are rendered using the same structured exception shape
every Tailcove client uses (`{class, message, location, trace}`), so a
browser `TypeError` groups into the same issue as a server-side exception
with matching class/location/message. `location` is best-effort, parsed
from the first stack frame — it's only meaningful against an unminified
build; sourcemap resolution is a future improvement, not something this
client does today.

## React

```tsx
import { ErrorBoundary, TailcoveProvider } from '@tailcove/browser/react';

function App() {
    return (
        <TailcoveProvider options={{ key: '...' }}>
            <ErrorBoundary fallback={<p>Something went wrong.</p>}>
                <YourApp />
            </ErrorBoundary>
        </TailcoveProvider>
    );
}
```

`ErrorBoundary` also accepts an explicit `client` prop instead of reading
from `TailcoveProvider`, and a function `fallback={(error) => ...}` if you
want the caught error in your fallback UI.

## Vue

```ts
import { createApp } from 'vue';
import TailcovePlugin from '@tailcove/browser/vue';

const app = createApp(App);
app.use(TailcovePlugin, { key: '...' });
```

Wires `app.config.errorHandler` — chains any handler you'd already
registered rather than replacing it.

## Svelte (SvelteKit)

```ts
// src/hooks.client.ts
import { createTailcoveHandleError } from '@tailcove/browser/svelte';

export const handleError = createTailcoveHandleError({ key: '...' });
```

## Next.js

```ts
// instrumentation-client.ts
import { init } from '@tailcove/browser/nextjs';

export const tailcove = init({ key: '...' });
```

```tsx
// app/global-error.tsx
'use client';
import { useEffect } from 'react';
import { reportGlobalError } from '@tailcove/browser/nextjs';
import { tailcove } from '../instrumentation-client';

export default function GlobalError({
    error,
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => reportGlobalError(tailcove, error), [error]);

    return (
        <html>
            <body>Something went wrong.</body>
        </html>
    );
}
```

`@tailcove/browser/nextjs` is **client-side only**. A full-stack Next.js
app wants both this package (for the browser bundle) and `@tailcove/node`
(for route handlers, server components, and middleware) — they are not the
same package.

## Failure handling

A delivery failure — a network error or a non-2xx response — never throws
into your application. It's caught, handed to `onError` if you provided
one, and otherwise dropped. Logging is best-effort by design; it should
never be the reason your page breaks.

## Publishing (maintainers only)

This package ships from `packages/tailcove/browser` under the `@tailcove`
npm org. It is **not** wired into this repo's own `package.json` or CI —
it's built and published by hand:

```bash
cd packages/tailcove/browser
npm install
npm run typecheck
npm test
npm run build

npm version patch   # or minor / major
npm publish --access public
```

`npm publish` requires being logged in (`npm login`) as a member of the
`@tailcove` org. `--access public` is required the first time a new scoped
package is published under a free org; harmless to keep passing on every
release.

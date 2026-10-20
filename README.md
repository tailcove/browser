<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/browser-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/browser-light.svg">
  <img alt="@tailcove/browser: Tailcove for Browser" src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/browser-dark.svg" width="100%">
</picture>

<p align="center">
  <a href="https://tailcove.dev/docs/sending-logs/browser"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-docs-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-docs-light.svg"><img alt="Documentation" src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-docs-dark.svg" height="44"></picture></a>
  &nbsp;
  <a href="https://app.tailcove.dev/register"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-start-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-start-light.svg"><img alt="Get started free" src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-start-dark.svg" height="44"></picture></a>
  &nbsp;
  <a href="https://github.com/tailcove/browser/issues/new/choose"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-bug-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-bug-light.svg"><img alt="Report a bug" src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-bug-dark.svg" height="44"></picture></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@tailcove/browser"><img alt="npm version" src="https://img.shields.io/npm/v/@tailcove/browser?label=%40tailcove%2Fbrowser&color=2DD4BF&labelColor=0A0A0A&style=flat-square"></a>
  <img alt="Types included" src="https://img.shields.io/badge/types-included-2DD4BF?labelColor=0A0A0A&style=flat-square">
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-2DD4BF?labelColor=0A0A0A&style=flat-square"></a>
</p>

<h3 align="center">Send logs and frontend errors from the browser to Tailcove.</h3>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/features-browser-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/features-browser-light.svg">
  <img alt="@tailcove/browser features" src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/features-browser-dark.svg" width="100%">
</picture>

## Install

**With a bundler**

```bash
npm install @tailcove/browser
```

**With a plain `<script>` tag (no build step)**

```html
<script src="https://unpkg.com/@tailcove/browser/dist/tailcove.umd.global.js"></script>
```

## Quick start

**1. Get a browser key.** In your [Tailcove dashboard](https://app.tailcove.dev), open your source's **Settings** tab and create a browser key. Add the websites that may use it under allowed origins.

> A browser key is **meant to be public**. It ships in your front-end code, so don't treat it like a password. Access is controlled by the allowed origins you set. This is different from the server-side ingest token used by `@tailcove/node`, which must stay secret.

**2. Send your first log.**

```ts
import { init } from '@tailcove/browser';

const tailcove = init({ key: 'your-browser-key' });

tailcove.error('checkout failed', { orderId: 99 });
```

With the script tag, the same code looks like this:

```html
<script>
  const tailcove = Tailcove.init({ key: 'your-browser-key' });
  tailcove.error('checkout failed');
</script>
```

**3. Open Tailcove.** Your lines appear in search and live tail within a couple of seconds.

Level helpers are `debug`, `info`, `notice`, `warning` (with `warn` as a console-style alias), `error`, `critical`, `alert` and `emergency`. You can also call `log(level, message, context)` directly.

## Catch errors automatically

Nothing is captured until you ask for it. A client that records everything by default is a noisy one, so each switch is off to begin with:

```ts
const tailcove = init({
    key: 'your-browser-key',
    captureWindowErrors: true,        // uncaught errors (window.onerror)
    captureUnhandledRejections: true, // unhandled promise rejections
    captureConsoleErrors: true,       // console.error(...) calls
    consoleSampleRate: 0.1,           // keep 10% of console.error calls
});
```

Captured errors use the same structured shape as every Tailcove client (`class`, `message`, `location`, `trace`). A browser `TypeError` therefore groups into the same issue as a matching error from your server.

`location` comes from the first stack frame, so it is only meaningful for unminified builds. Source map support is not included yet.

## Options

| Option | Default | What it does |
|---|---|---|
| `key` | — | Your source's browser key. **Required.** |
| `endpoint` | `https://ingest.tailcove.dev/api/v1/browser/logs` | The ingest URL. Only change this if you self-host. |
| `batchSize` | `20` | Send once this many lines are buffered. |
| `batchIntervalMs` | `2000` | Send once this many milliseconds have passed since the first buffered line. |
| `timeoutMs` | `2000` | How long a delivery attempt may take before giving up. |
| `context` | `{}` | Fields added to every line. Per-call context wins if keys clash. |
| `enabled` | `true` | Set `false` to turn the client off. Nothing is buffered or sent. |
| `onError` | — | Called with the error when a batch fails to send. Without it, failures are dropped silently. |
| `captureWindowErrors` | `false` | Capture uncaught errors. |
| `captureUnhandledRejections` | `false` | Capture unhandled promise rejections. |
| `captureConsoleErrors` | `false` | Capture `console.error(...)` calls. |
| `consoleSampleRate` | `1` | Fraction of `console.error` calls kept when `captureConsoleErrors` is on. |
| `traceLimit` | `10` | Stack frames kept for each captured error. |

## What gets added automatically

| Field | Value |
|---|---|
| `url` | `window.location.href` |
| `userAgent` | `navigator.userAgent` |
| `viewport` | `{ width, height }` |

Add your own fields to every line with the `context` option, for example `userId` or `plan`.

## Frameworks

### React

```tsx
import { ErrorBoundary, TailcoveProvider } from '@tailcove/browser/react';

function App() {
    return (
        <TailcoveProvider options={{ key: 'your-browser-key' }}>
            <ErrorBoundary fallback={<p>Something went wrong.</p>}>
                <YourApp />
            </ErrorBoundary>
        </TailcoveProvider>
    );
}
```

`ErrorBoundary` also takes an explicit `client` prop, and `fallback` can be a function, `(error) => ...`, if you want to show the error.

### Vue

```ts
import { createApp } from 'vue';
import TailcovePlugin from '@tailcove/browser/vue';

const app = createApp(App);
app.use(TailcovePlugin, { key: 'your-browser-key' });
```

The plugin hooks `app.config.errorHandler` and chains any handler you already registered.

### Svelte (SvelteKit)

```ts
// src/hooks.client.ts
import { createTailcoveHandleError } from '@tailcove/browser/svelte';

export const handleError = createTailcoveHandleError({ key: 'your-browser-key' });
```

### Next.js

```ts
// instrumentation-client.ts
import { init } from '@tailcove/browser/nextjs';

export const tailcove = init({ key: 'your-browser-key' });
```

```tsx
// app/global-error.tsx
'use client';
import { useEffect } from 'react';
import { reportGlobalError } from '@tailcove/browser/nextjs';
import { tailcove } from '../instrumentation-client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
    useEffect(() => reportGlobalError(tailcove, error), [error]);

    return (
        <html>
            <body>Something went wrong.</body>
        </html>
    );
}
```

`@tailcove/browser/nextjs` runs in the browser only. A full-stack Next.js app wants this package for the browser bundle and [`@tailcove/node`](https://github.com/tailcove/node) for route handlers, server components and middleware.

## How delivery works

Normal calls are batched and sent with `fetch`. When the tab is hidden or the page is leaving (`visibilitychange` to `hidden`, or `pagehide`), the client flushes with `navigator.sendBeacon` instead, because a request already in flight or a timer that has not fired can be cut off while the page unloads, but a beacon is not. If `sendBeacon` is unavailable or rejects the payload, it falls back to `fetch` with `keepalive: true`.

Several clients on one page share a single set of unload listeners. To remove a client early, for example when a framework adapter unmounts, call `client.destroy()`. It flushes first, then detaches.

Network errors and non-2xx responses never throw into your page. They go to `onError` if you set one, and are dropped otherwise.

## Help and feedback

- **Docs:** [tailcove.dev/docs/sending-logs/browser](https://tailcove.dev/docs/sending-logs/browser)
- **Bugs and feature requests:** [open an issue](https://github.com/tailcove/browser/issues/new/choose)
- **Security problems:** please email **security@tailcove.dev** instead of opening a public issue.

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/footer-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/footer-light.svg">
  <img alt="Tailcove. Built by AKCybex." src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/footer-dark.svg" width="100%">
</picture>

<p align="center">
  <a href="https://tailcove.dev/docs/sending-logs/browser">Documentation</a> &nbsp;·&nbsp;
  <a href="https://app.tailcove.dev/register">Get started free</a> &nbsp;·&nbsp;
  <a href="https://github.com/tailcove/browser/issues/new/choose">Report a bug</a> &nbsp;·&nbsp;
  <a href="LICENSE">MIT License</a>
</p>

<p align="center">
  <sub>More Tailcove libraries: <a href="https://github.com/tailcove/laravel">Laravel</a> &nbsp;·&nbsp; <a href="https://github.com/tailcove/node">Node.js</a> &nbsp;·&nbsp; <a href="https://github.com/tailcove/python">Python</a></sub>
</p>

import { installAutoCapture } from './capture.js';
import { Tailcove } from './client.js';
import type { TailcoveOptions } from './types.js';

export { Tailcove } from './client.js';
export { formatError } from './exception.js';
export { LOG_LEVELS } from './types.js';
export type {
    FormattedException,
    LogContext,
    LogLevel,
    LogLine,
    TailcoveOptions,
} from './types.js';

/**
 * Constructs a Tailcove client and wires up any requested auto-capture
 * hooks in one call — the "native JS" entry point:
 * `Tailcove.init({key: '...'})` after loading the UMD `<script>` build, or
 * `import { init } from '@tailcove/browser'` with a bundler.
 */
export function init(options: TailcoveOptions): Tailcove {
    const client = new Tailcove(options);

    installAutoCapture(client, options);

    return client;
}

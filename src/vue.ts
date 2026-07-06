import type { App } from 'vue';
import { installAutoCapture } from './capture.js';
import { Tailcove } from './client.js';
import { formatError } from './exception.js';
import type { TailcoveOptions } from './types.js';

declare module 'vue' {
    interface ComponentCustomProperties {
        $tailcove: Tailcove;
    }
}

/**
 * Vue plugin — `app.use(TailcovePlugin, {key: '...'})` — wires
 * app.config.errorHandler so component render/lifecycle errors report
 * through the same cross-client exception shape every other client uses.
 * Chains any errorHandler already registered rather than replacing it, so
 * installing this plugin never silently disables an app's existing one.
 */
const TailcovePlugin = {
    install(app: App, options: TailcoveOptions): void {
        const client = new Tailcove(options);
        installAutoCapture(client, options);

        app.config.globalProperties.$tailcove = client;

        const previousHandler = app.config.errorHandler;

        app.config.errorHandler = (err, instance, info) => {
            const error = err instanceof Error ? err : new Error(String(err));
            const formatted = formatError(error);

            client.error(formatted.message, {
                exception: formatted,
                vueInfo: info,
            });

            previousHandler?.(err, instance, info);
        };
    },
};

export default TailcovePlugin;

import { describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h } from 'vue';
import TailcovePlugin from '../src/vue.js';

describe('Tailcove Vue plugin', () => {
    it('reports a component error through app.config.errorHandler', () => {
        const app = createApp(
            defineComponent({
                setup() {
                    throw new Error('vue boom');
                },
                render: () => h('div'),
            }),
        );

        app.use(TailcovePlugin, { key: 'k' });

        const client = app.config.globalProperties.$tailcove;
        const errorSpy = vi.spyOn(client, 'error');

        const container = document.createElement('div');
        // Vue's own error handling logs a warning too; that's expected
        // noise, not something this test needs to silence.
        app.mount(container);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        const [message, context] = errorSpy.mock.calls[0];
        expect(message).toBe('vue boom');
        expect(
            (context as { exception: { class: string } }).exception.class,
        ).toBe('Error');
    });

    it('chains a previously registered errorHandler instead of replacing it', () => {
        const app = createApp(
            defineComponent({
                setup() {
                    throw new Error('vue boom');
                },
                render: () => h('div'),
            }),
        );

        const previousHandler = vi.fn();
        app.config.errorHandler = previousHandler;

        app.use(TailcovePlugin, { key: 'k' });

        const container = document.createElement('div');
        app.mount(container);

        expect(previousHandler).toHaveBeenCalledTimes(1);
    });
});

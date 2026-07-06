import { describe, expect, it, vi } from 'vitest';
import { Tailcove } from '../src/client.js';
import { init, reportGlobalError } from '../src/nextjs.js';

describe('@tailcove/browser/nextjs', () => {
    it('re-exports init() and Tailcove from the core client', () => {
        const client = init({ key: 'k' });

        expect(client).toBeInstanceOf(Tailcove);
    });

    it('reportGlobalError reports the exception shape plus the Next.js digest', () => {
        const client = new Tailcove({ key: 'k' });
        const errorSpy = vi.spyOn(client, 'error');

        const error = new Error('app router blew up') as Error & {
            digest?: string;
        };
        error.digest = 'abc123';

        reportGlobalError(client, error);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        const [message, context] = errorSpy.mock.calls[0];
        expect(message).toBe('app router blew up');
        expect((context as { digest: string }).digest).toBe('abc123');
        expect(
            (context as { exception: { class: string } }).exception.class,
        ).toBe('Error');
    });
});

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tailcove } from '../src/client.js';
import {
    ErrorBoundary,
    TailcoveProvider,
    useTailcove,
} from '../src/react.js';

afterEach(() => {
    cleanup();
});

function Bomb(): null {
    throw new Error('boom');
}

function Fine() {
    return <div>all good</div>;
}

describe('ErrorBoundary', () => {
    it('reports a caught render error through the provided client', () => {
        const client = new Tailcove({ key: 'k' });
        const errorSpy = vi.spyOn(client, 'error');

        render(
            <ErrorBoundary client={client} fallback={<div>fallback</div>}>
                <Bomb />
            </ErrorBoundary>,
        );

        expect(screen.getByText('fallback')).toBeTruthy();
        expect(errorSpy).toHaveBeenCalledTimes(1);

        const [message, context] = errorSpy.mock.calls[0];
        expect(message).toBe('boom');
        expect(
            (context as { exception: { class: string } }).exception.class,
        ).toBe('Error');
        expect(
            (context as { componentStack: string }).componentStack,
        ).toBeDefined();
    });

    it('renders a function fallback with the caught error', () => {
        const client = new Tailcove({ key: 'k' });

        render(
            <ErrorBoundary
                client={client}
                fallback={(err) => <div>Error: {err.message}</div>}
            >
                <Bomb />
            </ErrorBoundary>,
        );

        expect(screen.getByText('Error: boom')).toBeTruthy();
    });

    it('renders children normally when nothing throws', () => {
        const client = new Tailcove({ key: 'k' });
        const errorSpy = vi.spyOn(client, 'error');

        render(
            <ErrorBoundary client={client} fallback={<div>fallback</div>}>
                <Fine />
            </ErrorBoundary>,
        );

        expect(screen.getByText('all good')).toBeTruthy();
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('picks up the client from the nearest TailcoveProvider when no explicit client prop is given', () => {
        function ReadsContext(): null {
            const client = useTailcove();
            expect(client).toBeInstanceOf(Tailcove);

            return null;
        }

        render(
            <TailcoveProvider options={{ key: 'k' }}>
                <ReadsContext />
                <ErrorBoundary fallback={<div>fallback</div>}>
                    <Bomb />
                </ErrorBoundary>
            </TailcoveProvider>,
        );

        expect(screen.getByText('fallback')).toBeTruthy();
    });
});

describe('useTailcove', () => {
    it('returns null outside a TailcoveProvider', () => {
        let observed: Tailcove | null = new Tailcove({ key: 'unused' });

        function ReadsContext(): null {
            observed = useTailcove();

            return null;
        }

        render(<ReadsContext />);

        expect(observed).toBeNull();
    });
});

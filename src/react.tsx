import React, {
    createContext,
    useContext,
    useRef,
    type ReactNode,
} from 'react';
import { installAutoCapture } from './capture.js';
import { Tailcove } from './client.js';
import { formatError } from './exception.js';
import type { TailcoveOptions } from './types.js';

const TailcoveContext = createContext<Tailcove | null>(null);

/** Reads the client set up by the nearest TailcoveProvider, or null outside one. */
export function useTailcove(): Tailcove | null {
    return useContext(TailcoveContext);
}

type TailcoveProviderProps = {
    options: TailcoveOptions;
    children: ReactNode;
};

/**
 * Initializes one Tailcove client for the app and makes it available via
 * useTailcove() and ErrorBoundary. The client is created once per mounted
 * provider (a ref, not state) — React 18 Strict Mode's double-invoke of
 * render functions must not construct (and start batching/flushing) two
 * separate clients.
 */
export function TailcoveProvider({
    options,
    children,
}: TailcoveProviderProps) {
    const clientRef = useRef<Tailcove | null>(null);

    if (clientRef.current === null) {
        clientRef.current = new Tailcove(options);
        installAutoCapture(clientRef.current, options);
    }

    return (
        <TailcoveContext.Provider value={clientRef.current}>
            {children}
        </TailcoveContext.Provider>
    );
}

type ErrorBoundaryProps = {
    /** Explicit client to report through — falls back to the nearest TailcoveProvider's client if omitted. */
    client?: Tailcove;
    fallback?: ReactNode | ((error: Error) => ReactNode);
    children: ReactNode;
};

type ErrorBoundaryState = { error: Error | null };

/**
 * Catches render-time errors in its subtree and reports them through
 * Tailcove using the same cross-client exception shape every other client
 * uses — componentStack rides along as extra context, same spirit as the
 * server clients' request-id enrichment.
 */
export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    static contextType = TailcoveContext;
    declare context: React.ContextType<typeof TailcoveContext>;

    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        const client = this.props.client ?? this.context;
        const formatted = formatError(error);

        client?.error(formatted.message, {
            exception: formatted,
            componentStack: errorInfo.componentStack,
        });
    }

    render(): ReactNode {
        if (this.state.error) {
            const { fallback } = this.props;

            if (typeof fallback === 'function') {
                return fallback(this.state.error);
            }

            return fallback ?? null;
        }

        return this.props.children;
    }
}

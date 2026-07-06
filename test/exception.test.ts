import { describe, expect, it } from 'vitest';
import { formatError } from '../src/exception.js';

describe('formatError', () => {
    it('matches the cross-client contract field set exactly', () => {
        const formatted = formatError(new Error('something broke'));

        expect(Object.keys(formatted).sort()).toEqual(
            ['class', 'location', 'message', 'trace'].sort(),
        );
        expect(formatted.class).toBe('Error');
        expect(formatted.message).toBe('something broke');
        expect(typeof formatted.location).toBe('string');
        expect(Array.isArray(formatted.trace)).toBe(true);
    });

    it('uses the error name as class, not always "Error"', () => {
        const formatted = formatError(new TypeError('bad type'));

        expect(formatted.class).toBe('TypeError');
        expect(formatted.message).toBe('bad type');
    });

    it('parses a V8-style stack frame for location', () => {
        const error = new Error('boom');
        error.stack = [
            'Error: boom',
            '    at doThing (https://example.test/app.js:42:15)',
            '    at HTMLButtonElement.onclick (https://example.test/app.js:10:3)',
        ].join('\n');

        const formatted = formatError(error);

        expect(formatted.location).toBe('https://example.test/app.js:42');
        expect(formatted.trace).toHaveLength(2);
    });

    it('parses a Firefox/Safari-style stack frame for location', () => {
        const error = new Error('boom');
        error.stack = [
            'doThing@https://example.test/app.js:42:15',
            'onclick@https://example.test/app.js:10:3',
        ].join('\n');

        const formatted = formatError(error);

        expect(formatted.location).toBe('https://example.test/app.js:42');
        expect(formatted.trace).toHaveLength(2);
    });

    it('falls back to unknown:0 when the stack cannot be parsed', () => {
        const error = new Error('boom');
        error.stack = undefined;

        const formatted = formatError(error);

        expect(formatted.location).toBe('unknown:0');
        expect(formatted.trace).toEqual([]);
    });

    it('trims the trace to the configured limit', () => {
        const error = new Error('deep');
        error.stack = [
            'Error: deep',
            ...Array.from(
                { length: 20 },
                (_, i) => `    at frame${i} (https://example.test/app.js:${i}:1)`,
            ),
        ].join('\n');

        const formatted = formatError(error, 3);

        expect(formatted.trace).toHaveLength(3);
    });

    it('handles a non-Error thrown value without throwing', () => {
        const formatted = formatError('a plain string was thrown');

        expect(formatted.class).toBe('Error');
        expect(formatted.message).toBe('a plain string was thrown');
        expect(formatted.location).toBe('unknown:0');
        expect(formatted.trace).toEqual([]);
    });

    it('handles a thrown object without throwing', () => {
        const formatted = formatError({ code: 'ECONNRESET' });

        expect(formatted.class).toBe('Error');
        expect(formatted.message).toContain('ECONNRESET');
    });
});

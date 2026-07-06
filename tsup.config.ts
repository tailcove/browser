import { defineConfig } from 'tsup';

export default defineConfig([
    {
        entry: {
            index: 'src/index.ts',
            react: 'src/react.tsx',
            vue: 'src/vue.ts',
            svelte: 'src/svelte.ts',
            nextjs: 'src/nextjs.ts',
        },
        format: ['esm', 'cjs'],
        dts: true,
        sourcemap: true,
        clean: true,
        splitting: false,
        treeshake: true,
        target: 'es2020',
    },
    // The plain <script> build for non-bundler/static-site use — a page
    // with no build step drops in a <script src> tag and calls
    // window.Tailcove.init(...). Deliberately its own config entry (not
    // added to the array above): it needs a different format/global name
    // and no .d.ts, so it can't share the esm/cjs entry's options. tsup
    // names an iife entry "{name}.global.js" — the shipped file is
    // dist/tailcove.umd.global.js, not "tailcove.umd.js" (see the setup
    // snippet in SetupSnippets.tsx and the docs page, which reference the
    // real filename).
    {
        entry: { 'tailcove.umd': 'src/umd.ts' },
        format: ['iife'],
        globalName: 'Tailcove',
        minify: true,
        dts: false,
        sourcemap: true,
        clean: false,
        target: 'es2020',
    },
]);

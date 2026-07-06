// Entry point for the plain <script> UMD build (see tsup.config.ts's
// second config entry) — bundled as an IIFE assigning everything exported
// here to `window.Tailcove`, so a page with no build step can do:
//   <script src=".../tailcove.umd.js"></script>
//   <script>Tailcove.init({key: '...'}).error('hello');</script>
export * from './index.js';

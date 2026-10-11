# Refract

Refract is a browser puzzle about drawing light across an optical bench. Trace
one beam per channel, thread each lens, and spend every crystal charge exactly
once. Campaign offers 24 fixed boards; Cascade generates an endless climb in
difficulty.

## Run it

Install dependencies with `npm ci`. Start the development server with
`npm run dev`, then open the local URL Vite prints. Create the static
production site with `npm run build`; the complete site is written to `dist/`.

## Controls

Press an emitter and drag through adjacent nodes to draw a beam. Release to keep
the route, or trace from either end or a pass-through node to continue or trim
it. Arrow keys or WASD move through menus and Enter confirms. Escape goes back,
R clears the current board, and M toggles sound. The same controls work with a
touchscreen.

# Story ticket refinement

Six home tickets now share a cream textured paper surface, delicate irregular edges, small Chinese headings, short real HTML quotes, restrained stars and a narrow B612 stub. Removed the rigid inner frame and edition/English headings. All six transparent illustrations were recomposed to leave the upper left clear for text; originals remain intact as versioned assets. No dependencies added.

Changed files: index.html, storybook.css, story-cards.js and assets/story-cards/{rose,journey,fox,b612,mailbox,flight}-v2.webp. The controller now checks current page/modal state before explicit activation, instead of a potentially stale observer flag. Other pages and storage/API schemas are unchanged.

Generated assets: built-in imagegen, transparent 3:2 compositions, original subject reference plus fox-v2 style reference. Fine colored pencil contours and translucent cream, blush, sage, powder-blue washes; subject right/lower, upper left 40% empty, sparse bottom flowers; no text, card, border or solid background. Encoded as 900x600 WebP retaining alpha.

Validation on 2026-10-17: 36 Node chat/memory/mailbox tests passed. Manual browser checks: all six images loaded; text and stubs fit at 320, 390 and 768 px; no horizontal overflow. Keyboard carousel selection, fox tear/open/close, rose open/close, flight log open/close, journey entry with 8/8 map images, mailbox navigation and return passed. B612 live conversation and real message submission were not executed in this visual refinement. Previous interaction handlers remain unchanged. No claim of a fresh complete browser suite run.

Preview: run Python http.server 8766 from project root, then open http://127.0.0.1:8766/index.html#home. Static preview message sending uses existing configured chat routing; it requires the live service to be available.

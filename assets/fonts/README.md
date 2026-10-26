# Screenshot handwriting

The first active family is **Screenshot Hand**: 80 distinct Chinese characters and 2 punctuation marks traced from the screenshot supplied by the user, who requested and authorized this extraction. It is a limited character set, not an identified or reconstructed complete source typeface. The original typeface name and its author have not been identified. Do not relicense the traced outlines as OFL or claim the existing fallback fonts have been replaced completely.

`Screenshot Hand` precedes the existing `B612 Pen` stack in both global style definitions. Its Unicode range matches its actual cmap; characters outside this range continue to use the handwriting fallbacks documented below. All characters remain real, selectable text, including dynamically inserted chat/reader text.

`scripts/build-screenshot-font.py` traces the manually selected source rectangles in `screenshot-glyphs-v1.json` with VTracer and builds TrueType/WOFF2 using FontTools. The exact screenshot hash is required to prevent rebuilding against a different source. Black strokes are isolated from the blue selection and gray border. Letter size, bearings and baselines are adjusted for normal web layout; exceptionally tall glyphs are capped to avoid line overlap. The source screenshot itself is not published in the site repository.

Build dependencies: Pillow, numpy, vtracer==0.6.15, fonttools[woff]. The TTF is a local proof artifact; the website loads the 40 KB WOFF2. The glyph manifest records the 82 exact supported codepoints, source boxes and baseline positions.

## Existing handwriting fallback

The fallback family is **B612 Pen**, a local web-font assembly of two OFL handwriting sources:

- [ChenYuluoyan 2.0 Thin](https://github.com/Chenyu-otf/chenyuluoyan_thin), by Wang, Li-Yu and Liu, Wei-Chen, supplies the thin, loose handwriting, Latin letters, digits, punctuation and supported Chinese. License: `OFL-ChenYuluoyan.txt`.
- [YShi Written SC](https://github.com/Steve-Yuu/YShi-Written), based on Zen Kurenaido, supplies simplified Chinese absent from the primary source. License: `OFL-YShiWritten.txt`. CSS size adjustments (125% for the primary, 105% for the supplement) keep the fine strokes readable and bring their visual sizes closer together.

Their Unicode ranges are disjoint, so a missing simplified character uses the supplementary handwriting rather than becoming blank or switching to a system font. The primary font is split into the current site's UI/reader characters and supplementary chunks of up to 512 characters for new text. The UI range is preloaded; other chunks download when needed. The older Xiaolai family below supplies remaining characters (currently 浏谧轳辘 in the static source). Uncovered scripts or rare characters use the system fallback.

Source outlines are preserved; TrueType hints are omitted for rasterizer compatibility. Internal subset family names avoid upstream reserved names. The exact source hashes, build sizes and fallback characters are recorded in `b612-pen-build.json`. Rebuild with `scripts/build-handwriting-fonts.py` and the two original TTFs; the script requires fonttools with WOFF2 support. These fonts approximate the supplied handwriting reference; they are not an automatically generated full font from the title image.

The heading, navigation, body, form controls, chat replies and reader all use this font stack. Draft raster headings are no longer used.

## Xiaolai fallback

Xiaolai 3.126 by LXGW and Nozomi Seto, licensed under SIL Open Font License 1.1. The full license is in OFL-Xiaolai.txt.

Source: https://github.com/lxgw/kose-font/releases/tag/v3.126

The site hosts WOFF2 subsets of the original outlines. The UI subset contains the characters used by the homepage, navigation, chat and chapter reader data. The supplementary subset covers GB2312 common Chinese characters, Latin and punctuation. Their Unicode ranges are disjoint so the browser downloads only the needed subset. Other scripts and rare characters use the system fallback font.

The smaller UI subset is preloaded. Font files are served from the same origin as the website; no Google Fonts request is needed.

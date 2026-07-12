import { Font } from "@react-pdf/renderer"

let registered = false

/**
 * @react-pdf/renderer's built-in fonts (Helvetica, Times-Roman, Courier) have
 * no Japanese glyphs. Register a Japanese-capable font once, on first use.
 *
 * Bundled locally at public/fonts/NotoSansJP-Regular.ttf (downloaded from
 * the official Google Fonts repository, OFL-licensed) and served from
 * Next.js's public/ dir at /fonts/NotoSansJP-Regular.ttf. A remote Google
 * Fonts URL was tried first (spec/architecture.md originally described this
 * as a runtime fetch) but was unreliable in practice — the legacy
 * fonts.gstatic.com/ea/ path 404s, and a woff2 URL loaded but rendered a
 * blank page. Bundling the file locally avoids both problems.
 */
export function ensureJapaneseFontRegistered() {
  if (registered) return
  Font.register({
    family: "NotoSansJP",
    src: "/fonts/NotoSansJP-Regular.ttf",
  })
  registered = true
}

export const JAPANESE_FONT_FAMILY = "NotoSansJP"

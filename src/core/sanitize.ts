/**
 * Unicode validation — detection only, never modifies data.
 * Used by v1.3 schema checks to reject malformed text.
 */

// Matches sequences of consecutive combining marks (Unicode category Mn/Mc/Me)
const COMBINING_MARK_RE = /\p{M}+/gu

/**
 * Returns true if the text contains a run of consecutive combining marks
 * exceeding `maxConsecutive`. Detects Zalgo-style abuse.
 */
export function hasExcessiveCombining(text: string, maxConsecutive = 3): boolean {
  for (const match of text.matchAll(COMBINING_MARK_RE)) {
    if ([...match[0]].length > maxConsecutive) {
      return true
    }
  }
  return false
}

// Prohibited codepoint ranges:
// - U+FFF9..FFFB  (interlinear annotation anchors)
// - U+202A..202E  (bidi embedding/override)
// - U+2066..2069  (bidi isolate)
const PROHIBITED_RE = /[\uFFF9-\uFFFB\u202A-\u202E\u2066-\u2069]/u

/**
 * Returns true if the text contains prohibited control codepoints
 * (bidi overrides, interlinear annotations).
 */
export function hasProhibitedCodepoints(text: string): boolean {
  return PROHIBITED_RE.test(text)
}

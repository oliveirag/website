// Share Quote's link: the post's address with a text fragment (#:~:text=...), which browsers that support it scroll
// to and highlight. A short quote is written out whole. A long one, or one that runs over more than one paragraph,
// is named by its first and last few words (text=start,end), because a whole quote can't cross a paragraph's edge.
const LONGEST_WHOLE = 300;
const ENDS = 5;

// encodeURIComponent leaves "-" alone, but a text fragment reads it as the start of a prefix or suffix.
const encode = (text: string) => encodeURIComponent(text).replace(/-/g, '%2D');

/** The address that highlights `quote` on the page at `url`, or null when there is no quote. */
export function quoteLink(url: string, quote: string): string | null {
  const lines = quote
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  const base = url.split('#')[0];
  const firstWords = lines[0].split(' ');
  const lastWords = lines[lines.length - 1].split(' ');
  const whole = lines.length === 1 && (lines[0].length <= LONGEST_WHOLE || firstWords.length <= ENDS * 2);
  if (whole) return `${base}#:~:text=${encode(lines[0])}`;
  const start = firstWords.slice(0, ENDS).join(' ');
  const end = lastWords.slice(-ENDS).join(' ');
  return `${base}#:~:text=${encode(start)},${encode(end)}`;
}

// Before the revamp, Chatbot and Top 5 were tabs on Home, opened by a hash: notgui.com/#chatbot.
// Hashes never reach the server, so the browser sends those old links to the pages that replaced the tabs,
// keeping the list anchor where the hash named one.
const oldLinks: Record<string, string> = {
  '#chatbot': '/chatbot',
  '#bookshelf': '/top-5',
  '#other': '/top-5',
  '#movies': '/top-5#movies',
  '#anime': '/top-5#anime',
  '#video-games': '/top-5#video-games',
};

// Where an old link on Home leads now, or null if the address is not one.
export function newAddressFor(pathname: string, hash: string): string | null {
  if (pathname !== '/' && pathname !== '/index.html') return null;
  return Object.hasOwn(oldLinks, hash) ? oldLinks[hash] : null;
}

// Inlined first in <head>, so an old link moves on before Home paints.
export const oldLinksBeforePaintScript = `(() => {
  const oldLinks = ${JSON.stringify(oldLinks)};
  const { pathname, hash } = location;
  if ((pathname === '/' || pathname === '/index.html') && Object.hasOwn(oldLinks, hash)) location.replace(oldLinks[hash]);
})();`;

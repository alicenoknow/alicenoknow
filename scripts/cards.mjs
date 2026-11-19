// Builds the project cards in cards/ as self-contained SVGs (icon and fonts embedded),
// one light and one dark version each, with the latest numbers from stats/.
// GitHub strips CSS from READMEs, so cards are how the titles get the site's pink and font.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const b64 = async (path) => (await readFile(new URL(`../${path}`, import.meta.url))).toString('base64');
const stat = async (name) => {
  try {
    return JSON.parse(await readFile(new URL(`../stats/${name}.json`, import.meta.url), 'utf8')).message;
  } catch {
    return null;
  }
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&#39;');

const themes = {
  light: { pink: '#a52565', text: '#59636e', stat: '#1f2328' },
  dark: { pink: '#ff4f86', text: '#9198a1', stat: '#f0f6fc' },
};

export async function buildCards() {
  const [plex400, plex600] = await Promise.all([
    b64('fonts/ibm-plex-mono-400-latin.woff2'),
    b64('fonts/ibm-plex-mono-600-latin.woff2'),
  ]);
  const visitors = await stat('lekko-visitors');
  const downloads = await stat('kingscup-downloads');

  const cards = [
    { id: 'site', icon: 'assets/site-icon.jpg', title: 'alicenoknow.pl', lines: ['my site: projects and', 'how-it’s-built write-ups'] },
    { id: 'lekko', icon: 'assets/lekko.jpg', title: 'lekko.space', lines: ['Polish athletics results', 'in a 3D stadium'], stat: visitors && `${visitors} visitors / 30 days` },
    { id: 'kingscup', icon: 'assets/kingscup.jpg', title: 'King’s Cup', lines: ['mobile party card game', '400+ monthly players'], stat: downloads && `${downloads} downloads` },
  ];

  await mkdir(new URL('../cards/', import.meta.url), { recursive: true });
  const W = 260, H = 236, cx = W / 2, icon = 96, title = 20;

  for (const card of cards) {
    const img = await b64(card.icon);
    const underline = card.title.length * title * 0.6;
    for (const [theme, c] of Object.entries(themes)) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(card.title)}">
<style>
@font-face{font-family:Plex;font-weight:400;src:url(data:font/woff2;base64,${plex400}) format('woff2')}
@font-face{font-family:Plex;font-weight:600;src:url(data:font/woff2;base64,${plex600}) format('woff2')}
text{font-family:Plex,ui-monospace,Menlo,monospace;text-anchor:middle}
</style>
<image x="${cx - icon / 2}" y="4" width="${icon}" height="${icon}" xlink:href="data:image/jpeg;base64,${img}" href="data:image/jpeg;base64,${img}"/>
<text x="${cx}" y="132" font-size="${title}" font-weight="600" fill="${c.pink}">${esc(card.title)}</text>
<rect x="${cx - underline / 2}" y="138" width="${underline}" height="2" fill="${c.pink}"/>
${card.lines.map((l, i) => `<text x="${cx}" y="${164 + i * 18}" font-size="12.5" fill="${c.text}">${esc(l)}</text>`).join('\n')}
${card.stat ? `<text x="${cx}" y="${222}" font-size="13" font-weight="600" fill="${c.stat}">${esc(card.stat)}</text>` : ''}
</svg>
`;
      await writeFile(new URL(`../cards/${card.id}-${theme}.svg`, import.meta.url), svg);
    }
    console.log(`card: ${card.id}${card.stat ? ` (${card.stat})` : ''}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await buildCards();

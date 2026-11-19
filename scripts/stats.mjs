// Writes shields.io endpoint badges (https://shields.io/badges/endpoint-badge) to stats/.
// Each source is independent: if one fails, its old badge stays and the run is marked failed.
import { writeFile } from 'node:fs/promises';
import gplay from 'google-play-scraper';
import { buildCards } from './cards.mjs';

const DARK = '1b1b1f';
let failed = false;

const compact = (n) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : `${n}`;

async function badge(file, label, message, color, extra = {}) {
  const json = { schemaVersion: 1, label, message, color, labelColor: DARK, ...extra };
  await writeFile(`stats/${file}.json`, JSON.stringify(json, null, 2) + '\n');
  console.log(`${file}: ${label} ${message}`);
}

async function source(name, fn) {
  try {
    await fn();
  } catch (e) {
    failed = true;
    console.error(`${name} failed:`, e.message);
  }
}

// King's Cup: public Google Play listing.
await source('google play', async () => {
  const app = await gplay.app({ appId: 'com.alicenoknow.kingscup' });
  const downloads = app.maxInstalls ?? app.minInstalls;
  await badge('kingscup-downloads', 'downloads', `${Math.floor(downloads / 1000)}k+`, 'f5c518', { namedLogo: 'googleplay' });
});

// lekko.space: Cloudflare zone analytics, last 30 full days.
await source('cloudflare', async () => {
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ZONE_ID: zone } = process.env;
  if (!token || !zone) throw new Error('CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID not set');
  const day = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query($zone: String!, $from: Date!, $to: Date!) {
        viewer { zones(filter: { zoneTag: $zone }) {
          httpRequests1dGroups(limit: 31, filter: { date_geq: $from, date_leq: $to }) {
            sum { pageViews } uniq { uniques }
          }
        } }
      }`,
      variables: { zone, from: day(30), to: day(1) },
    }),
  });
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(errors.map((e) => e.message).join('; '));
  const days = data.viewer.zones[0].httpRequests1dGroups;
  const visitors = days.reduce((n, d) => n + d.uniq.uniques, 0);
  const pageViews = days.reduce((n, d) => n + d.sum.pageViews, 0);
  await badge('lekko-visitors', 'visitors / 30 days', compact(visitors), 'c9c24a', { namedLogo: 'cloudflare' });
  await badge('lekko-pageviews', 'page views / 30 days', compact(pageViews), 'c9c24a');
});

await buildCards();

if (failed) process.exit(1);

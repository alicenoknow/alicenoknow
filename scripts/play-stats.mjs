// Fetches public Google Play data and writes shields.io endpoint badges to stats/.
import { writeFile } from 'node:fs/promises';
import gplay from 'google-play-scraper';

const apps = { kingscup: 'com.alicenoknow.kingscup' };

const short = (n) => (n >= 1000 ? `${Math.floor(n / 1000)}k+` : `${n}+`);

for (const [name, appId] of Object.entries(apps)) {
  const app = await gplay.app({ appId });
  const downloads = app.maxInstalls ?? app.minInstalls;
  const badge = { schemaVersion: 1, label: 'downloads', message: short(downloads), color: 'ffd400', labelColor: '2b2b2b', namedLogo: 'googleplay' };
  await writeFile(`stats/${name}.json`, JSON.stringify(badge, null, 2) + '\n');
  console.log(name, badge.message, `(store shows ${app.installs})`);
}

#!/usr/bin/env node
// A pretend qBittorrent 5.2 Web API with made-up torrents, for demos and README screenshots.
//   node scripts/mock-qbt.mjs            (listens on 127.0.0.1:9100)
//   QBT_URL=http://127.0.0.1:9100 npm run dev
// Any username and password log in. Writes are accepted and ignored, except the alternative speed
// limits toggle and the UI's own clientdata, so the page behaves. A made-up catalogue of legally
// shareable content (public-domain films, Linux ISOs, open archives); nothing is downloaded or
// served. Trackers (.example) and peers (documentation IP
// ranges) are fictional.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.PORT ?? 9100);
const NOW = Math.floor(Date.now() / 1000);
const GB = 1024 ** 3;
const MB = 1024 ** 2;
const ROOT = '/srv/media';

// Deterministic "random", so screenshots come out the same each run.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const hex = (n) => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join('');

const TRACKERS = ['https://tracker.opentrackr.example/announce', 'udp://tracker.linuxtracker.example:1337/announce', 'udp://open.demonii.example:6969/announce'];
const CATEGORIES = { 'Classic Films': `${ROOT}/Classics`, 'Silent Films': `${ROOT}/Silent`, 'Linux ISOs': `${ROOT}/Linux`, Archives: `${ROOT}/Archives`, 'Books & Audio': `${ROOT}/Books`, Music: `${ROOT}/Music` };
const TAGS = ['HD', 'b&w', 'favorite', 'lossless', 'complete'];

// [name, category, tags, size, state, progress, dl, up, ratio, extra]
const TB = 1024 * GB;
const LIBRARY = [
  ['Night of the Living Dead (1968) [1080p]', 'Classic Films', 'HD, b&w', 38.4 * GB, 'downloading', 0.62, 21.3 * MB, 1.4 * MB, 0.08],
  ["Max Fleischer's Superman (1941–1943) [1080p]", 'Classic Films', 'HD, favorite', 14.7 * GB, 'downloading', 0.41, 14.8 * MB, 0.9 * MB, 0.03],
  ['ubuntu-26.04-desktop-amd64.iso', 'Linux ISOs', 'favorite', 5.9 * GB, 'downloading', 0.88, 7.6 * MB, 2.1 * MB, 0.44],
  ['The Kid (1921) [1080p]', 'Silent Films', 'HD, b&w', 6.3 * GB, 'downloading', 0.27, 5.2 * MB, 0.3 * MB, 0.02],
  ['Metropolis (1927) [1080p]', 'Silent Films', 'HD, b&w', 9.1 * GB, 'stalledDL', 0.53, 0, 0, 0.11],
  ['fedora-workstation-44-x86_64.iso', 'Linux ISOs', '', 2.3 * GB, 'queuedDL', 0, 0, 0, 0],
  ['Wikipedia English Dump (XML)', 'Archives', '', 24.8 * GB, 'stoppedDL', 0.4, 0, 0, 0.12],
  ['Nosferatu (1922) [1080p]', 'Silent Films', 'b&w', 6.2 * GB, 'missingFiles', 1, 0, 0, 1.92],
  ['OpenStreetMap planet.osm.pbf', 'Archives', '', 82.4 * GB, 'checkingUP', 0.71, 0, 0, 0.9],
  ['debian-13.2.0-amd64-netinst.iso', 'Linux ISOs', 'favorite', 0.75 * GB, 'uploading', 1, 0, 3.4 * MB, 12.4],
  ['Safety Last! (1923) [1080p]', 'Silent Films', 'HD, b&w', 11.3 * GB, 'uploading', 1, 0, 1.8 * MB, 4.7],
  ['The General (1926) [1080p]', 'Silent Films', 'b&w, favorite', 7.2 * GB, 'uploading', 1, 0, 0.9 * MB, 2.31],
  ['archlinux-x86_64.iso', 'Linux ISOs', '', 1.4 * GB, 'uploading', 1, 0, 0.3 * MB, 7.85],
  ['Buster Keaton – Short Films (1920–1923)', 'Silent Films', 'b&w, complete', 31.0 * GB, 'stalledUP', 1, 0, 0, 3.02],
  ['The Phantom of the Opera (1925) [1080p]', 'Silent Films', 'b&w', 6.8 * GB, 'stalledUP', 1, 0, 0, 1.44],
  ['Sherlock Jr. (1924) [1080p]', 'Silent Films', 'b&w', 4.1 * GB, 'stalledUP', 1, 0, 0, 0.98],
  ['His Girl Friday (1940) [1080p]', 'Classic Films', '', 8.4 * GB, 'stalledUP', 1, 0, 0, 5.6],
  ['Charade (1963) [1080p]', 'Classic Films', 'favorite', 10.2 * GB, 'stalledUP', 1, 0, 0, 2.2],
  ['Carnival of Souls (1962) [1080p]', 'Classic Films', 'b&w', 6.9 * GB, 'stalledUP', 1, 0, 0, 1.07],
  ['Prelinger Archives – Ephemeral Films', 'Archives', '', 140 * GB, 'stalledUP', 1, 0, 0, 0.66],
  ['NASA Apollo 11 – Mission Audio (Complete)', 'Archives', 'lossless', 8.9 * GB, 'stalledUP', 1, 0, 0, 0.31],
  ['Project Gutenberg – Top 100 (EPUB)', 'Books & Audio', '', 0.21 * GB, 'stalledUP', 1, 0, 0, 0.52],
  ['LibriVox – The Adventures of Sherlock Holmes (MP3)', 'Books & Audio', 'favorite', 4.3 * GB, 'stalledUP', 1, 0, 0, 3.3],
  ['Musopen – Chopin Nocturnes (FLAC)', 'Music', 'lossless', 1.1 * GB, 'stalledUP', 1, 0, 0, 1.9],
  ['linuxmint-23-cinnamon-64bit.iso', 'Linux ISOs', '', 2.9 * GB, 'stalledUP', 1, 0, 0, 2.75],
  ['nixos-minimal-26.05-x86_64-linux.iso', 'Linux ISOs', '', 1.1 * GB, 'stalledUP', 1, 0, 0, 1.12],
  ['Charlie Chaplin – The Mutual Comedies (1916–1917)', 'Silent Films', 'b&w, complete', 18.0 * GB, 'stoppedUP', 1, 0, 0, 2.04],
  ['Common Crawl (sample)', 'Archives', '', 14.7 * GB, 'stalledUP', 1, 0, 0, 0.87],
];

const torrents = LIBRARY.map(([name, category, tags, size, state, progress, dl, up, ratio], i) => {
  const hash = hex(40);
  const completed = Math.round(size * progress);
  const done = progress >= 1;
  const added = NOW - Math.round((i + 1) * 86400 * (1.5 + rand() * 6));
  const left = dl > 0 ? Math.round((size - completed) / dl) : 8640000;
  return {
    hash, name, category, tags, state, progress, size, total_size: size, completed,
    dlspeed: dl, upspeed: up, ratio, priority: state.endsWith('DL') && !done ? i + 1 : 0,
    num_seeds: dl ? 12 + Math.floor(rand() * 40) : 0, num_complete: 40 + Math.floor(rand() * 900),
    num_leechs: up ? 1 + Math.floor(rand() * 9) : 0, num_incomplete: Math.floor(rand() * 60),
    eta: done ? 8640000 : left, seq_dl: false, f_l_piece_prio: false, super_seeding: false, force_start: false,
    auto_tmm: true, private: false, has_metadata: true, save_path: CATEGORIES[category], download_path: '',
    content_path: `${CATEGORIES[category]}/${name}`, added_on: added, completion_on: done ? added + 3600 : 0,
    last_activity: NOW - Math.floor(rand() * 3600), tracker: dl || up ? TRACKERS[i % 3] : '', trackers_count: 3,
    dl_limit: 0, up_limit: 0, downloaded: completed, uploaded: Math.round(size * ratio), amount_left: size - completed,
    time_active: NOW - added, seeding_time: done ? NOW - added - 3600 : 0, magnet_uri: `magnet:?xt=urn:btih:${hash}`,
    comment: '', has_tracker_warning: false, has_tracker_error: state === 'missingFiles', has_other_announce_error: false,
    ratio_limit: -2, seeding_time_limit: -2, inactive_seeding_time_limit: -2, share_limit_action: 'Default',
    availability: done ? -1 : 1 + rand() * 4, popularity: rand() * 3, reannounce: 1200, max_ratio: -1, max_seeding_time: -1,
  };
});

const byHash = new Map(torrents.map((t) => [t.hash, t]));
let altSpeed = false;
let rid = 0;
const clientdata = {};

// Speeds wobble so the speed graph and the numbers look alive.
function live(t) {
  const s = Date.now() / 1000;
  const wobble = (base, phase) => (base ? Math.max(0, Math.round(base * (0.75 + 0.25 * Math.sin(s / 3 + phase) + 0.1 * Math.sin(s * 1.7 + phase * 2)))) : 0);
  const i = torrents.indexOf(t);
  return { ...t, dlspeed: wobble(t.dlspeed, i), upspeed: wobble(t.upspeed, i + 1) };
}

function maindata() {
  const list = torrents.map(live);
  const dl = list.reduce((sum, t) => sum + t.dlspeed, 0);
  const up = list.reduce((sum, t) => sum + t.upspeed, 0);
  return {
    rid: ++rid,
    full_update: true,
    torrents: Object.fromEntries(list.map((t) => [t.hash, t])),
    categories: Object.fromEntries(Object.entries(CATEGORIES).map(([name, savePath]) => [name, { name, savePath }])),
    tags: TAGS,
    trackers: Object.fromEntries(TRACKERS.map((url) => [url, torrents.map((t) => t.hash)])),
    server_state: {
      connection_status: 'connected', dht_nodes: 412, dl_info_speed: dl, up_info_speed: up, dl_info_data: 48.2 * GB, up_info_data: 131.6 * GB,
      dl_rate_limit: 0, up_rate_limit: 0, free_space_on_disk: 1.84 * 1024 * GB, use_alt_speed_limits: altSpeed, queueing: true,
      refresh_interval: 1500, alltime_dl: 3.1 * 1024 * GB, alltime_ul: 9.7 * 1024 * GB, global_ratio: '3.12', total_peer_connections: 87,
      total_wasted_session: 21 * MB, read_cache_hits: '0', read_cache_overload: '0', write_cache_overload: '0', total_buffers_size: 0,
      total_queued_size: 0, queued_io_jobs: 0, average_time_queue: 0, last_external_address_v4: '203.0.113.42',
    },
  };
}

const episodes = (titles) => titles.map((title, i) => [`${String(i + 1).padStart(2, '0')} – ${title}.mkv`, 0.97 / titles.length]);
const FILES = {
  "Max Fleischer's Superman (1941–1943) [1080p]": [
    ...episodes(['Superman', 'The Mechanical Monsters', 'Billion Dollar Limited', 'The Arctic Giant', 'The Bulleteers', 'The Magnetic Telescope', 'Electric Earthquake', 'Volcano', 'Terror on the Midway', 'Showdown', 'Eleventh Hour', 'Destruction, Inc.', 'The Mummy Strikes', 'Jungle Drums', 'The Underground World', 'Secret Agent']),
    ['Subtitles/English.srt', 0.0001], ['Subtitles/Español.srt', 0.0001], ['Extras/Notes.txt', 0.0004], ['Extras/Title Cards.zip', 0.03],
  ],
  'Night of the Living Dead (1968) [1080p]': [
    ['Night of the Living Dead (1968).mkv', 0.95], ['Extras/Original Trailer.mkv', 0.05],
    ['Subtitles/English.srt', 0.0001], ['Subtitles/English SDH.srt', 0.0001],
  ],
};

function files(t) {
  const entries = FILES[t.name] ?? [[t.name.includes('.') ? t.name : `${t.name}.mkv`, 1]];
  const folder = FILES[t.name] ? `${t.name}/` : '';
  let at = 0;
  return entries.map(([name, share], index) => {
    const size = Math.round(t.size * share);
    const pieces = Math.max(1, Math.round((size / t.size) * 2000));
    const progress = t.progress >= 1 ? 1 : Math.min(1, Math.max(0, t.progress * (1.4 - index * 0.25)));
    const file = { index, name: folder + name, size, progress, priority: name.startsWith('Extras/') ? 0 : name.startsWith('01 – ') ? 6 : 1, piece_range: [at, at + pieces - 1], availability: t.availability };
    at += pieces;
    return file;
  });
}

function trackers(t) {
  const peerRows = [['** [DHT] **', 2, 31], ['** [PeX] **', 2, 9], ['** [LSD] **', 1, 0]].map(([url, status, peers]) => ({ url, status, tier: '', num_peers: peers, num_seeds: 0, num_leeches: 0, num_downloaded: 0, msg: '' }));
  return [
    ...peerRows,
    ...TRACKERS.map((url, tier) => ({
      url, tier, status: t.has_tracker_error && tier === 0 ? 4 : 2, msg: t.has_tracker_error && tier === 0 ? 'Torrent not registered with this tracker' : '',
      num_peers: 4 + tier * 3, num_seeds: 120 - tier * 30, num_leeches: 8 + tier, num_downloaded: 3400 - tier * 700, next_announce: 1200 + tier * 300, min_announce: 300,
    })),
  ];
}

const CLIENTS = ['qBittorrent/5.2.0', 'Transmission 4.0.6', 'Deluge 2.1.1', 'libtorrent/2.0.11', 'qBittorrent/5.1.2', 'BiglyBT 3.7.0.0', 'Tixati 3.29', 'rTorrent 0.10.0'];
const COUNTRIES = [['de', 'Germany'], ['nl', 'Netherlands'], ['fr', 'France'], ['jp', 'Japan'], ['br', 'Brazil'], ['ca', 'Canada'], ['se', 'Sweden'], ['us', 'United States']];
function peers(t) {
  if (!t.dlspeed && !t.upspeed) return {};
  return Object.fromEntries(
    CLIENTS.map((client, i) => {
      const ip = `${['203.0.113', '198.51.100', '192.0.2'][i % 3]}.${10 + i * 17}`;
      return [`${ip}:${51000 + i * 113}`, {
        client, ip, port: 51000 + i * 113, progress: [1, 1, 0.73, 1, 0.12, 1, 0.5, 0.98][i], dl_speed: Math.round((t.dlspeed / 8) * (1.6 - i * 0.15)),
        up_speed: Math.round((t.upspeed / 8) * (0.4 + i * 0.1)), downloaded: 120 * MB * (i + 1), uploaded: 30 * MB * i, connection: i % 3 ? 'BT' : 'μTP',
        flags: i % 2 ? 'D U X' : 'd u E', flags_desc: '', relevance: [1, 1, 0.6, 1, 0.1, 1, 0.4, 0.9][i], files: '', country_code: COUNTRIES[i][0], country: COUNTRIES[i][1],
      }];
    }),
  );
}

function properties(t) {
  const pieceSize = 4 * MB;
  return {
    addition_date: t.added_on, comment: t.category.endsWith('Films') ? 'Public domain' : t.category === 'Linux ISOs' ? 'Official release image' : 'Openly licensed', completion_date: t.completion_on || -1,
    created_by: 'mktorrent 1.1', creation_date: t.added_on - 86400, dl_limit: -1, dl_speed: t.dlspeed, dl_speed_avg: Math.round(t.dlspeed * 0.8), download_path: '',
    eta: t.eta, hash: t.hash, infohash_v1: t.hash, infohash_v2: '', is_private: false, last_seen: NOW - 60, name: t.name, nb_connections: 12, nb_connections_limit: 100,
    peers: t.num_leechs, peers_total: t.num_incomplete, piece_size: pieceSize, pieces_have: Math.round((t.size / pieceSize) * t.progress), pieces_num: Math.ceil(t.size / pieceSize),
    reannounce: 1200, save_path: t.save_path, seeding_time: t.seeding_time, seeds: t.num_seeds, seeds_total: t.num_complete, share_ratio: t.ratio, time_elapsed: t.time_active,
    total_downloaded: t.downloaded, total_downloaded_session: Math.round(t.downloaded / 3), total_size: t.size, total_uploaded: t.uploaded, total_uploaded_session: Math.round(t.uploaded / 4),
    total_wasted: 2 * MB, up_limit: -1, up_speed: t.upspeed, up_speed_avg: Math.round(t.upspeed * 0.7), private: false,
  };
}

function pieceStates(t) {
  const n = Math.min(2400, Math.ceil(t.size / (4 * MB)));
  return Array.from({ length: n }, (_, i) => {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const r = x < 0 ? -x : x;
    if (t.progress >= 1) return 2;
    if (r < t.progress) return 2;
    return r < t.progress + 0.01 ? 1 : 0;
  });
}

const LOG = [
  [1, 'qBittorrent v5.2.0 started. Process ID: 4242'], [2, 'Using config directory: /var/lib/qbittorrent/.config/qBittorrent'],
  [2, 'Trying to listen on the following list of IP addresses: "0.0.0.0:6881,[::]:6881"'], [2, 'Successfully listening on IP. IP: "0.0.0.0". Port: "TCP/6881"'],
  [2, 'Detected external IP. IP: "203.0.113.42"'], [1, 'Web UI: Now listening on IP: *, port: 8080'],
  [4, 'Failed to load torrent. Source: "/srv/watch/broken.torrent". Error: "invalid bencoding"'], [2, 'Torrent download finished. Torrent: "debian-13.2.0-amd64-netinst.iso"'],
  [8, 'File error alert. Torrent: "Nosferatu (1922) [1080p]". File: "/srv/media/Silent/Nosferatu (1922) [1080p]/Nosferatu (1922).mkv". Reason: "No such file or directory"'],
  [2, 'Added new torrent. Torrent: "Night of the Living Dead (1968) [1080p]"'], [2, "Added new torrent. Torrent: \"Max Fleischer's Superman (1941–1943) [1080p]\""],
].map(([type, message], id) => ({ id, type, message, timestamp: NOW - (11 - id) * 517 }));

const PREFS = (() => {
  const prefs = JSON.parse(readFileSync(new URL('../tests/fixtures/preferences-5.2.json', import.meta.url), 'utf8'));
  return { ...prefs, save_path: ROOT, temp_path: `${ROOT}/.incomplete`, temp_path_enabled: true, web_ui_username: 'demo' };
})();

// What a pasted magnet resolves to, so the Add dialog shows a real preview: Debian's live images.
const PREVIEW_HASH = 'a3f1c2d4e5b6978877665544332211ffeeddccbb';
const DEBIAN = 'debian-live-13.2.0-amd64';
const PREVIEW = {
  hash: PREVIEW_HASH, infohash_v1: PREVIEW_HASH, infohash_v2: '',
  info: {
    name: DEBIAN, length: 21.4 * GB, piece_length: 4 * MB, pieces_num: 5479, private: false,
    files: [
      ...['gnome', 'kde', 'xfce', 'cinnamon', 'mate', 'lxqt', 'lxde', 'standard'].map((desktop, i) => ({ path: `${DEBIAN}/${DEBIAN}-${desktop}.iso`, length: Math.round((3.4 - i * 0.25) * GB) })),
      { path: `${DEBIAN}/SHA256SUMS`, length: 1024 },
      { path: `${DEBIAN}/SHA512SUMS`, length: 1536 },
    ],
  },
  trackers: TRACKERS.map((url, tier) => ({ url, tier })), webseeds: [], created_by: 'mktorrent 1.1', creation_date: NOW - 86400 * 40, comment: 'Official release images',
};
// Any magnet resolves to this (scripts/screenshots.mjs pastes one for the Add dialog).

const DIRS = { [ROOT]: Object.values(CATEGORIES).concat(`${ROOT}/.incomplete`), '/srv': [ROOT, '/srv/watch'] };

function route(path, query, body) {
  const hash = query.get('hash') ?? body.get('hash');
  const t = hash ? byHash.get(hash) : undefined;
  switch (path) {
    case 'auth/login': return [204, ''];
    case 'auth/logout': return [200, ''];
    case 'app/version': return [200, 'v5.2.0'];
    case 'app/webapiVersion': return [200, '2.15.1'];
    case 'app/buildInfo': return [200, { qt: '6.9.2', libtorrent: '2.0.11.0', boost: '1.88.0', openssl: '3.5.2', zlib: '1.3.1', bitness: 64, platform: 'linux' }];
    case 'app/preferences': return [200, PREFS];
    case 'app/defaultSavePath': return [200, ROOT];
    case 'app/getDirectoryContent': return [200, DIRS[query.get('dirPath') ?? body.get('dirPath')] ?? []];
    case 'app/networkInterfaceList': return [200, [{ name: 'eth0', value: 'eth0' }, { name: 'wg0', value: 'wg0' }]];
    case 'app/networkInterfaceAddressList': return [200, ['192.0.2.10', '2001:db8::10']];
    case 'app/cookies': return [200, []];
    case 'clientdata/load': return [200, clientdata];
    case 'clientdata/store': Object.assign(clientdata, JSON.parse(body.get('data') ?? '{}')); return [200, ''];
    case 'sync/maindata': return [200, maindata()];
    case 'sync/torrentPeers': return [200, { rid: 1, full_update: true, show_flags: true, peers: t ? peers(t) : {} }];
    case 'torrents/properties': return t ? [200, properties(t)] : [404, 'Torrent hash was not found'];
    case 'torrents/files': return [200, t ? files(t) : []];
    case 'torrents/trackers': return [200, t ? trackers(t) : []];
    case 'torrents/webseeds': return [200, []];
    case 'torrents/pieceStates': return [200, t ? pieceStates(t) : []];
    case 'log/main': return [200, LOG.filter((m) => m.id > Number(query.get('last_known_id') ?? -1))];
    case 'log/peers': return [200, []];
    case 'torrentcreator/status': return [200, []];
    case 'torrents/fetchMetadata': return [200, PREVIEW];
    case 'transfer/setSpeedLimitsMode': altSpeed = (query.get('mode') ?? body.get('mode')) !== '0'; return [200, ''];
    default: return [200, ''];
  }
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', () => {
    const path = url.pathname.replace(/^\/api\/v2\//, '');
    const body = new URLSearchParams(req.headers['content-type']?.includes('urlencoded') ? raw : '');
    const [status, payload] = route(path, url.searchParams, body);
    const headers = typeof payload === 'string' ? { 'content-type': 'text/plain; charset=UTF-8' } : { 'content-type': 'application/json' };
    if (path === 'auth/login') headers['set-cookie'] = 'SID=demo; HttpOnly; SameSite=Strict; path=/';
    res.writeHead(status, headers);
    res.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
  });
}).listen(PORT, '127.0.0.1', () => console.log(`Mock qBittorrent on http://127.0.0.1:${PORT} (${torrents.length} made-up torrents)`));

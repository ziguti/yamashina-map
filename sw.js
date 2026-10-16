/* 山科歴史アーカイブ：アプリとしてインストールするための最小のサービスワーカー。
   ・ページ本体（index.html）は「ネット優先、つながらない時だけ前回の保存分」。
   ・地図タイルや史料データなど外部のもの、Range要求（pmtiles）には一切触れない。
   ・アイコンを差し替えたら CACHE の番号（v1）を上げる。 */
const CACHE = 'yha-shell-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
    const r = e.request;
    if (r.method !== 'GET' || r.headers.has('range')) return;
    const u = new URL(r.url);
    if (u.origin !== location.origin) return;
    if (r.mode === 'navigate') {
        e.respondWith(fetch(r).then((res) => {
            if (res && res.ok) { const c = res.clone(); caches.open(CACHE).then((ca) => ca.put('./index.html', c)); }
            return res;
        }).catch(() => caches.match('./index.html')));
        return;
    }
    e.respondWith(caches.match(r).then((hit) => hit || fetch(r)));
});

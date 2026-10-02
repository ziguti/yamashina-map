/* =====================================================================
   ■イマーシブ演出レイヤー（既存スクリプトを壊さない後付けの演出）
   ・スクロール連動リビール（動的に生成されるカードにも自動適用）
   ・ポータルの総合検索ボックス（既存の横断検索機能を呼び出すだけ）
   ・年表の自動生成（古写真・石造物の年代からクロノロジーを構築）
   ===================================================================== */
(function () {
    'use strict';

    const REVEAL_SELECTOR = '.animate-on-scroll, .portal-nav-card, .gallery-card, .omni-result-card, .timeline-item, .db-search-panel, .portal-description, .result-map-section';
    const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
        entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('fx-in'); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' }) : null;

    function armReveal(root) {
        if (!io || !root || root.nodeType !== 1) return;
        const targets = (root.matches && root.matches(REVEAL_SELECTOR) ? [root] : []).concat(Array.from(root.querySelectorAll ? root.querySelectorAll(REVEAL_SELECTOR) : []));
        targets.forEach(el => {
            if (el.classList.contains('fx-reveal')) return;
            el.classList.add('fx-reveal');
            const parent = el.parentElement;
            const siblings = parent ? Array.from(parent.children).filter(c => c.matches && c.matches(REVEAL_SELECTOR)) : [];
            el.style.setProperty('--fx-delay', Math.min(Math.max(siblings.indexOf(el), 0), 8) * 70 + 'ms');
            io.observe(el);
        });
    }

    /* ---- 年表の自動生成：古写真・石造物の年代から10年単位のクロノロジーを組み立てる ---- */
    function buildTimeline() {
        const esc = (v) => (typeof escapeHtml === 'function' ? escapeHtml(String(v == null ? '' : v)) : String(v == null ? '' : v));
        const toYear = (v) => { const m = String(v == null ? '' : v).match(/(1[89]\d{2}|20[012]\d)/); return m ? parseInt(m[1], 10) : null; };
        const items = [];
        (window.archiveData || []).forEach(p => {
            const y = toYear(p.year);
            if (y) items.push({ y, era: p.era || '', title: p.title || '無題', kind: 'photo', thumb: p.img || '', open: `openDetail('${String(p.id).replace(/['\\]/g, '')}')` });
        });
        (window.models || []).forEach(m => {
            const y = toYear(m.builtYear) || toYear(m.era) || toYear(m.captureDate);
            if (y) items.push({ y, era: m.era || '', title: m.name || '石造物', kind: '3d', thumb: m.thumbnail || '', open: `open3DDetail('${String(m.id).replace(/['\\]/g, '')}')` });
        });
        if (!items.length || typeof showPage !== 'function') return false;
        items.sort((a, b) => a.y - b.y);
        const groups = [];
        items.forEach(it => {
            const dec = Math.floor(it.y / 10) * 10;
            let g = groups[groups.length - 1];
            if (!g || g.dec !== dec) { g = { dec, items: [] }; groups.push(g); }
            g.items.push(it);
        });
        const host = document.querySelector('#page-portal .scroll-container');
        if (!host || document.getElementById('auto-timeline')) return true;
        const html = `
            <h2 class="portal-section-title animate-on-scroll"><i class="fa-solid fa-timeline"></i> 山科クロノロジー<span class="tl-count">全${items.length}件の記録から自動生成</span></h2>
            <div class="timeline-wrap" id="auto-timeline">
                ${groups.map(g => `
                <div class="timeline-decade">
                    <div class="timeline-dot"></div>
                    <div class="timeline-decade-year"><b>${g.dec}s</b><small>${g.dec}年代</small></div>
                    <div class="timeline-items">
                        ${g.items.map(it => `
                        <div class="timeline-item" onclick="${it.open}">
                            ${it.thumb ? `<div class="timeline-thumb"><img src="${esc(it.thumb)}" alt="" loading="lazy"></div>` : ''}
                            <div class="timeline-body">
                                <span class="timeline-kind kind-${it.kind}">${it.kind === 'photo' ? '古写真' : '石造物 3D'}</span>
                                ${it.era ? `<span class="timeline-era">${esc(it.era)}</span>` : ''}
                                <h3>${esc(it.title)}</h3>
                                <span class="timeline-year">${it.y}</span>
                            </div>
                        </div>`).join('')}
                    </div>
                </div>`).join('')}
            </div>`;
        host.insertAdjacentHTML('beforeend', html);
        armReveal(document.getElementById('auto-timeline'));
        return true;
    }
    window.buildTimeline = buildTimeline;

    /* データ読み込み完了を待ってから年表を組み立てる（最大約30秒） */
    window.buildTimelineWhenReady = function () {
        if (buildTimeline()) return;
        let tries = 0;
        const t = setInterval(() => { if (buildTimeline() || ++tries > 36) clearInterval(t); }, 800);
    };

    /* ---- ポータル総合検索ボックス → 既存の横断検索へ ---- */
    window.portalOmniGo = function () {
        const input = document.getElementById('portal-omni-input');
        const q = input ? input.value.trim() : '';
        if (typeof showPage === 'function') showPage('omni');
        if (!q) return;
        const simple = document.getElementById('omni-q-simple');
        if (simple) simple.value = q;
        if (typeof toggleOmniMode === 'function') toggleOmniMode('simple');
        if (typeof executeOmniSearch === 'function') {
            executeOmniSearch();
            const res = document.getElementById('omni-results-container');
            if (res) setTimeout(() => res.scrollIntoView({ behavior: 'smooth', block: 'start' }), 450);
        }
    };

    /* ---- スクロールリビール初期化（動的に追加されるカードも監視） ---- */
    window.initScrollFX = function () {
        armReveal(document.body);
        if ('MutationObserver' in window) {
            const mo = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) armReveal(n); })));
            mo.observe(document.body, { childList: true, subtree: true });
        }
        document.querySelectorAll('.carousel-slide img').forEach(img => img.classList.add('fx-kenburns'));
        /* フェイルセーフ：IOが動かない環境でもカードが非表示のまま残らないように */
        setInterval(() => {
            document.querySelectorAll('.fx-reveal:not(.fx-in)').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.top < window.innerHeight + 120 && r.bottom > -120) el.classList.add('fx-in');
            });
        }, 2000);
    };

    /* ---- テキスト入力中は入力欄以外の画面全体をぼかす ---- */
    (function () {
        const F = 'input[type="text"],input[type="search"],input[type="number"],input[type="date"],input[type="email"],input[type="password"],input:not([type]),select,textarea';
        const TARGETS = '#main-header, #map-ui, #map, #map-detail-panel, #spot-settings-wrapper, #chiban-panel-wrapper';
        let marked = false, last = null;
        document.addEventListener('focusin', (e) => {
            if (!(e.target.matches && e.target.matches(F))) return;
            if (!marked) {
                marked = true;
                document.querySelectorAll(TARGETS + ', .page .scroll-container > *, #page-map > *').forEach(el => el.classList.add('dim-fx'));
            }
            document.body.classList.add('input-dimmed');
            if (last) last.classList.remove('dim-exempt');
            let holder = e.target;
            while (holder.parentElement && holder.parentElement !== document.body &&
                   !holder.parentElement.classList.contains('page') &&
                   !holder.parentElement.classList.contains('scroll-container')) holder = holder.parentElement;
            holder.classList.add('dim-exempt');
            last = holder;
        });
        document.addEventListener('focusout', () => {
            document.body.classList.remove('input-dimmed');
            if (last) { last.classList.remove('dim-exempt'); last = null; }
        });
    })();

    /* ---- 文書・古地図ビュアーのツールバー（Mirador / NDLサーチ風） ---- */
    (function () {
        const TOOLBAR = `
            <div class="pdf-nav-arrow" onclick="docPageArrowNext()" title="次のページへ進む"><i class="fa-solid fa-chevron-left"></i></div>
            <div class="pdf-nav-end" onclick="docGoFirstPage()" title="最初のコマへ"><i class="fa-solid fa-angles-left"></i></div>
            <div class="pdf-nav-end" onclick="docGoLastPage()" title="最後のコマへ"><i class="fa-solid fa-angles-right"></i></div>
            <div class="pdf-nav-arrow" onclick="docPageArrowPrev()" title="前のページへ戻る"><i class="fa-solid fa-chevron-right"></i></div>
            <div class="pdf-slider-wrap"><input type="range" id="pdf-page-slider" min="1" max="1" value="1" oninput="docSliderInput(this.value)"></div>
            <div class="pdf-page-jump"><input type="number" id="pdf-page-jump" min="1" max="1" value="1" onkeydown="docPageJumpKey(event)" title="コマ番号を入力してEnterで移動"><span>/</span><span id="pdf-page-total">－</span></div>`;
        function mount(root) {
            (root || document).querySelectorAll('.pdf-viewer-controls:not([data-pdf-ready])').forEach(el => {
                el.dataset.pdfReady = '1';
                el.insertAdjacentHTML('afterbegin', TOOLBAR);
            });
        }
        document.addEventListener('DOMContentLoaded', () => {
            mount(document);
            const mb = document.getElementById('modal-body');
            if (mb) new MutationObserver(() => mount(mb)).observe(mb, { childList: true, subtree: true });
        });
        /* ページ表示（n / total）の変化に合わせてコマ指定入力とバーの塗りを同期 */
        function fillSlider(s) {
            const min = parseFloat(s.min) || 0, max = parseFloat(s.max) || 1, val = parseFloat(s.value) || min;
            const pct = max > min ? Math.min(100, Math.max(0, (val - min) / (max - min) * 100)) : 0;
            s.style.background = 'linear-gradient(to right, #a8874c, #c9a15c ' + pct + '%, rgba(255,253,247,0.16) ' + pct + '%)';
        }
        function syncPager() {
            const c = document.getElementById('pdf-page-counter');
            const m = c ? (c.textContent || '').match(/(\d+)\s*\/\s*(\d+)/) : null;
            const jump = document.getElementById('pdf-page-jump');
            if (jump && m) { jump.max = m[2]; if (document.activeElement !== jump) jump.value = m[1]; }
            const total = document.getElementById('pdf-page-total');
            if (total && m) total.textContent = m[2];
            const slider = document.getElementById('pdf-page-slider');
            if (slider) fillSlider(slider);
        }
        new MutationObserver(syncPager).observe(document.body, { subtree: true, childList: true, characterData: true });
        document.addEventListener('input', e => { if (e.target && e.target.id === 'pdf-page-slider') fillSlider(e.target); });

        window.docPageJumpKey = function (e) {
            if (e.key !== 'Enter') return;
            const v = parseInt(e.target.value, 10);
            if (isNaN(v) || typeof goToDocPage !== 'function') return;
            goToDocPage(v, true);
        };
        window.docGoFirstPage = function () { if (typeof goToDocPage === 'function') goToDocPage(1, true); };
        window.docGoLastPage = function () {
            const s = document.getElementById('pdf-page-slider');
            if (s && typeof goToDocPage === 'function') goToDocPage(parseInt(s.max, 10) || 1, true);
        };
    })();
})();

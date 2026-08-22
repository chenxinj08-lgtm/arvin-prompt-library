/* ============ 应用脚本：加载数据并渲染页面 ============ */
(function () {
  'use strict';

  const DATA_URL = './prompts.json';
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  let state = { cases: [], filter: 'all', query: '' };

  /* ---------- 工具 ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function slugify(s) {
    return String(s).toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function glyphFor(caseItem) {
    const t = (caseItem.tags || []).join(' ');
    if (/视频|动画/i.test(t)) return '🎬';
    if (/故事板|分镜/i.test(t)) return '🎞';
    if (/MJ|midjourney|绘图/i.test(t)) return '🖼';
    return '🎥';
  }
  function tagHighlight(tag) {
    return /水墨|精选|奇观|爆款/i.test(tag) ? ' highlight' : '';
  }

  /* ---------- 数据加载 ---------- */
  async function loadData() {
    // 加时间戳参数，彻底绕过 Vercel/CDN 边缘缓存，保证更新即时可见
    const ts = Date.now();
    const res = await fetch(DATA_URL + '?t=' + ts, { cache: 'no-store' });
    if (!res.ok) throw new Error('数据加载失败: ' + res.status);
    return await res.json();
  }

  /* ---------- 首页渲染 ---------- */
  function renderHome() {
    const grid = $('#case-grid');
    if (!grid) return;
    const { cases, filter, query } = state;
    const q = query.trim().toLowerCase();

    const filtered = cases.filter(c => {
      if (filter === 'featured' && !c.featured) return false;
      if (!q) return true;
      const hay = [c.title, c.summary, (c.tags || []).join(' ')].join(' ').toLowerCase();
      return hay.includes(q);
    });

    $('#empty-state').hidden = filtered.length !== 0;

    grid.innerHTML = filtered.map(c => {
      const tags = (c.tags || []).map(t => `<span class="tag${tagHighlight(t)}">${escapeHtml(t)}</span>`).join('');
      const promptCount = (c.prompts || []).length;
      const duration = (c.prompts || []).map(p => p.duration).filter(Boolean)[0] || '';
      return `
        <article class="case-card" data-slug="${escapeHtml(c.slug)}" tabindex="0" role="link" aria-label="${escapeHtml(c.title)}">
          <div class="case-card-top">
            <span class="card-glyph">${glyphFor(c)}</span>
            <div class="badge-row">${tags}</div>
            ${duration ? `<span class="card-duration">${escapeHtml(duration)}</span>` : ''}
          </div>
          <div class="card-body">
            <h3 class="card-title">${escapeHtml(c.title)}</h3>
            <p class="card-summary">${escapeHtml(c.summary)}</p>
            <div class="card-meta">
              <span class="prompt-count">📄 ${promptCount} 条提示词</span>
              <span class="card-date">${escapeHtml(formatDate(c.date))}</span>
            </div>
          </div>
        </article>`;
    }).join('');

    // 绑定点击
    $$('.case-card', grid).forEach(card => {
      const open = () => { location.href = './detail.html?slug=' + encodeURIComponent(card.dataset.slug); };
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });

    // 计数
    $('#count-all').textContent = cases.length;
    $('#count-featured').textContent = cases.filter(c => c.featured).length;
  }

  function updateFooter(updatedAt) {
    const fmt = updatedAt ? formatDate(updatedAt) : '—';
    const info = $('#update-info');
    const foot = $('#footer-updated');
    if (info) info.textContent = '更新于 ' + fmt;
    if (foot) foot.textContent = fmt;
  }

  /* ---------- 详情页渲染 ---------- */
  function renderDetail() {
    const root = $('#detail-root');
    if (!root) return;
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug') || '';
    const caseItem = state.cases.find(c => c.slug === slug);
    if (!caseItem) {
      root.innerHTML = `
        <div class="empty-state" style="padding:80px 0">
          <p>没有找到该案例。</p>
          <p style="margin-top:12px"><a class="btn" href="./index.html">返回案例库</a></p>
        </div>`;
      document.title = '未找到 · Arvin010717 提示词库';
      return;
    }

    document.title = caseItem.title + ' · Arvin010717 提示词库';
    const tags = (caseItem.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ');
    const prompts = (caseItem.prompts || []);

    root.innerHTML = `
      <section class="detail-head">
        <h1>${escapeHtml(caseItem.title)}</h1>
        <p class="detail-summary">${escapeHtml(caseItem.summary)}</p>
        <dl class="detail-meta">
          <div><dt>发布日期</dt><dd>${escapeHtml(formatDate(caseItem.date))}</dd></div>
          <div><dt>提示词数量</dt><dd>${prompts.length} 条</dd></div>
          <div><dt>标签</dt><dd>${tags}</dd></div>
        </dl>
        <div class="detail-links">
          <a class="btn" href="${escapeHtml(caseItem.sourceUrl || '#')}" target="_blank" rel="noopener">查看原推文 ↗</a>
        </div>
      </section>

      <section class="prompts-section">
        <h2><span class="num">${String(prompts.length).padStart(2, '0')}</span> 条提示词</h2>
        <p class="section-sub">点击展开查看完整提示词，可一键复制。</p>
        <div id="prompts-list">
          ${prompts.map((p, i) => `
            <div class="prompt-item" data-prompt-id="${escapeHtml(p.id)}">
              <div class="prompt-head" role="button" tabindex="0">
                <span class="idx">${String(i + 1).padStart(2, '0')}</span>
                <div class="prompt-head-info">
                  <div class="type">${escapeHtml(p.type)}</div>
                  <div class="meta">
                    ${p.duration ? `<span>⏱ ${escapeHtml(p.duration)}</span>` : ''}
                    ${p.model ? `<span>🧠 ${escapeHtml(p.model)}</span>` : ''}
                    ${p.id ? `<span>推文 ${escapeHtml(p.id)}</span>` : ''}
                  </div>
                </div>
                <span class="chev">▾</span>
              </div>
              <div class="prompt-body">
                <div class="prompt-body-inner">
                  <div>
                    <button class="btn copy-btn" data-copy="${escapeHtml(p.full_text)}">复制全文</button>
                    <span class="copied-flag" hidden>已复制 ✓</span>
                  </div>
                  <div class="prompt-fulltext">${escapeHtml(p.full_text)}</div>
                </div>
              </div>
            </div>`).join('')}
        </div>
      </section>`;

    // 展开/收起
    $$('.prompt-head', root).forEach(head => {
      const toggle = () => head.closest('.prompt-item').classList.toggle('open');
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });

    // 复制
    $$('.copy-btn', root).forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(btn.dataset.copy);
          const flag = btn.nextElementSibling;
          if (flag) { flag.hidden = false; setTimeout(() => { flag.hidden = true; }, 1600); }
        } catch (e) {
          // fallback
          const ta = document.createElement('textarea');
          ta.value = btn.dataset.copy;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          const flag = btn.nextElementSibling;
          if (flag) { flag.hidden = false; setTimeout(() => { flag.hidden = true; }, 1600); }
        }
      });
    });
  }

  /* ---------- 事件绑定（首页） ---------- */
  function bindHomeEvents() {
    const filters = $('#filters');
    if (!filters) return;
    filters.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      $$('.filter-btn', filters).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
      renderHome();
    });
    const search = $('#search');
    if (search) {
      search.addEventListener('input', () => { state.query = search.value; renderHome(); });
    }
  }

  /* ---------- 启动 ---------- */
  async function init() {
    try {
      const data = await loadData();
      state.cases = data.cases || [];
      if (state.cases && state.cases.length && !state.cases.some(c => c.slug)) {
        // 兼容无 slug 的数据：自动生成
        state.cases.forEach(c => { if (!c.slug) c.slug = slugify(c.title || c.id); });
      }
      updateFooter(data.updatedAt);
      // 详情页判定：只有带 slug 参数或路径含 detail 时才是详情页
      const params = new URLSearchParams(location.search);
      const isDetail = params.has('slug') || location.pathname.includes('detail');
      if (isDetail) {
        renderDetail();
      } else {
        renderHome();
        bindHomeEvents();
      }
    } catch (err) {
      console.error(err);
      const grid = $('#case-grid');
      if (grid) grid.innerHTML = `<div class="empty-state"><p>数据加载失败：${escapeHtml(err.message)}</p><p style="margin-top:10px">请确认 <code>data/prompts.json</code> 存在。</p></div>`;
    }
  }

  init();
})();

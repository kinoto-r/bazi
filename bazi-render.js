// bazi-render.js
// ========================
// DOM生成・描画全般
// ========================

/* ===================== テーブル生成 ===================== */
function createTable(headers, rows) {
  const tbl = document.createElement('table');
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  tbl.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    r.forEach(c => {
      const td = document.createElement('td');
      td.textContent = (c == null ? '' : String(c));
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  
  return tbl;
}

/* ===================== リスト生成 ===================== */
function createList(items) {
  const ul = document.createElement('ul');
  items.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    ul.appendChild(li);
  });
  return ul;
}

/* ===================== バッジ生成 ===================== */
function badge(text) {
  const span = document.createElement('span');
  span.textContent = text;
  span.style.border = '1px solid #ddd';
  span.style.borderRadius = '999px';
  span.style.padding = '2px 8px';
  return span;
}

function makeBadge(text, toneOrClasses = null) {
  const sp = document.createElement('span');
  sp.textContent = text;
  sp.classList.add('badge-zy');
  
  if (Array.isArray(toneOrClasses)) {
    if (toneOrClasses.length) sp.classList.add(...toneOrClasses);
  } else if (typeof toneOrClasses === 'string' && toneOrClasses) {
    sp.classList.add(toneOrClasses);
  }
  
  return sp;
}

/* ===================== 五行レーダー ===================== */
function makeFiveRadarSVG(counts, opt = {}) {
  const order = ['木','火','土','金','水'];
  const size = opt.size || 260;
  const max = opt.max || 8;
  const pad = 20;
  const cx = size/2, cy = size/2, r = (size/2 - pad);
  const ns = 'http://www.w3.org/2000/svg';
  
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.style.display = 'block';
  svg.style.marginTop = '8px';

  // グリッド
  const gGrid = document.createElementNS(ns, 'g');
  gGrid.setAttribute('stroke', '#ddd');
  gGrid.setAttribute('fill', 'none');
  [1/3, 2/3, 1].forEach(f => {
    const rr = r * f;
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', polygonPath(cx, cy, rr));
    path.setAttribute('opacity', f === 1 ? '1' : '0.6');
    gGrid.appendChild(path);
  });
  svg.appendChild(gGrid);

  // 軸とラベル
  const gAxis = document.createElementNS(ns, 'g');
  gAxis.setAttribute('stroke', '#ccc');
  gAxis.setAttribute('fill', '#666');
  gAxis.setAttribute('font-size', '12');
  order.forEach((_, i) => {
    const ang = -90 + i * 72;
    const rad = ang * Math.PI/180;
    const x2 = cx + r * Math.cos(rad);
    const y2 = cy + r * Math.sin(rad);
    
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', cx);
    line.setAttribute('y1', cy);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#e0e0e0');
    gAxis.appendChild(line);
    
    const lx = cx + (r + 14) * Math.cos(rad);
    const ly = cy + (r + 14) * Math.sin(rad);
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', lx);
    text.setAttribute('y', ly);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.textContent = order[i];
    gAxis.appendChild(text);
  });
  svg.appendChild(gAxis);

  // データポリゴン
  const pts = order.map((k, i) => {
    const v = Math.max(0, Math.min(max, counts[k] || 0));
    const rate = v / max;
    const ang = -90 + i * 72;
    const rad = ang * Math.PI/180;
    return [cx + r*rate*Math.cos(rad), cy + r*rate*Math.sin(rad)];
  });
  
  const poly = document.createElementNS(ns, 'polygon');
  poly.setAttribute('points', pts.map(p => p.join(',')).join(' '));
  poly.setAttribute('fill', 'rgba(0,0,0,0.06)');
  poly.setAttribute('stroke', '#888');
  poly.setAttribute('stroke-width', '2');
  svg.appendChild(poly);

  // ドット
  const gDots = document.createElementNS(ns, 'g');
  pts.forEach(([x, y]) => {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', x);
    c.setAttribute('cy', y);
    c.setAttribute('r', 3.5);
    c.setAttribute('fill', '#555');
    gDots.appendChild(c);
  });
  svg.appendChild(gDots);

  return svg;

  function polygonPath(cx, cy, R) {
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const ang = -90 + i*72;
      const rad = ang * Math.PI/180;
      pts.push([cx + R*Math.cos(rad), cy + R*Math.sin(rad)]);
    }
    return 'M ' + pts.map(p => p.join(' ')).join(' L ') + ' Z';
  }
}

/* ===================== 陰陽パイ ===================== */
function renderYinYangPie(container, yin, yang, opt = {}) {
  const el = (typeof container === 'string') ? document.getElementById(container) : container;
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);

  const size = Number(opt.size) || 260;
  const W = size, H = size, CX = W/2, CY = H/2, R = Math.floor(size * 0.42);

  const total = (yin|0) + (yang|0);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.display = 'block';

  const arcPath = (cx, cy, r, startRad, endRad) => {
    const x0 = cx + r * Math.cos(startRad);
    const y0 = cy + r * Math.sin(startRad);
    const x1 = cx + r * Math.cos(endRad);
    const y1 = cy + r * Math.sin(endRad);
    const large = (((endRad - startRad) % (Math.PI*2) + Math.PI*2) % (Math.PI*2)) > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
  };

  if (total <= 0) {
    const p = document.createElement('div');
    p.textContent = 'データなし';
    p.style.color = '#777';
    p.style.fontSize = '12px';
    el.appendChild(p);
    return;
  }

  if (yin === total || yang === total) {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', CX);
    c.setAttribute('cy', CY);
    c.setAttribute('r', R);
    c.setAttribute('fill', yin === total ? '#bdbdbd' : '#ffffff');
    c.setAttribute('stroke', '#d0d0d0');
    c.setAttribute('stroke-width', '1');
    svg.appendChild(c);
  } else {
    const start = -Math.PI / 2;
    const yangRad = (yang / total) * Math.PI * 2;
    
    const pathYang = document.createElementNS(ns, 'path');
    pathYang.setAttribute('d', arcPath(CX, CY, R, start, start + yangRad));
    pathYang.setAttribute('fill', '#ffe8c6');
    pathYang.setAttribute('stroke', '#fff');
    pathYang.setAttribute('stroke-width', '0.5');
    svg.appendChild(pathYang);
    
    const pathYin = document.createElementNS(ns, 'path');
    pathYin.setAttribute('d', arcPath(CX, CY, R, start + yangRad, start + Math.PI*2));
    pathYin.setAttribute('fill', '#e7e9ff');
    pathYin.setAttribute('stroke', '#fff');
    pathYin.setAttribute('stroke-width', '0.5');
    svg.appendChild(pathYin);
  }

  const label = document.createElementNS(ns, 'text');
  label.setAttribute('x', CX);
  label.setAttribute('y', CY + 4);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('font-size', Math.round(size*0.07));
  label.setAttribute('fill', '#333');
  label.textContent = `陽${yang}:陰${yin}`;
  svg.appendChild(label);

  el.appendChild(svg);
}

/* ===================== 十神セル色付け ===================== */
function paintTgCell(id) {
  const cell = document.getElementById(id);
  if (!cell) return;
  const label = (cell.textContent || '').trim();
  if (!label || label === '　') return;
  
  const parts = splitTgLabel(label);
  if (!parts.length) return;
  
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode(label + ' '));
  
  parts.forEach((name, idx) => {
    const meta = TEN_GOD_META[name];
    if (!meta) return;
    if (idx > 0) frag.appendChild(document.createTextNode(' '));
    frag.appendChild(makeBadge(meta.yy, [meta.yy === '陽' ? 'yang' : 'yin']));
    frag.appendChild(document.createTextNode(' '));
    frag.appendChild(makeBadge(meta.el));
  });
  
  cell.innerHTML = '';
  cell.appendChild(frag);
}

/* ===================== 五行バランスセクション描画 ===================== */
function renderFiveBalanceSection(cnt, yy) {
  const order = ['木','火','土','金','水'];

  // 五行表
  const energyHost = $('energy');
  if (energyHost) {
    while (energyHost.firstChild) energyHost.removeChild(energyHost.firstChild);
    const row = order.map(k => cnt[k]);
    energyHost.appendChild(createTable(order, [row]));
  }
  
  // レーダー
  const radarHost = $('fiveRadar');
  if (radarHost) {
    while (radarHost.firstChild) radarHost.removeChild(radarHost.firstChild);
    radarHost.appendChild(makeFiveRadarSVG(cnt, {size:260, max:8}));
  }
  
  // 陰陽表
  const yyWrap = $('yyWrap');
  if (yyWrap) {
    while (yyWrap.firstChild) yyWrap.removeChild(yyWrap.firstChild);
    yyWrap.appendChild(createTable(['陽','陰'], [[yy.陽, yy.陰]]));
  }
  
  // 陰陽パイ
  const yyChartHost = $('yyChart');
  if (yyChartHost) {
    while (yyChartHost.firstChild) yyChartHost.removeChild(yyChartHost.firstChild);
    renderYinYangPie(yyChartHost, yy.陰, yy.陽);
  }
}

/* ===================== 命式表描画 ===================== */
function renderClassicTable(pillars, dG, stems, branches) {
  const { yG, mG, hG } = stems;
  const { yB, mB, dB, hB } = branches;
  
  const Hc = pillars.time.chinese;
  const Dc = pillars.day.chinese;
  const Mc = pillars.month.chinese;
  const Yc = pillars.year.chinese;

  setText('c_time_gz', Hc);
  setText('c_day_gz', Dc);
  setText('c_month_gz', Mc);
  setText('c_year_gz', Yc);

  // 空亡（旬空）
  try {
    const dayGZ = String(pillars.day?.chinese || '').trim();
    const yearGZ = String(pillars.year?.chinese || '').trim();

    const dayPair = kongwangPairByGanzhi(dayGZ);
    const yearPair = kongwangPairByGanzhi(yearGZ);

    const fmt = (pair) => {
      if (!pair || pair.length !== 2) return '—';
      const [a, b] = pair;
      return `${a}・${b}`;
    };

    const yearCell = document.getElementById('kwYear');
    const dayCell = document.getElementById('kwDay');

    if (yearCell) {
      yearCell.textContent = fmt(yearPair);
      yearCell.classList.remove('yin','yang');
      yearCell.classList.add('neutral');
    }
    if (dayCell) {
      dayCell.textContent = fmt(dayPair);
      dayCell.classList.remove('yin','yang');
      dayCell.classList.add('neutral');
    }
  } catch (e) {
    console.error('[KUBO] 描画エラー:', e);
  }

  // 天干
  setText('c_time_g', hG);
  setText('c_day_g', dG);
  setText('c_month_g', mG);
  setText('c_year_g', yG);

  [['c_year_g', yG], ['c_month_g', mG], ['c_day_g', dG], ['c_time_g', hG]].forEach(([id, g]) => {
    const cell = document.getElementById(id);
    if (!cell) return;
    cell.appendChild(document.createTextNode(' '));
    const yy = yinYangOfStem(g);
    cell.appendChild(makeBadge(yy, yy === '陽' ? 'yang' : 'yin'));
    cell.appendChild(document.createTextNode(' '));
    const element = stemElement[g] || '－';
    const elBadge2 = makeBadge(element);
    if (element && element !== '－') elBadge2.classList.add(`el-${element}`);
    cell.appendChild(elBadge2);
  });

  // 地支（バッジ付き）
  function buildZhiFrag(zhi) {
    const frag = document.createDocumentFragment();
    const z = String(zhi || '').trim();
    const main = document.createElement('span');
    main.textContent = z || '—';
    main.style.marginRight = '6px';
    frag.appendChild(main);
    const meta = BRANCH_META[z];
    if (meta) {
      const yyBadge = makeBadge(meta.yy, meta.yy === '陽' ? 'yang' : 'yin');
      frag.appendChild(yyBadge);
      frag.appendChild(document.createTextNode(' '));
      const elBadge = makeBadge(meta.el);
      elBadge.classList.add('el-' + meta.el);
      frag.appendChild(elBadge);
    }
    return frag;
  }

  const ZHI_ID_SETS = [
    ['c_year_zhi','c_month_zhi','c_day_zhi','c_time_zhi'],
    ['zhi_y','zhi_m','zhi_d','zhi_h']
  ];
  
  function pickZhiIdSet() {
    for (const set of ZHI_ID_SETS) {
      if (set.every(id => document.getElementById(id))) return set;
    }
    return ZHI_ID_SETS[0];
  }

  const ids = pickZhiIdSet();
  const pairs = [[ids[0], yB], [ids[1], mB], [ids[2], dB], [ids[3], hB]];
  
  pairs.forEach(([id, zhi]) => {
    const cell = document.getElementById(id);
    if (!cell) {
      console.error('[paintZhi] セル未発見:', id);
      return;
    }
    cell.innerHTML = '';
    cell.appendChild(buildZhiFrag(zhi));
  });

  // 五行
  setText('c_time_gogyou', signEl(hG));
  setText('c_day_gogyou', signEl(dG));
  setText('c_month_gogyou', signEl(mG));
  setText('c_year_gogyou', signEl(yG));

  // 十神
  setText('c_time_tg', tenGodExact(dG, hG) || '－');
  setText('c_day_tg', '　');
  setText('c_month_tg', tenGodExact(dG, mG) || '－');
  setText('c_year_tg', tenGodExact(dG, yG) || '－');

  // 蔵干バッジ
  const paintZangBadgesOnly = (prefix, b) => {
    const z = (b && ZANG[b]) ? ZANG[b] : {};
    const map = { hon: z.hon || '－', mid: z.mid || '－', rem: z.rem || '－' };
    ['hon','mid','rem'].forEach(k => {
      const el = document.getElementById(`${prefix}_zang_${k}`);
      if (!el) return;
      el.classList.remove('yin','yang','neutral');
      el.textContent = map[k];
      el.classList.add(
        (!map[k] || map[k] === '－' || map[k] === '-') ? 'neutral'
        : (YANG_STEMS.includes(map[k]) ? 'yang' : 'yin')
      );
      const elName = stemEl(map[k]);
      if (elName) el.classList.add(`el-${elName}`);
    });
  };
  
  paintZangBadgesOnly('c_year', yB);
  paintZangBadgesOnly('c_month', mB);
  paintZangBadgesOnly('c_day', dB);
  paintZangBadgesOnly('c_time', hB);

  // 蔵干十神
  const paintZangTG = (prefix, branch) => {
    const b = normalizeBranch(branch);
    const z = (b && ZANG[b]) ? ZANG[b] : {};
    const tgMap = {
      hon: z.hon ? tenGodExact(dG, z.hon) : '－',
      mid: z.mid ? tenGodExact(dG, z.mid) : '－',
      rem: z.rem ? tenGodExact(dG, z.rem) : '－'
    };
    [['hon','_zang_tg_hon'],['mid','_zang_tg_mid'],['rem','_zang_tg_rem']].forEach(([k, suf]) => {
      const el = document.getElementById(prefix + suf);
      if (el) el.textContent = tgMap[k];
    });
  };
  
  paintZangTG('c_time', hB);
  paintZangTG('c_day', dB);
  paintZangTG('c_month', mB);
  paintZangTG('c_year', yB);
}
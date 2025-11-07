// bazi-render.js
// 描画・DOM生成だけを担当する

// 1) テーブルを作る
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

// 2) リストを作る
function createList(items) {
  const ul = document.createElement('ul');
  items.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    ul.appendChild(li);
  });
  return ul;
}

// 3) バッジ系
function badge(text){
  const span = document.createElement('span');
  span.textContent = text;
  span.style.border = '1px solid #ddd';
  span.style.borderRadius = '999px';
  span.style.padding = '2px 8px';
  return span;
}

function makeBadge(text, toneOrClasses = null){
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

// 4) 五行レーダーSVG
function makeFiveRadarSVG(counts, opt = {}){
  const order = ['木','火','土','金','水'];
  const size = opt.size || 260;
  const max  = opt.max  || 8;
  const pad  = 20;
  const cx = size/2, cy = size/2, r = (size/2 - pad);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width',  size);
  svg.setAttribute('height', size);
  svg.style.display = 'block';
  svg.style.marginTop = '8px';

  const gGrid = document.createElementNS(ns, 'g');
  gGrid.setAttribute('stroke', '#ddd');
  gGrid.setAttribute('fill', 'none');
  [1/3, 2/3, 1].forEach(f=>{
    const rr = r * f;
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', polygonPath(cx, cy, rr));
    path.setAttribute('opacity', f===1 ? '1' : '0.6');
    gGrid.appendChild(path);
  });
  svg.appendChild(gGrid);

  const gAxis = document.createElementNS(ns, 'g');
  gAxis.setAttribute('stroke', '#ccc');
  gAxis.setAttribute('fill', '#666');
  gAxis.setAttribute('font-size', '12');
  order.forEach((_,i)=>{
    const ang = -90 + i * 72;
    const rad = ang * Math.PI/180;
    const x2 = cx + r * Math.cos(rad);
    const y2 = cy + r * Math.sin(rad);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', cx); line.setAttribute('y1', cy);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
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

  const pts = order.map((k,i)=>{
    const v = Math.max(0, Math.min(max, counts[k]||0));
    const rate = v / max;
    const ang = -90 + i * 72;
    const rad = ang * Math.PI/180;
    return [ cx + r*rate*Math.cos(rad), cy + r*rate*Math.sin(rad) ];
  });
  const poly = document.createElementNS(ns, 'polygon');
  poly.setAttribute('points', pts.map(p=>p.join(',')).join(' '));
  poly.setAttribute('fill', 'rgba(0,0,0,0.06)');
  poly.setAttribute('stroke', '#888');
  poly.setAttribute('stroke-width', '2');
  svg.appendChild(poly);

  const gDots = document.createElementNS(ns, 'g');
  pts.forEach(([x,y])=>{
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 3.5);
    c.setAttribute('fill', '#555');
    gDots.appendChild(c);
  });
  svg.appendChild(gDots);

  return svg;

  function polygonPath(cx,cy,R){
    const pts = [];
    for(let i=0;i<5;i++){
      const ang = -90 + i*72;
      const rad = ang * Math.PI/180;
      pts.push([ cx + R*Math.cos(rad), cy + R*Math.sin(rad) ]);
    }
    return 'M ' + pts.map(p=>p.join(' ')).join(' L ') + ' Z';
  }
}

// 5) 陰陽パイ
function renderYinYangPie(container, yin, yang, opt = {}) {
  const el = (typeof container === 'string') ? document.getElementById(container) : container;
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);

  const size = Number(opt.size) || 260;
  const W = size, H = size, CX = W/2, CY = H/2, R = Math.floor(size * 0.42);

  const total = (yin|0) + (yang|0);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width',  W);
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
    p.style.color = '#777'; p.style.fontSize = '12px';
    el.appendChild(p); return;
  }

  if (yin === total || yang === total) {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', CX); c.setAttribute('cy', CY); c.setAttribute('r', R);
    c.setAttribute('fill', yin === total ? '#bdbdbd' : '#ffffff');
    c.setAttribute('stroke', '#d0d0d0'); c.setAttribute('stroke-width', '1');
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
  label.setAttribute('x', CX); label.setAttribute('y', CY + 4);
  label.setAttribute('text-anchor', 'middle'); label.setAttribute('font-size', Math.round(size*0.07));
  label.setAttribute('fill', '#333');
  label.textContent = `陽${yang}：陰${yin}`;
  svg.appendChild(label);

  el.appendChild(svg);
}

// 6) さっき移したこれもここに
function renderKuboBlock(label, pair){
  const div = document.createElement('div');
  if (!pair){ div.textContent = `${label}：判定不可`; return div; }
  const [a,b] = pair;
  div.textContent = `${label}：${a}・${b}`;
  return div;
}

// 7) 十神セルを色つけるやつもこっちに置ける
function paintTgCell(id){
  const cell = document.getElementById(id);
  if (!cell) return;
  const label = (cell.textContent || '').trim();
  if (!label || label === '　'){ return; }
  const parts = splitTgLabel(label); // ← bazi-logic.js で定義済みならここでも使える
  if (!parts.length) return;
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode(label + ' '));
  parts.forEach((name, idx) => {
    const meta = TEN_GOD_META[name];
    if (!meta) return;
    if (idx>0) frag.appendChild(document.createTextNode(' '));
    frag.appendChild( makeBadge(meta.yy, [meta.yy==='陽' ? 'yang' : 'yin']) );
    frag.appendChild(document.createTextNode(' '));
    frag.appendChild( makeBadge(meta.el) );
  });
  cell.innerHTML = '';
  cell.appendChild(frag);
}
//renderFiveblanceSection
function renderFiveBalanceSection(cnt, yy){
    const order = ['木','火','土','金','水'];

// ===== 左カラム：五行表＋レーダー =====
  const energyHost = $('energy');
  if (energyHost){
    while (energyHost.firstChild) energyHost.removeChild(energyHost.firstChild);
    const row = order.map(k => cnt[k]);
    energyHost.appendChild( createTable(order, [row]) );
  }
  const radarHost = $('fiveRadar');
  if (radarHost){
    while (radarHost.firstChild) radarHost.removeChild(radarHost.firstChild);
    radarHost.appendChild( makeFiveRadarSVG(cnt, {size:260, max:8}) );
  }
const yyWrap = $('yyWrap');
  if (yyWrap){
    while (yyWrap.firstChild) yyWrap.removeChild(yyWrap.firstChild);
    yyWrap.appendChild( createTable(['陽','陰'], [[yy.陽, yy.陰]]) );
  }
  const yyChartHost = $('yyChart');
  if (yyChartHost){
    while (yyChartHost.firstChild) yyChartHost.removeChild(yyChartHost.firstChild);
    renderYinYangPie(yyChartHost, yy.陰, yy.陽);   // ← 第4引数を消す// ★ レーダーと同サイズ
  }
}
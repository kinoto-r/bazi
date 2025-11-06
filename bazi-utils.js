// bazi-utils.js
// ===== ユーティリティ =====
const $ = id => document.getElementById(id);
const setText = (id, txt) => { const n = $(id); if (n) n.textContent = (txt ?? ""); };

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

function createList(items) {
  const ul = document.createElement('ul');
  items.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    ul.appendChild(li);
  });
  return ul;
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
// 干支から天干1文字を取る
function pickStem(pillar) {
  if (!pillar || !pillar.chinese) return '';
  return pillar.chinese.charAt(0);
}

// 干支から地支1文字を取る
function pickBranch(pillar) {
  if (!pillar || !pillar.chinese) return '';
  return pillar.chinese.charAt(1);
}
// URLのパラメータを安全に取るやつ
function safeParseParams() {
  const params = {};
  const search = window.location.search;
  if (search) {
    const sp = new URLSearchParams(search);
    sp.forEach((value, key) => {
      params[key] = value;
    });
  }
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const hashStr = hash.substring(1);
    const pairs = hashStr.split('&');
    pairs.forEach(pair => {
      if (!pair) return;
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) return;
      let key = pair.substring(0, eqIndex);
      let value = pair.substring(eqIndex + 1);
      key = convertFullToHalf(key);
      value = convertFullToHalf(value);
      try {
        key = decodeURIComponent(key);
        value = decodeURIComponent(value);
      } catch (e) {}
      if (!params[key]) {
        params[key] = value;
      }
    });
  }
  return params;
}

// 全角→半角
function convertFullToHalf(str) {
  if (!str) return '';
  return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s =>
    String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  ).replace(/：/g, ':')
   .replace(/－/g, '-')
   .replace(/＿/g, '_')
   .replace(/，/g, ',')
   .replace(/．/g, '.')
   .replace(/＆/g, '&')
   .replace(/＝/g, '=')
   .replace(/？/g, '?')
   .replace(/／/g, '/')
   .replace(/＋/g, '+')
   .replace(/（/g, '(')
   .replace(/）/g, ')')
   .replace(/［/g, '[')
   .replace(/］/g, ']')
   .replace(/｛/g, '{')
   .replace(/｝/g, '}')
   .replace(/　/g, ' ');
}

// 五行レーダー（もとのまま）
function makeFiveRadarSVG(counts, opt={}) {
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

  // グリッド
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

  // 軸
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

  // データ
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

// 陰陽パイ（サイズ指定版）
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
    svg.appendChild(pathYang);
    const pathYin = document.createElementNS(ns, 'path');
    pathYin.setAttribute('d', arcPath(CX, CY, R, start + yangRad, start + Math.PI*2));
    pathYin.setAttribute('fill', '#e7e9ff');
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

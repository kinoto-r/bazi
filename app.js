/* ===================== 1) ユーティリティ ===================== */
const $ = id => document.getElementById(id);
const setText = (id, txt) => { const n = $(id); if (n) n.textContent = (txt ?? ""); };

function createTable(headers, rows) {
  const tbl = document.createElement('table');
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; trh.appendChild(th); });
  thead.appendChild(trh);
  tbl.appendChild(thead);
  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    r.forEach(c => { const td = document.createElement('td'); td.textContent = (c == null ? '' : String(c)); tr.appendChild(td); });
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  return tbl;
}

function createList(items) { 
  const ul=document.createElement('ul'); 
  items.forEach(s=>{ 
    const li=document.createElement('li'); 
    li.textContent=s; 
    ul.appendChild(li); 
  }); 
  return ul; 
}

function badge(text){ 
  const span=document.createElement('span'); 
  span.textContent=text; 
  span.style.border='1px solid #ddd'; 
  span.style.borderRadius='999px'; 
  span.style.padding='2px 8px'; 
  return span; 
}

// ===== バッジ描画（共通）：文字/配列どちらの第2引数にも対応 =====
function makeBadge(text, toneOrClasses = null){
  const sp = document.createElement('span');
  sp.textContent = text;
  sp.classList.add('badge-zy'); // 共通クラス

  if (Array.isArray(toneOrClasses)) {
    if (toneOrClasses.length) sp.classList.add(...toneOrClasses);
  } else if (typeof toneOrClasses === 'string' && toneOrClasses) {
    // 既存の makeBadge(yy, 'yang'|'yin'|'neutral') 呼び出しに対応
    sp.classList.add(toneOrClasses);
  }
  return sp;
}

const pickStem   = p => (p && p.chinese) ? p.chinese.charAt(0) : '';
const pickBranch = p => (p && p.chinese) ? p.chinese.charAt(1) : '';

// 五行レーダー（SVG）。order=木火土金水、max は軸の最大値（干支だけなら 8 固定が見やすい）
function makeFiveRadarSVG(counts, opt={}){
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

  // 同心五角形 3 本（目安線）
  [1/3, 2/3, 1].forEach(f=>{
    const rr = r * f;
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', polygonPath(cx, cy, rr));
    path.setAttribute('opacity', f===1 ? '1' : '0.6');
    gGrid.appendChild(path);
  });
  svg.appendChild(gGrid);

  // 軸線 & ラベル
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

  // 値ポリゴン
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

  // 頂点点
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

// ==== 陰陽バランス：円グラフ描画（全陰/全陽を特別表示） ====
function renderYinYangPie(container, yin, yang) {
  const el = (typeof container === 'string') ? document.getElementById(container) : container;
  if (!el) return;

  while (el.firstChild) el.removeChild(el.firstChild);

  const total = (yin|0) + (yang|0);
  const W = 140, H = 140, CX = W/2, CY = H/2, R = 60;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const arcPath = (cx, cy, r, startRad, endRad) => {
    const x0 = cx + r * Math.cos(startRad);
    const y0 = cy + r * Math.sin(startRad);
    const x1 = cx + r * Math.cos(endRad);
    const y1 = cy + r * Math.sin(endRad);
    const large = ((endRad - startRad + Math.PI*2) % (Math.PI*2)) > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
  };

  if (total <= 0) {
    const p = document.createElement('div');
    p.textContent = 'データなし'; p.style.color = '#777'; p.style.fontSize = '12px';
    el.appendChild(p); return;
  }

  if (yin === total) {
    const c = document.createElementNS(svg.namespaceURI, 'circle');
    c.setAttribute('cx', CX); c.setAttribute('cy', CY); c.setAttribute('r', R);
    c.setAttribute('fill', '#bdbdbd'); c.setAttribute('stroke', '#bdbdbd'); c.setAttribute('stroke-width', '1');
    svg.appendChild(c);
  } else if (yang === total) {
    const c = document.createElementNS(svg.namespaceURI, 'circle');
    c.setAttribute('cx', CX); c.setAttribute('cy', CY); c.setAttribute('r', R);
    c.setAttribute('fill', '#ffffff'); c.setAttribute('stroke', '#d0d0d0'); c.setAttribute('stroke-width', '2');
    svg.appendChild(c);
  } else {
    const start = -Math.PI / 2;
    const yangRad = (yang / total) * Math.PI * 2;

    const pathYang = document.createElementNS(svg.namespaceURI, 'path');
    pathYang.setAttribute('d', arcPath(CX, CY, R, start, start + yangRad));
    pathYang.setAttribute('fill', '#ffe8c6'); pathYang.setAttribute('stroke', '#fff'); pathYang.setAttribute('stroke-width', '0.5');
    svg.appendChild(pathYang);

    const pathYin = document.createElementNS(svg.namespaceURI, 'path');
    pathYin.setAttribute('d', arcPath(CX, CY, R, start + yangRad, start + Math.PI*2));
    pathYin.setAttribute('fill', '#e7e9ff'); pathYin.setAttribute('stroke', '#fff'); pathYin.setAttribute('stroke-width', '0.5');
    svg.appendChild(pathYin);
  }

  const label = document.createElementNS(svg.namespaceURI, 'text');
  label.setAttribute('x', CX); label.setAttribute('y', CY + 4);
  label.setAttribute('text-anchor', 'middle'); label.setAttribute('font-size', '12'); label.setAttribute('fill', '#333');
  label.textContent = `陽${yang}：陰${yin}`;
  svg.appendChild(label);

  el.appendChild(svg);
}

/* ===================== 2) ベース定義 ===================== */
const stemElement={'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
const branchElement = {
  '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火',
  '午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'
};

const stemEl = s => stemElement[s] || '';

const gen={'木':'火','火':'土','土':'金','金':'水','水':'木'};
const COUNTER={'木':'土','火':'金','土':'水','金':'木','水':'火'};

const ZANG={
  "子":{"hon":"癸","mid":null,"rem":"壬"},
  "丑":{"hon":"己","mid":"辛","rem":"癸"},
  "寅":{"hon":"甲","mid":"丙","rem":"戊"},
  "卯":{"hon":"乙","mid":null,"rem":"甲"},
  "辰":{"hon":"戊","mid":"癸","rem":"乙"},
  "巳":{"hon":"丙","mid":"庚","rem":"戊"},
  "午":{"hon":"丁","mid":null,"rem":"己"},
  "未":{"hon":"己","mid":"乙","rem":"丁"},
  "申":{"hon":"庚","mid":"壬","rem":"戊"},
  "酉":{"hon":"辛","mid":null,"rem":"庚"},
  "戌":{"hon":"戊","mid":"丁","rem":"辛"},
  "亥":{"hon":"壬","mid":null,"rem":"甲"}
};

const BRANCH12 = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
function normalizeBranch(b){
  if (!b) return b;
  const s = String(b).replace(/\s+/g,'');
  if (BRANCH12.includes(s)) return s;
  for (const zhi of BRANCH12){ if (s.includes(zhi)) return zhi; }
  return b;
}

const YOJIN={
  "建禄（比劫）格":{ "用神":["印綬/偏印"], "喜神":["比肩/劫財","印綬/偏印"], "忌神":["正官/偏官"], "仇神":["正財/偏財","食神/傷官"] },
  "印綬格":{ "用神":["比肩/劫財"], "喜神":["印綬/偏印"], "忌神":["正財/偏財"], "仇神":["食神/傷官","正官/偏官"] },
  "財格":{ "用神":["正官/偏官"], "喜神":["正財/偏財","食神/傷官"], "忌神":["比肩/劫財"], "仇神":["印綬/偏印"] },
  "官格（官殺格）":{ "用神":["印綬/偏印"], "喜神":["正官/偏官"], "忌神":["食神/傷官"], "仇神":["比肩/劫財","正財/偏財"] },
  "食傷格":{ "用神":["正財/偏財"], "喜神":["食神/傷官"], "忌神":["正官/偏官"], "仇神":["印綬/偏印"] },
  "従財格":{ "用神":["正財/偏財"], "喜神":["食神/傷官"], "忌神":["印綬/偏印"], "仇神":["比肩/劫財"] },
  "従殺格":{ "用神":["正官/偏官"], "喜神":["印綬/偏印"], "忌神":["食神/傷官"], "仇神":["比肩/劫財"] },
  "従児格":{ "用神":["食神/傷官"], "喜神":["正財/偏財"], "忌神":["正官/偏官"], "仇神":["印綬/偏印"] },
  "従強格":{ "用神":["比肩/劫財"], "喜神":["印綬/偏印"], "忌神":["正財/偏財"], "仇神":["正官/偏官","食神/傷官"] }
};

const YANG_STEMS = ['甲','丙','戊','庚','壬'];
function yinYangOfStem(stem){ return YANG_STEMS.includes(stem) ? '陽' : '陰'; }

const BRANCH_YIN_YANG = { 子:'陽', 丑:'陰', 寅:'陽', 卯:'陰', 辰:'陽', 巳:'陰', 午:'陽', 未:'陰', 申:'陽', 酉:'陰', 戌:'陽', 亥:'陰' };
function yinYangOfBranch(branch){ return BRANCH_YIN_YANG[branch] || ''; }

const BRANCH_ELEMENT = { 子:'水', 丑:'土', 寅:'木', 卯:'木', 辰:'土', 巳:'火', 午:'火', 未:'土', 申:'金', 酉:'金', 戌:'土', 亥:'水' };
function elementOfBranch(branch){ return BRANCH_ELEMENT[branch] || ''; }

const GUARDIAN_DEFAULT_STEM = { 木:'甲', 火:'丙', 土:'戊', 金:'庚', 水:'癸' };

function kyuseiSimpleByYear(year){
  const n = (11 - (year % 9));
  const idx = ((n - 1 + 9) % 9) + 1;
  const names = {1:'一白水星',2:'二黒土星',3:'三碧木星',4:'四緑木星',5:'五黄土星',6:'六白金星',7:'七赤金星',8:'八白土星',9:'九紫火星'};
  return names[idx] || '—';
}

const TEN_GOD_META = {
  '比肩': { el:'木', yy:'陽' }, '劫財': { el:'木', yy:'陰' },
  '食神': { el:'火', yy:'陽' }, '傷官': { el:'火', yy:'陰' },
  '偏財': { el:'土', yy:'陽' }, '正財': { el:'土', yy:'陰' },
  '偏官': { el:'金', yy:'陽' }, '正官': { el:'金', yy:'陰' },
  '偏印': { el:'水', yy:'陽' }, '印綬': { el:'水', yy:'陰' }
};

const BRANCH_META = {
  '子': { el:'水', yy:'陽' }, '丑': { el:'土', yy:'陰' }, '寅': { el:'木', yy:'陽' },
  '卯': { el:'木', yy:'陰' }, '辰': { el:'土', yy:'陽' }, '巳': { el:'火', yy:'陰' },
  '午': { el:'火', yy:'陽' }, '未': { el:'土', yy:'陰' }, '申': { el:'金', yy:'陽' },
  '酉': { el:'金', yy:'陰' }, '戌': { el:'土', yy:'陽' }, '亥': { el:'水', yy:'陰' }
};

function splitTgLabel(raw){
  if (!raw) return [];
  return String(raw).split(/[／\/]/).map(s=>s.trim()).filter(Boolean);
}

/* ===================== 3) 判定・計算ロジック ===================== */
function starOf(dayStem, targetStem){
  const d=stemElement[dayStem], t=stemElement[targetStem];
  if(!d||!t) return null;
  if (t===d) return '比肩/劫財';
  if (gen[t]===d) return '印綬/偏印';
  if (gen[d]===t) return '食神/傷官';
  if (COUNTER[d]===t) return '正財/偏財';
  if (COUNTER[t]===d) return '正官/偏官';
  return null;
}

function judgeStrength(five, dayStem){
  const e=stemElement[dayStem];
  const by={'木':five.WOOD||0,'火':five.FIRE||0,'土':five.EARTH||0,'金':five.METAL||0,'水':five.WATER||0};
  const helper=(by[e]||0)+(by[Object.keys(gen).find(k=>gen[k]===e)]||0);
  const leak=(by[gen[e]]||0), cai=(by[COUNTER[e]]||0), guan=(by[Object.keys(COUNTER).find(k=>COUNTER[k]===e)]||0);
  const suppress=leak+cai+guan, total=helper+suppress;
  if(!total) return {label:'中庸', detail:'—'};
  const r=helper/total;
  let label='中庸'; if(r>=0.70)label='極身強'; else if(r>=0.55)label='身強'; else if(r<=0.30)label='極身弱'; else if(r<=0.45)label='身弱';
  return {label, detail:`助身=${helper.toFixed(2)} / 抑身=${suppress.toFixed(2)}（${(r*100).toFixed(1)}%）`};
}

function judgeKakkyoku(dayStem, monthBranch, strengthLabel){
  const z = ZANG[ normalizeBranch(monthBranch) ];
  if(!z || !z.hon) return {name:'不明', basis:'—'};
  const s = starOf(dayStem, z.hon)||'不明';
  const base = {
    '比肩/劫財':'建禄（比劫）格',
    '印綬/偏印':'印綬格',
    '正財/偏財':'財格',
    '正官/偏官':'官格（官殺格）',
    '食神/傷官':'食傷格'
  }[s]||'不明';
  let name=base;
  if (strengthLabel==='極身弱'){
    if (s==='正財/偏財') name='従財格';
    else if (s==='正官/偏官') name='従殺格';
    else if (s==='食神/傷官') name='従児格';
  } else if (strengthLabel==='極身強'){
    if (s==='比肩/劫財') name='従強格';
  }
  return {name, basis:`月令本気「${z.hon}」は日干に対し「${s}」`};
}

const LIUHE=[['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];
const CHONG=[['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
const HAI  =[['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']];
const XING =[['子','卯'],['寅','巳'],['申','亥'],['丑','戌','未']];

function detectToko(p){
  const res=[], stems=[pickStem(p.year),pickStem(p.month),pickStem(p.day),pickStem(p.time)], branches=[pickBranch(p.year),pickBranch(p.month),pickBranch(p.day),pickBranch(p.time)], cols=['年','月','日','時'];
  branches.forEach((br,bi)=>{
    const z=ZANG[ normalizeBranch(br) ]; if(!z) return;
    ['hon','mid','rem'].forEach(k=>{ const s=z[k]; if(s && stems.includes(s)) res.push(`${cols[bi]}支${k==='hon'?'本気':k==='mid'?'中気':'余気'}「${s}」が天干に透出`); });
  });
  return res.length?res:['透干なし'];
}

function detectRelations(p){
  const b=[pickBranch(p.year),pickBranch(p.month),pickBranch(p.day),pickBranch(p.time)], cols=['年','月','日','時'], pairs=[];
  const has=(arr,a,c)=>arr.some(x=> x.length===2 ? ((x[0]===a&&x[1]===c)||(x[1]===a&&x[0]===c)) : (x.includes(a)&&x.includes(c)));
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
    const a=b[i], c=b[j]; if(!a||!c) continue;
    if(has(LIUHE,a,c)) pairs.push(`${cols[i]}-${cols[j]}：六合`);
    if(has(CHONG,a,c)) pairs.push(`${cols[i]}-${cols[j]}：冲`);
    if(has(HAI,a,c))   pairs.push(`${cols[i]}-${cols[j]}：害`);
    if(has(XING,a,c))  pairs.push(`${cols[i]}-${cols[j]}：刑`);
  }
  return pairs.length?pairs:['該当なし'];
}

function judgeChoko(monthBranch, energy){
  const seasonMap = { '春':['寅','卯','辰'], '夏':['巳','午','未'], '秋':['申','酉','戌'], '冬':['亥','子','丑'] };
  let season=''; for(const [k,v] of Object.entries(seasonMap)){ if(v.includes(normalizeBranch(monthBranch))) season=k; }
  const need={ '冬':['火','木'], '夏':['水','金'], '春':['金','土'], '秋':['木','火'] }[season]||[];
  const lack=need.filter(e=> (energy[e]||0) < 0.8);
  return {season, need, text:`季節=${season}（月支：${normalizeBranch(monthBranch)}） 推奨=${need.join('・')||'—'} → ` + (lack.length? `不足：${lack.join('・')}` : `概ね充足`)};
}

const STEMS   = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES= ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const JIAZI   = Array.from({length:60}, (_,i)=> STEMS[i%10] + BRANCHES[i%12]);
const KONGWANG_PAIRS = [ ['戌','亥'], ['申','酉'], ['午','未'], ['辰','巳'], ['寅','卯'], ['子','丑'] ];
const BRANCH_EMOJI = { 子:'🐭', 丑:'🐮', 寅:'🐯', 卯:'🐰', 辰:'🐲', 巳:'🐍', 午:'🐴', 未:'🐑', 申:'🐵', 酉:'🐔', 戌:'🐶', 亥:'🐷' };

function kongwangPairByGanzhi(gz){
  if (!gz || gz.length < 2) return null;
  const idx = JIAZI.findIndex(x => x === gz);
  if (idx < 0) return null;
  const decade = Math.floor(idx / 10);
  return KONGWANG_PAIRS[decade];
}

function renderKuboBlock(label, pair){
  const div = document.createElement('div');
  if (!pair){ div.textContent = `${label}：判定不可`; return div; }
  const [a,b] = pair;
  div.textContent = `${label}：${a}・${b}  ${BRANCH_EMOJI[a]||''} ${BRANCH_EMOJI[b]||''}`;
  return div;
}

function isYang(stem){ return ['甲','丙','戊','庚','壬'].includes(stem); }

function tenGodExact(dayStem, targetStem){
  const dEl = stemElement[dayStem];
  const tEl = stemElement[targetStem];
  if (!dEl || !tEl) return '';

  const samePol = isYang(dayStem) === isYang(targetStem);

  if (dEl === tEl) return samePol ? '比肩' : '劫財';
  if (gen[tEl] === dEl) return samePol ? '偏印' : '印綬';
  if (gen[dEl] === tEl) return samePol ? '食神' : '傷官';
  if (COUNTER[dEl] === tEl) return samePol ? '偏財' : '正財';
  if (COUNTER[tEl] === dEl) return samePol ? '偏官' : '正官';

  return '';
}

const signEl = s => (isYang(s)?'＋':'－') + stemEl(s);

const STAGE12 = {
  甲:{長生:'亥',沐浴:'子',冠帯:'丑',臨官:'寅',帝旺:'卯',衰:'辰',病:'巳',死:'午',墓:'未',絶:'申',胎:'酉',養:'戌'},
  乙:{長生:'午',沐浴:'巳',冠帯:'辰',臨官:'卯',帝旺:'寅',衰:'丑',病:'子',死:'亥',墓:'戌',絶:'酉',胎:'申',養:'未'},
  丙:{長生:'寅',沐浴:'卯',冠帯:'辰',臨官:'巳',帝旺:'午',衰:'未',病:'申',死:'酉',墓:'戌',絶:'亥',胎:'子',養:'丑'},
  丁:{長生:'申',沐浴:'酉',冠帯:'戌',臨官:'亥',帝旺:'子',衰:'丑',病:'寅',死:'卯',墓:'辰',絶:'巳',胎:'午',養:'未'},
  戊:{長生:'寅',沐浴:'卯',冠帯:'辰',臨官:'巳',帝旺:'午',衰:'未',病:'申',死:'酉',墓:'戌',絶:'亥',胎:'子',養:'丑'},
  己:{長生:'申',沐浴:'酉',冠帯:'戌',臨官:'亥',帝旺:'子',衰:'丑',病:'寅',死:'卯',墓:'辰',絶:'巳',胎:'午',養:'未'},
  庚:{長生:'巳',沐浴:'午',冠帯:'未',臨官:'申',帝旺:'酉',衰:'戌',病:'亥',死:'子',墓:'丑',絶:'寅',胎:'卯',養:'辰'},
  辛:{長生:'亥',沐浴:'子',冠帯:'丑',臨官:'寅',帝旺:'卯',衰:'辰',病:'巳',死:'午',墓:'未',絶:'申',胎:'酉',養:'戌'},
  壬:{長生:'申',沐浴:'酉',冠帯:'戌',臨官:'亥',帝旺:'子',衰:'丑',病:'寅',死:'卯',墓:'辰',絶:'巳',胎:'午',養:'未'},
  癸:{長生:'寅',沐浴:'卯',冠帯:'辰',臨官:'巳',帝旺:'午',衰:'未',病:'申',死:'酉',墓:'戌',絶:'亥',胎:'子',養:'丑'},
};

function stage12Of(s, b){
  const map = STAGE12[s]; if(!map) return '';
  for(const [k,v] of Object.entries(map)){ if(v===normalizeBranch(b)) return k; }
  return '';
}

const isCounterPair = (a,b)=> COUNTER[stemEl(a)]===stemEl(b) || COUNTER[stemEl(b)]===stemEl(a);

// ===== 月支蔵干から「代表の通変星（蔵干）」を1つ選ぶ =====
// 優先順位：月干へ露干 > 年/時干へ露干（同順位なら 本>中>余）> 露干なし：本>中>余
function selectZangTenGod(dayStem, monthBranch, stemsByPos){
  // stemsByPos: { yearG, monthG, dayG, timeG }
  const b = normalizeBranch(monthBranch);
  const z = (b && ZANG[b]) ? ZANG[b] : {};
  const order = ['hon','mid','rem'];     // 本>中>余
  const labelOf = k => k==='hon' ? '本気' : (k==='mid' ? '中気' : '余気');
  
  // ① 月干に露干（最優先）
  for (const k of order){
    const ck = z[k]; if (!ck) continue;
    if (stemsByPos.monthG && stemsByPos.monthG === ck){
      const tg = tenGodExact(dayStem, ck) || '－';
      return { tg, basis:`${labelOf(k)}「${ck}」が月干に露出`, src:'月干', zangKey:k, stem:ck };
    }
  }
  
  // ② 年・時干に露干（本>中>余・見つかった時点で採用）
  for (const k of order){
    const ck = z[k]; if (!ck) continue;
    if (stemsByPos.yearG === ck){
      const tg = tenGodExact(dayStem, ck) || '－';
      return { tg, basis:`${labelOf(k)}「${ck}」が年干に露出`, src:'年干', zangKey:k, stem:ck };
    }
    if (stemsByPos.timeG === ck){
      const tg = tenGodExact(dayStem, ck) || '－';
      return { tg, basis:`${labelOf(k)}「${ck}」が時干に露出`, src:'時干', zangKey:k, stem:ck };
    }
  }
  
  // ③ 露干なし → 本>中>余の順で採用
  for (const k of order){
    const ck = z[k]; if (!ck) continue;
    const tg = tenGodExact(dayStem, ck) || '－';
    return { tg, basis:`${labelOf(k)}「${ck}」を採用（露干なし）`, src:'深浅', zangKey:k, stem:ck };
  }
  
  // 蔵干が無いケース
  return { tg:'－', basis:'蔵干なし', src:'—', zangKey:null, stem:null };
}

// 通変星（蔵干）のセルに「陰陽＆五行」バッジ
function paintTgCell(id){
  const cell = document.getElementById(id);
  if (!cell) return;
  const label = (cell.textContent || '').trim();
  if (!label || label === '日主'){ return; }
  const parts = splitTgLabel(label);
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

/* ===================== 4) 実行部 IIFE Start===================== */
(async function main(){
  try {
    console.log('[BOOT] app.js start');

    const Lib = window.BaziCalculator;
    if (!Lib) { setText('summary','BaZiライブラリ未読み込み（index.global.js）'); return; }

    const loader = new Lib.BrowserDateMappingLoader('./src/dates_mapping.json');
    if (typeof loader.loadDateMappings === 'function') {
      try { await loader.loadDateMappings(); } catch (e) {}
    }

    const q = new URLSearchParams(location.search);
    const date = q.get('date') || '';
    const time = q.get('time') || '12:00';
    const tz   = q.get('tz')   || 'Asia/Tokyo';
    const [wHon,wMid,wRem] = (q.get('w') || '1.0,0.6,0.3').split(',').map(Number);
    const focusMul = 1;
    const tokoBonus= parseFloat(q.get('tb') || '0.2');

    setText('summary',
      date
        ? `生年月日 ${date}　出生時刻 ${time}　TZ ${tz}　配点 ${wHon}/${wMid}/${wRem}　透干+${tokoBonus}`
        : 'パラメータがありません'
    );
    const diag = $('diag'); if (diag) diag.textContent = '';

    if (!date) return;

    const [Y,M,D] = date.split('-').map(Number);
    const [hh] = time.split(':').map(Number);
    const hourInt = isFinite(hh) ? hh : 12;
    const calc = new Lib.BaziCalculator(Y, M, D, hourInt, 'male', loader);
    const pillars = calc.calculatePillars();

    let basic;
    if (typeof calc.calculateBasicAnalysis === 'function') {
      try { basic = calc.calculateBasicAnalysis(); }
      catch (e) { basic = { fiveFactors: {} }; }
    } else {
      basic = { fiveFactors: {} };
    }

    function getBranchSafe(pillar){
      const s = pillar && pillar.chinese ? String(pillar.chinese) : '';
      for (const ch of Array.from(s)) if (ZANG[ch]) return ch;
      for (const zhi of BRANCH12) if (s.includes(zhi)) return zhi;
      return '';
    }

    const yG = pickStem(pillars.year);
    const mG = pickStem(pillars.month);
    const dG = pickStem(pillars.day);
    const hG = pickStem(pillars.time);

    const yB = getBranchSafe(pillars.year);
    const mB = getBranchSafe(pillars.month);
    const dB = getBranchSafe(pillars.day);
    const hB = getBranchSafe(pillars.time);

    console.log('[CHK] stems:', { yG, mG, dG, hG });
    console.log('[CHK] branches:', { yB, mB, dB, hB });
    console.log('========== VERSION: 2024-FIXED-ZHI-IDS ==========');

    setText('y', pillars.year.chinese);
    setText('m', pillars.month.chinese);
    setText('d', pillars.day.chinese);
    setText('h', pillars.time.chinese);

    console.log('[STEP1] 地支の値確認:', { yB, mB, dB, hB });
    console.log('[STEP2] BRANCH_METAチェック - yB:', yB, BRANCH_META[yB]);
    console.log('[STEP3] BRANCH_METAチェック - mB:', mB, BRANCH_META[mB]);

    // 地支セル用フラグメント作成（支字＋陰陽＋五行バッジ）
    function buildZhiFrag(zhi){
      const frag = document.createDocumentFragment();
      const z = String(zhi || '').trim();
      
      console.log('[buildZhiFrag] 入力:', zhi, '→トリム後:', z);

      const main = document.createElement('span');
      main.textContent = z || '—';
      main.style.marginRight = '6px';
      frag.appendChild(main);

      const meta = BRANCH_META[z];
      console.log('[buildZhiFrag] メタ情報:', z, '→', meta);
      
      if (meta){
        const yyBadge = makeBadge(meta.yy, meta.yy === '陽' ? 'yang' : 'yin');
        frag.appendChild(yyBadge);
        frag.appendChild(document.createTextNode(' '));
        
        const elBadge = makeBadge(meta.el);
        elBadge.classList.add('el-' + meta.el);
        frag.appendChild(elBadge);
        
        console.log('[buildZhiFrag] バッジ追加完了:', meta.yy, meta.el);
      } else {
        console.error('[buildZhiFrag] エラー: メタ情報なし for', z);
      }
      return frag;
    }

    // 地支行にバッジを追加描画（HTMLの実際のID: zhi_h, zhi_d, zhi_m, zhi_y）
    console.log('[STEP4] paintZhiRow 実行開始 <<<<<<');
    (function paintZhiRowWithBadges(){
      const pairs = [
        ['zhi_y', yB],  // 年
        ['zhi_m', mB],  // 月
        ['zhi_d', dB],  // 日
        ['zhi_h', hB],  // 時
      ];
      
      pairs.forEach(([id, zhi])=>{
        console.log('[paintZhi] 処理中:', id, '←', zhi);
        const cell = document.getElementById(id);
        if (!cell) {
          console.error('[paintZhi] セル未発見:', id);
          return;
        }
        console.log('[paintZhi] セル発見:', id);
        cell.innerHTML = '';
        const frag = buildZhiFrag(zhi);
        cell.appendChild(frag);
        console.log('[paintZhi] 描画完了:', id);
      });
      console.log('[STEP5] paintZhiRow 実行完了 >>>>>>');
    })();

    // 天干セル用フラグメント作成（干＋陰陽＋五行バッジ）
    function buildStemFrag(stem) {
      const frag = document.createDocumentFragment();
      const s = String(stem || '').trim();

      const main = document.createElement('span');
      main.textContent = s || '—';
      main.style.marginRight = '6px';
      frag.appendChild(main);

      if (s) {
        const yy = YANG_STEMS.includes(s) ? '陽' : '陰';
        frag.appendChild( makeBadge(yy, yy === '陽' ? 'yang' : 'yin') );
        frag.appendChild(document.createTextNode(' '));
      }

      const element = stemElement[s];
      if (element) {
        const elBadge = makeBadge(element);
        elBadge.classList.add('el-' + element);
        frag.appendChild(elBadge);
      }

      return frag;
    }

    // 天干行描画
    (function paintStemRow(){
      const map = { 
        c_time_g: hG, 
        c_day_g: dG, 
        c_month_g: mG, 
        c_year_g: yG 
      };

      Object.entries(map).forEach(([id, stem])=>{
        const cell = document.getElementById(id);
        if (!cell) return;
        cell.innerHTML = '';
        cell.appendChild( buildStemFrag(stem) );
      });

      console.log('[DBG] paintStemRow', map);
    })();

    // 通変星（干）
    setText('c_year_tg',  tenGodExact(dG, yG) || '－');
    setText('c_month_tg', tenGodExact(dG, mG) || '－');
    setText('c_day_tg',   '');
    setText('c_time_tg',  tenGodExact(dG, hG) || '－');

    paintTgCell('c_year_tg');
    paintTgCell('c_month_tg');
    paintTgCell('c_day_tg');
    paintTgCell('c_time_tg');

    // 九星
    const birthYear = Number((q.get('date')||'').slice(0,4));
    if ($('c_kyusei') && birthYear){
      setText('c_kyusei', kyuseiSimpleByYear(birthYear) + '（※簡易計算）');
    }

    // 五行バランス
    (function renderFiveBalance(){
      const order = ['木','火','土','金','水'];
      const cnt = { 木:0, 火:0, 土:0, 金:0, 水:0 };

      [yG, mG, dG, hG].forEach(s => { const el = stemElement[s]; if (el) cnt[el] += 1; });
      [yB, mB, dB, hB].forEach(b => { const el = branchElement[b]; if (el) cnt[el] += 1; });

      const wrap = $('energy');
      if (wrap){
        while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
        const row = order.map(k => cnt[k]);
        wrap.appendChild(createTable(order, [row]));
        const header = wrap.previousElementSibling;
        if (header && header.tagName === 'H2') header.textContent = '五行バランス';
        wrap.appendChild( makeFiveRadarSVG(cnt, {size:260, max:8}) );
      }

      window.__fiveCounts = cnt;

      (function renderYinYang(){
        const yy = { 陽:0, 陰:0 };
        [yG, mG, dG, hG].forEach(s => { if (s) yy[ yinYangOfStem(s) ]++; });
        [yB, mB, dB, hB].forEach(b => { if (b) yy[ yinYangOfBranch(b) ]++; });
        window.__yyCounts = yy;

        const energyWrap = $('energy');
        if (!energyWrap) return;

        const h2 = document.createElement('h2');
        h2.textContent = '陰陽バランス';
        energyWrap.parentNode.insertBefore(h2, energyWrap.nextSibling);

        const yyWrap = document.createElement('div');
        yyWrap.id = 'yybalance';
        yyWrap.style.marginTop = '6px';
        energyWrap.parentNode.insertBefore(yyWrap, h2.nextSibling);

        const tbl = createTable(['陽','陰'], [[yy.陽, yy.陰]]);
        yyWrap.appendChild(tbl);

        const pieHost = document.createElement('div');
        pieHost.id = 'yyChart';
        pieHost.style.display = 'block';
        pieHost.style.margin = '8px auto';
        yyWrap.appendChild(pieHost);
        renderYinYangPie(pieHost, yy.陰, yy.陽);

        const strengthBox = $('strength')?.parentElement;
        const kakkyokuBox = $('kakkyoku')?.parentElement;
        if (strengthBox && kakkyokuBox){
          const host = document.createElement('div');
          host.style.display = 'grid';
          host.style.gridTemplateColumns = '1fr 1fr';
          host.style.gap = '14px';
          host.style.marginTop = '10px';
          yyWrap.parentNode.insertBefore(host, yyWrap.nextSibling);
          host.appendChild(strengthBox);
          host.appendChild(kakkyokuBox);
        }
      })();

    })();

    // 身強弱
    const fiveCounts = window.__fiveCounts || {木:0,火:0,土:0,金:0,水:0};
    const fiveForStrength = {
      WOOD:  fiveCounts.木,
      FIRE:  fiveCounts.火,
      EARTH: fiveCounts.土,
      METAL: fiveCounts.金,
      WATER: fiveCounts.水
    };
    const st = judgeStrength(fiveForStrength, dG);

    const stW = $('strength');
    if (stW){
      stW.innerHTML='';
      stW.appendChild(badge(st.label));
      const span=document.createElement('span');
      span.style.marginLeft='8px';
      span.textContent=st.detail;
      stW.appendChild(span);
    }

    // 格局 + 用神
    const kk = judgeKakkyoku(dG, mB, st.label);
    const kkW = $('kakkyoku');
    if (kkW){
      kkW.innerHTML='';
      kkW.appendChild(badge(kk.name));
      const b2=document.createElement('span'); 
      b2.style.marginLeft='8px'; 
      b2.textContent=kk.basis; 
      kkW.appendChild(b2);
    }
    const yj = YOJIN[kk.name];
    const yWrap = $('yojin');
    if (yWrap){
      yWrap.innerHTML='';
      if (yj) yWrap.appendChild(
        createTable(['用神','喜神','忌神','仇神'],
          [[yj.用神.join('・'), yj.喜神.join('・'), yj.忌神.join('・'), yj.仇神.join('・')]]
        )
      );
    }

    // 成敗：透干・合冲刑害・調候
    const toko = detectToko(pillars);
    const rel  = detectRelations(pillars);
    const chk  = judgeChoko(mB, fiveCounts);

    const tWrap = $('toko');      if (tWrap){ tWrap.innerHTML=''; tWrap.appendChild(createList(toko)); }
    const rWrap = $('relations'); if (rWrap){ rWrap.innerHTML=''; rWrap.appendChild(createList(rel)); }
    const cWrap = $('choko');     if (cWrap){ cWrap.textContent = chk.text; }

    // 天剋地冲
    const tkdc = [];
    const cols=['年','月','日','時'], stems=[yG,mG,dG,hG], brs=[yB,mB,dB,hB];
    const isChong=(a,b)=> CHONG.some(p=> (p[0]===a&&p[1]===b)||(p[0]===b&&p[1]===a));
    for(let i=0;i<4;i++) for(let j=i+1;j<4;j++){
      if (isCounterPair(stems[i],stems[j]) && isChong(normalizeBranch(brs[i]),normalizeBranch(brs[j]))) {
        tkdc.push(`${cols[i]}-${cols[j]}：天剋地冲`);
      }
    }
    if ($('tkdc')) { $('tkdc').innerHTML = ''; $('tkdc').appendChild(createList(tkdc.length?tkdc:['該当なし'])); }

    // 守護神
    if ($('guardian')) {
      const asStem = (el) => GUARDIAN_DEFAULT_STEM[el] || '－';
      const parts = [];
      if (chk.need.length >= 1) parts.push(`第一：${asStem(chk.need[0])}（${chk.need[0]||'－'}）`);
      if (chk.need.length >= 2) parts.push(`第二：${asStem(chk.need[1])}（${chk.need[1]||'－'}）`);
      $('guardian').textContent = parts.length ? parts.join('　') : '—';
    }

    // 天中殺
    const kubo = $('kubo');
    if (kubo){
      kubo.innerHTML = '';
      kubo.appendChild( renderKuboBlock('日天中殺',  kongwangPairByGanzhi(pillars.day.chinese)) );
      kubo.appendChild( renderKuboBlock('生年天中殺', kongwangPairByGanzhi(pillars.year.chinese)) );
    }

    /* ========== クラシック命式表：待機してから描画 ========== */
    function waitForId(id, tries = 40, intervalMs = 50){
      return new Promise(resolve => {
        let i = 0;
        (function loop(){
          if (document.getElementById(id)) return resolve(true);
          if (++i >= tries) return resolve(false);
          setTimeout(loop, intervalMs);
        })();
      });
    }

    function renderClassic(){
      const Yc = pillars.year.chinese;
      const Mc = pillars.month.chinese;
      const Dc = pillars.day.chinese;
      const Hc = pillars.time.chinese;

      setText('c_time_gz',  Hc);
      setText('c_day_gz',   Dc);
      setText('c_month_gz', Mc);
      setText('c_year_gz',  Yc);

      setText('c_time_g',  hG);
      setText('c_day_g',   dG);
      setText('c_month_g', mG);
      setText('c_year_g',  yG);

      [['c_year_g', yG], ['c_month_g', mG], ['c_day_g', dG], ['c_time_g', hG]].forEach(([id, g])=>{
        const cell = document.getElementById(id);
        if (!cell) return;
        cell.appendChild(document.createTextNode(' '));
        const yy = yinYangOfStem(g);
        cell.appendChild( makeBadge(yy, yy==='陽' ? 'yang' : 'yin') );
        cell.appendChild(document.createTextNode(' '));
        const element = stemElement[g] || '－';
        const elBadge2 = makeBadge(element);
        if (element && element !== '－') elBadge2.classList.add(`el-${element}`);
        cell.appendChild(elBadge2);
      });

      setText('c_time_zhi',  hB);
      setText('c_day_zhi',   dB);
      setText('c_month_zhi', mB);
      setText('c_year_zhi',  yB);

      setText('c_time_gogyou',  signEl(hG));      
      setText('c_day_gogyou',   signEl(dG));
      setText('c_month_gogyou', signEl(mG));
      setText('c_year_gogyou',  signEl(yG));

      setText('c_time_tg',  tenGodExact(dG, hG) || '－');
      setText('c_day_tg',   '');
      setText('c_month_tg', tenGodExact(dG, mG) || '－');
      setText('c_year_tg',  tenGodExact(dG, yG) || '－');

      const paintZangBadgesOnly = (prefix, b) => {
        const z = (b && ZANG[b]) ? ZANG[b] : {};
        const map = { hon: z.hon || '－', mid: z.mid || '－', rem: z.rem || '－' };
        ['hon','mid','rem'].forEach(k=>{
          const el = document.getElementById(`${prefix}_zang_${k}`);
          if (!el) return;
          el.classList.remove('yin','yang','neutral');
          el.textContent = map[k];
          el.classList.add(
            (!map[k] || map[k]==='－' || map[k]==='-') ? 'neutral'
            : (YANG_STEMS.includes(map[k]) ? 'yang' : 'yin')
          );
          const elName = stemEl(map[k]);
          if (elName) el.classList.add(`el-${elName}`);
        });
      };
      paintZangBadgesOnly('c_year',  yB);
      paintZangBadgesOnly('c_month', mB);
      paintZangBadgesOnly('c_day',   dB);
      paintZangBadgesOnly('c_time',  hB);

      const paintZangTG = (prefix, branch) => {
        const b = normalizeBranch(branch);
        const z = (b && ZANG[b]) ? ZANG[b] : {};
        const tgMap = {
          hon: z.hon ? tenGodExact(dG, z.hon) : '－',
          mid: z.mid ? tenGodExact(dG, z.mid) : '－',
          rem: z.rem ? tenGodExact(dG, z.rem) : '－',
        };
        [['hon','_zang_tg_hon'],['mid','_zang_tg_mid'],['rem','_zang_tg_rem']].forEach(([k,suf])=>{
          const el = document.getElementById(prefix + suf);
          if (el) el.textContent = tgMap[k];
        });
      };
      paintZangTG('c_year',  yB);
      paintZangTG('c_month', mB);
      paintZangTG('c_day',   dB);
      paintZangTG('c_time',  hB);

      // ========== 大運表の描画（関数内に移動）==========
      function renderDaiunTable(pillars, gender, birthYear) {
        const section = document.getElementById('daiunSection');
        const tbody = document.querySelector('#daiunTable tbody');
        if (!section || !tbody) return;

        try {
          const yearStem = pickStem(pillars.year);
          const stemYinYang = YANG_STEMS.includes(yearStem) ? '陽' : '陰';
          const isForward = (gender === 'male' && stemYinYang === '陽') ||
                            (gender === 'female' && stemYinYang === '陰');

          const startAge = 10;
          const monthBranch = pickBranch(pillars.month);
          const monthStem = pickStem(pillars.month);

          const stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
          const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

          const currentStemIdx = stems.indexOf(monthStem);
          const currentBranchIdx = branches.indexOf(monthBranch);
          tbody.innerHTML = '';

          for (let i = 0; i < 10; i++) {
            const age = startAge + (i * 10);
            const year = birthYear + age;

            const step = isForward ? i + 1 : -(i + 1);
            const stemIdx = (currentStemIdx + step + 10) % 10;
            const branchIdx = (currentBranchIdx + step + 12) % 12;

            const daiunStem = stems[stemIdx];
            const daiunBranch = branches[branchIdx];
            const daiunGanshi = daiunStem + daiunBranch;

            const tongbianStem = tenGodExact(dG, daiunStem);
            const z = ZANG[daiunBranch];
            const mainZanggan = z?.hon || '';
            const tongbianBranch = mainZanggan ? tenGodExact(dG, mainZanggan) : '';
            const juniunsei = stage12Of(dG, daiunBranch);

            const relations = [];
            [
              {key: 'year', label: '年'},
              {key: 'month', label: '月'},
              {key: 'day', label: '日'},
              {key: 'time', label: '時'}
            ].forEach(({key, label}) => {
              const pBranch = pickBranch(pillars[key]);
              if (CHONG.some(([a,b]) => (a===daiunBranch&&b===pBranch)||(a===pBranch&&b===daiunBranch))) {
                relations.push(`${label}支と冲`);
              }
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${age}〜${age+9}歳<br><span class="muted">(${year}〜${year+9})</span></td>
              <td><strong>${daiunGanshi}</strong></td>
              <td>天干: ${tongbianStem || '—'}<br>地支: ${tongbianBranch || '—'}</td>
              <td>${juniunsei || '—'}</td>
              <td>${relations.length > 0 ? relations.join('<br>') : '—'}</td>`;
            tbody.appendChild(tr);
          }

          section.style.display = 'block';
        } catch (err) {
          console.error('大運表の描画エラー:', err);
        }
      }

      // 大運表を描画
      const birthYear = parseInt(q.get('year')) || Y;
      const gender = q.get('gender') || 'male';
      renderDaiunTable(pillars, gender, birthYear);
    }

    // 命式表の要素が存在するか確認してから描画
    const hasClassicTable = document.getElementById('c_time_gz');
    if (hasClassicTable) {
      const ready = await waitForId('c_time_gz');
      if (ready) {
        renderClassic();
        console.log('[CLASSIC] 命式表描画完了');
      }
    }

    console.log('[BOOT] app.js end');

  } catch (err) {
    console.error('[ERROR] main:', err);
    if ($('summary')) {
      $('summary').textContent = 'エラーが発生しました: ' + err.message;
    }
  }
})();

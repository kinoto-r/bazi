/**
 * bazi-all.js - 統合版（デバッグ・単一ファイル読み込み用）
 * 
 * 使用方法:
 * <script src="bazi-all.js"></script>
 * <script src="app.js"></script>
 */

console.log('[LOAD] bazi-all.js 読み込み開始');

/* ==================== bazi-constants.js ==================== */
const stemElement = {
  '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土',
  '庚':'金','辛':'金','壬':'水','癸':'水'
};

const branchElement = {
  '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火',
  '午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'
};

const stemEl = s => stemElement[s] || '';
const gen = {'木':'火','火':'土','土':'金','金':'水','水':'木'};
const COUNTER = {'木':'土','火':'金','土':'水','金':'木','水':'火'};

const ZANG = {
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

function normalizeBranch(b) {
  if (!b) return b;
  const s = String(b).replace(/\s+/g,'');
  if (BRANCH12.includes(s)) return s;
  for (const zhi of BRANCH12) {
    if (s.includes(zhi)) return zhi;
  }
  return b;
}

const YOJIN = {
  "建禄（比劫）格":{"用神":["印綬/偏印"],"喜神":["比肩/劫財","印綬/偏印"],"忌神":["正官/偏官"],"仇神":["正財/偏財","食神/傷官"]},
  "印綬格":{"用神":["比肩/劫財"],"喜神":["印綬/偏印"],"忌神":["正財/偏財"],"仇神":["食神/傷官","正官/偏官"]},
  "財格":{"用神":["正官/偏官"],"喜神":["正財/偏財","食神/傷官"],"忌神":["比肩/劫財"],"仇神":["印綬/偏印"]},
  "官格（官殺格）":{"用神":["印綬/偏印"],"喜神":["正官/偏官"],"忌神":["食神/傷官"],"仇神":["比肩/劫財","正財/偏財"]},
  "食傷格":{"用神":["正財/偏財"],"喜神":["食神/傷官"],"忌神":["正官/偏官"],"仇神":["印綬/偏印"]},
  "従財格":{"用神":["正財/偏財"],"喜神":["食神/傷官"],"忌神":["印綬/偏印"],"仇神":["比肩/劫財"]},
  "従殺格":{"用神":["正官/偏官"],"喜神":["印綬/偏印"],"忌神":["食神/傷官"],"仇神":["比肩/劫財"]},
  "従児格":{"用神":["食神/傷官"],"喜神":["正財/偏財"],"忌神":["正官/偏官"],"仇神":["印綬/偏印"]},
  "従強格":{"用神":["比肩/劫財"],"喜神":["印綬/偏印"],"忌神":["正財/偏財"],"仇神":["正官/偏官","食神/傷官"]}
};

const YANG_STEMS = ['甲','丙','戊','庚','壬'];
function yinYangOfStem(stem) { return YANG_STEMS.includes(stem) ? '陽' : '陰'; }

const BRANCH_YIN_YANG = {子:'陽',丑:'陰',寅:'陽',卯:'陰',辰:'陽',巳:'陰',午:'陽',未:'陰',申:'陽',酉:'陰',戌:'陽',亥:'陰'};
function yinYangOfBranch(branch) { return BRANCH_YIN_YANG[branch] || ''; }

const BRANCH_ELEMENT = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
function elementOfBranch(branch) { return BRANCH_ELEMENT[branch] || ''; }

const GUARDIAN_DEFAULT_STEM = {木:'甲',火:'丙',土:'戊',金:'庚',水:'癸'};

function kyuseiSimpleByYear(year) {
  const n = (11 - (year % 9));
  const idx = ((n - 1 + 9) % 9) + 1;
  const names = {1:'一白水星',2:'二黒土星',3:'三碧木星',4:'四緑木星',5:'五黄土星',6:'六白金星',7:'七赤金星',8:'八白土星',9:'九紫火星'};
  return names[idx] || '—';
}

function splitTgLabel(raw) {
  if (!raw) return [];
  return String(raw).split(/[／\/]/).map(s => s.trim()).filter(Boolean);
}

const TEN_GOD_META = {
  '比肩':{el:'木',yy:'陽'},'劫財':{el:'木',yy:'陰'},
  '食神':{el:'火',yy:'陽'},'傷官':{el:'火',yy:'陰'},
  '偏財':{el:'土',yy:'陽'},'正財':{el:'土',yy:'陰'},
  '偏官':{el:'金',yy:'陽'},'正官':{el:'金',yy:'陰'},
  '偏印':{el:'水',yy:'陽'},'印綬':{el:'水',yy:'陰'}
};

const BRANCH_META = {
  '子':{el:'水',yy:'陽'},'丑':{el:'土',yy:'陰'},'寅':{el:'木',yy:'陽'},
  '卯':{el:'木',yy:'陰'},'辰':{el:'土',yy:'陽'},'巳':{el:'火',yy:'陰'},
  '午':{el:'火',yy:'陽'},'未':{el:'土',yy:'陰'},'申':{el:'金',yy:'陽'},
  '酉':{el:'金',yy:'陰'},'戌':{el:'土',yy:'陽'},'亥':{el:'水',yy:'陰'}
};

const LIUHE=[['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];
const CHONG=[['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
const HAI=[['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']];
const XING=[['子','卯'],['寅','巳'],['申','亥'],['丑','戌','未']];

const STEMS=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const JIAZI=Array.from({length:60},(_,i)=>STEMS[i%10]+BRANCHES[i%12]);
const KONGWANG_PAIRS=[['戌','亥'],['申','酉'],['午','未'],['辰','巳'],['寅','卯'],['子','丑']];
const BRANCH_EMOJI={子:'🐭',丑:'🐮',寅:'🐯',卯:'🐰',辰:'🐲',巳:'🐍',午:'🐴',未:'🐑',申:'🐵',酉:'🐔',戌:'🐶',亥:'🐷'};

const STAGE12 = {
  甲:{長生:'亥',沐浴:'子',冠帯:'丑',臨官:'寅',帝旺:'卯',衰:'辰',病:'巳',死:'午',墓:'未',絶:'申',胎:'酉',養:'戌'},
  乙:{長生:'午',沐浴:'巳',冠帯:'辰',臨官:'卯',帝旺:'寅',衰:'丑',病:'子',死:'亥',墓:'戌',絶:'酉',胎:'申',養:'未'},
  丙:{長生:'寅',沐浴:'卯',冠帯:'辰',臨官:'巳',帝旺:'午',衰:'未',病:'申',死:'酉',墓:'戌',絶:'亥',胎:'子',養:'丑'},
  丁:{長生:'酉',沐浴:'申',冠帯:'未',臨官:'午',帝旺:'巳',衰:'辰',病:'卯',死:'寅',墓:'丑',絶:'子',胎:'亥',養:'戌'},
  戊:{長生:'寅',沐浴:'卯',冠帯:'辰',臨官:'巳',帝旺:'午',衰:'未',病:'申',死:'酉',墓:'戌',絶:'亥',胎:'子',養:'丑'},
  己:{長生:'酉',沐浴:'申',冠帯:'未',臨官:'午',帝旺:'巳',衰:'辰',病:'卯',死:'寅',墓:'丑',絶:'子',胎:'亥',養:'戌'},
  庚:{長生:'巳',沐浴:'午',冠帯:'未',臨官:'申',帝旺:'酉',衰:'戌',病:'亥',死:'子',墓:'丑',絶:'寅',胎:'卯',養:'辰'},
  辛:{長生:'子',沐浴:'亥',冠帯:'戌',臨官:'酉',帝旺:'申',衰:'未',病:'午',死:'巳',墓:'辰',絶:'卯',胎:'寅',養:'丑'},
  壬:{長生:'申',沐浴:'酉',冠帯:'戌',臨官:'亥',帝旺:'子',衰:'丑',病:'寅',死:'卯',墓:'辰',絶:'巳',胎:'午',養:'未'},
  癸:{長生:'卯',沐浴:'寅',冠帯:'丑',臨官:'子',帝旺:'亥',衰:'戌',病:'酉',死:'申',墓:'未',絶:'午',胎:'巳',養:'辰'}
};

const STAGE12_VALUES = {胎:3,養:6,長生:9,沐浴:7,冠帯:10,建禄:11,帝旺:12,衰:8,病:4,死:2,墓:5,絶:1};

console.log('[LOAD] ✓ bazi-constants.js 統合完了');

/* ==================== bazi-utils.js ==================== */
const $ = id => document.getElementById(id);
const setText = (id, txt) => { const n = $(id); if (n) n.textContent = (txt ?? ""); };
const pickStem = p => (p && p.chinese) ? p.chinese.charAt(0) : '';
const pickBranch = p => (p && p.chinese) ? p.chinese.charAt(1) : '';

function safeParseParams() {
  const params = {};
  const search = window.location.search;
  if (search) {
    const sp = new URLSearchParams(search);
    sp.forEach((value, key) => { params[key] = value; });
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
      if (!params[key]) { params[key] = value; }
    });
  }
  return params;
}

function convertFullToHalf(str) {
  if (!str) return '';
  return str.replace(/[\uFF01-\uFF5E]/g, s => 
    String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  ).replace(/\u3000/g, ' ');
}

function waitForId(id, tries = 40, intervalMs = 50) {
  return new Promise(resolve => {
    let i = 0;
    (function loop() {
      if (document.getElementById(id)) return resolve(true);
      if (++i >= tries) return resolve(false);
      setTimeout(loop, intervalMs);
    })();
  });
}

console.log('[LOAD] ✓ bazi-utils.js 統合完了');

/* ==================== bazi-logic.js ==================== */
function starOf(dayStem, targetStem) {
  const d = stemElement[dayStem], t = stemElement[targetStem];
  if (!d || !t) return null;
  if (t === d) return '比肩/劫財';
  if (gen[t] === d) return '印綬/偏印';
  if (gen[d] === t) return '食神/傷官';
  if (COUNTER[d] === t) return '正財/偏財';
  if (COUNTER[t] === d) return '正官/偏官';
  return null;
}

function judgeStrength(five, dayStem) {
  const e = stemElement[dayStem];
  const by = {木:five.WOOD||0,火:five.FIRE||0,土:five.EARTH||0,金:five.METAL||0,水:five.WATER||0};
  const helper = (by[e]||0) + (by[Object.keys(gen).find(k => gen[k] === e)]||0);
  const leak = (by[gen[e]]||0), cai = (by[COUNTER[e]]||0), guan = (by[Object.keys(COUNTER).find(k => COUNTER[k] === e)]||0);
  const suppress = leak + cai + guan, total = helper + suppress;
  if (!total) return {label:'中庸',detail:'—'};
  const r = helper / total;
  let label = '中庸';
  if (r >= 0.70) label = '極身強';
  else if (r >= 0.55) label = '身強';
  else if (r <= 0.30) label = '極身弱';
  else if (r <= 0.45) label = '身弱';
  return {label, detail:`助身=${helper.toFixed(2)} / 抑身=${suppress.toFixed(2)}（${(r*100).toFixed(1)}%）`};
}

function judgeKakkyoku(dayStem, monthBranch, strengthLabel) {
  const z = ZANG[normalizeBranch(monthBranch)];
  if (!z || !z.hon) return {name:'不明',basis:'—'};
  const s = starOf(dayStem, z.hon) || '不明';
  const base = {'比肩/劫財':'建禄（比劫）格','印綬/偏印':'印綬格','正財/偏財':'財格','正官/偏官':'官格（官殺格）','食神/傷官':'食傷格'}[s] || '不明';
  let name = base;
  if (strengthLabel === '極身弱') {
    if (s === '正財/偏財') name = '従財格';
    else if (s === '正官/偏官') name = '従殺格';
    else if (s === '食神/傷官') name = '従児格';
  } else if (strengthLabel === '極身強') {
    if (s === '比肩/劫財') name = '従強格';
  }
  return {name, basis:`月令本気「${z.hon}」は日干に対し「${s}」`};
}

function detectToko(p) {
  const res = [], stems = [pickStem(p.year),pickStem(p.month),pickStem(p.day),pickStem(p.time)];
  const branches = [pickBranch(p.year),pickBranch(p.month),pickBranch(p.day),pickBranch(p.time)];
  const cols = ['年','月','日','時'];
  branches.forEach((br, bi) => {
    const z = ZANG[normalizeBranch(br)];
    if (!z) return;
    ['hon','mid','rem'].forEach(k => {
      const s = z[k];
      if (s && stems.includes(s)) res.push(`${cols[bi]}支${k==='hon'?'本気':k==='mid'?'中気':'余気'}「${s}」が天干に透出`);
    });
  });
  return res.length ? res : ['透干なし'];
}

function detectRelations(p) {
  const b = [pickBranch(p.year),pickBranch(p.month),pickBranch(p.day),pickBranch(p.time)];
  const cols = ['年','月','日','時'], pairs = [];
  const has = (arr, a, c) => arr.some(x => x.length === 2 ? ((x[0] === a && x[1] === c) || (x[1] === a && x[0] === c)) : (x.includes(a) && x.includes(c)));
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const a = b[i], c = b[j];
      if (!a || !c) continue;
      if (has(LIUHE, a, c)) pairs.push(`${cols[i]}-${cols[j]}：六合`);
      if (has(CHONG, a, c)) pairs.push(`${cols[i]}-${cols[j]}：冲`);
      if (has(HAI, a, c)) pairs.push(`${cols[i]}-${cols[j]}：害`);
      if (has(XING, a, c)) pairs.push(`${cols[i]}-${cols[j]}：刑`);
    }
  }
  return pairs.length ? pairs : ['該当なし'];
}

function judgeChoko(monthBranch, energy) {
  const seasonMap = {春:['寅','卯','辰'],夏:['巳','午','未'],秋:['申','酉','戌'],冬:['亥','子','丑']};
  let season = '';
  for (const [k, v] of Object.entries(seasonMap)) { if (v.includes(normalizeBranch(monthBranch))) season = k; }
  const need = {冬:['火','木'],夏:['水','金'],春:['金','土'],秋:['木','火']}[season] || [];
  const lack = need.filter(e => (energy[e] || 0) < 0.8);
  return {season, need, text:`季節=${season}（月支：${normalizeBranch(monthBranch)}） 推奨=${need.join('・')||'—'} → ` + (lack.length ? `不足：${lack.join('・')}` : `概ね充足`)};
}

function kongwangPairByGanzhi(gz) {
  if (!gz || gz.length < 2) return null;
  const idx = JIAZI.findIndex(x => x === gz);
  if (idx < 0) return null;
  return KONGWANG_PAIRS[Math.floor(idx / 10)];
}

function isYang(stem) { return ['甲','丙','戊','庚','壬'].includes(stem); }

function tenGodExact(dayStem, targetStem) {
  const dEl = stemElement[dayStem], tEl = stemElement[targetStem];
  if (!dEl || !tEl) return '';
  const samePol = isYang(dayStem) === isYang(targetStem);
  if (dEl === tEl) return samePol ? '比肩' : '劫財';
  if (gen[tEl] === dEl) return samePol ? '偏印' : '印綬';
  if (gen[dEl] === tEl) return samePol ? '食神' : '傷官';
  if (COUNTER[dEl] === tEl) return samePol ? '偏財' : '正財';
  if (COUNTER[tEl] === dEl) return samePol ? '偏官' : '正官';
  return '';
}

const signEl = s => (isYang(s) ? '＋' : '－') + stemEl(s);

function stage12Of(dayStem, branch) {
  const map = STAGE12[dayStem];
  if (!map) return '';
  const nb = normalizeBranch(branch);
  for (const [stageName, branchChar] of Object.entries(map)) {
    if (branchChar === nb) return stageName;
  }
  return '';
}

function stage12Value(stageName) { return STAGE12_VALUES[stageName] || 0; }

const isCounterPair = (a, b) => COUNTER[stemEl(a)] === stemEl(b) || COUNTER[stemEl(b)] === stemEl(a);

function selectZangTenGod(dayStem, monthBranch, stemsByPos) {
  const b = normalizeBranch(monthBranch);
  const zang = ZANG[b];
  if (!zang) return {tg:'－',basis:'蔵干なし',zangKey:null};
  const zangLayers = [
    {key:'hon',label:'本気',stem:zang.hon},
    {key:'mid',label:'中気',stem:zang.mid},
    {key:'rem',label:'余気',stem:zang.rem}
  ].filter(z => z.stem);
  const visible = zangLayers.find(layer => Object.values(stemsByPos).includes(layer.stem));
  if (visible) return {tg:tenGodExact(dayStem, visible.stem)||'－',basis:`${visible.label}「${visible.stem}」が天干に透出`,zangKey:visible.key,stem:visible.stem};
  for (const layer of zangLayers) {
    const tg = tenGodExact(dayStem, layer.stem);
    if (tg && tg !== '－') return {tg,basis:`${layer.label}「${layer.stem}」を採用（透干なし）`,zangKey:layer.key,stem:layer.stem};
  }
  return {tg:'－',basis:'蔵干該当なし',zangKey:null,stem:null};
}

console.log('[LOAD] ✓ bazi-logic.js 統合完了');

console.log('[LOAD] bazi-all.js 読み込み完了 - すべての関数が利用可能です');
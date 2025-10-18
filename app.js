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
function createList(items) { const ul=document.createElement('ul'); items.forEach(s=>{ const li=document.createElement('li'); li.textContent=s; ul.appendChild(li); }); return ul; }
function badge(text){ const span=document.createElement('span'); span.textContent=text; span.style.border='1px solid #ddd'; span.style.borderRadius='999px'; span.style.padding='2px 8px'; return span; }
const pickStem   = p => (p && p.chinese) ? p.chinese.charAt(0) : '';
const pickBranch = p => (p && p.chinese) ? p.chinese.charAt(1) : '';

/* ===================== 2) ベース定義 ===================== */
const stemElement={'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
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
// 格局→用神（簡易）
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

// ★ 復活：格局判定
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


// 地支1文字を“必ず”抽出（'地支：卯' や不可視文字にも強い）
function extractBranchStrict(raw){
  if (!raw) return null;
  const s = String(raw);
  for (const ch of Array.from(s)) { if (ZANG[ch]) return ch; }   // '子'〜'亥'
  for (const zhi of BRANCH12){ if (s.includes(zhi)) return zhi; }
  return null;
}

// 地支Raw→蔵干（本/中/余）を安全に取得
function getZangSafe(branchRaw){
  const b = extractBranchStrict(branchRaw);
  return b ? (ZANG[b] || {}) : {};
}

// “—/－/空白” を neutral とみなす
function isDashLike(v){
  return !v || v === '－' || v === '—' || v === '-' || /^\s*$/.test(v);
}


// ZANG を“必ず”取りたい時はこれを使う
function getZangByAny(raw){
  const b = extractBranchStrict(raw);
  return b ? ZANG[b] : null;
}

// 甲・丙・戊・庚・壬 を陽、それ以外を陰、null/－は neutral
function yinYangClass(stem){
  if (!stem || stem === '－' || stem === '-') return 'neutral';
  return ['甲','丙','戊','庚','壬'].includes(stem) ? 'yang' : 'yin';
}

// --- 五行の“単純カウント”版 ---
function simpleElementCount(stems, branches) {
  // stems: ['甲','乙',...], branches: ['子','丑',...]
  const cnt = { 木:0, 火:0, 土:0, 金:0, 水:0 };

  // 1) 天干4本
  stems.forEach(s => {
    const el = stemElement[s];
    if (el) cnt[el] += 1;
  });

  // 2) 各地支の蔵干（本/中/余）をフラットに数える
  branches.forEach(b => {
    const z = (b && ZANG[b]) ? ZANG[b] : null;
    if (!z) return;
    if (z.hon) { const el = stemElement[z.hon]; if (el) cnt[el] += 1; }
    if (z.mid) { const el = stemElement[z.mid]; if (el) cnt[el] += 1; }
    if (z.rem) { const el = stemElement[z.rem]; if (el) cnt[el] += 1; }
  });

return cnt;           // ← これが抜けている状態でした
}                        // ← 閉じカッコも忘れずに

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

/* ==== 空亡（旬空亡）判定用 ==== */
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

// 陰陽（陽の五行）
function isYang(stem){ return ['甲','丙','戊','庚','壬'].includes(stem); }

// 十神（天干）
function tenGodSingle(dayStem, targetStem){
  const dEl = stemElement[dayStem];
  const tEl = stemElement[targetStem];
  if (!dEl || !tEl) return '';
  if (dEl === tEl) return '比肩/劫財';
  if (gen[tEl] === dEl) return '印綬/偏印';
  if (gen[dEl] === tEl) return '食神/傷官';
  if (COUNTER[dEl] === tEl) return '正財/偏財';
  if (COUNTER[tEl] === dEl) return isYang(dayStem) === isYang(targetStem) ? '正官' : '偏官';
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

/* ===================== 4) 実行部 ===================== */
(async function main(){

console.log('[BOOT] app.js start');


  try{
    // ライブラリ
    const Lib = window.BaziCalculator;
    if (!Lib) { setText('summary','BaZiライブラリ未読み込み（index.global.js）'); return; }
    // dates_mapping.json は未使用でもOK（失敗は握りつぶす）
    const loader = new Lib.BrowserDateMappingLoader('./src/dates_mapping.json');
    if (typeof loader.loadDateMappings === 'function') { try { await loader.loadDateMappings(); } catch(e){} }

    // パラメータ
    const q = new URLSearchParams(location.search);
    const date = q.get('date') || '';
    const time = q.get('time') || '12:00';
    const tz   = q.get('tz')   || 'Asia/Tokyo';
    const [wHon,wMid,wRem] = (q.get('w') || '1.0,0.6,0.3').split(',').map(Number);
    const focusMul = 1;
    const tokoBonus= parseFloat(q.get('tb') || '0.2');

    setText('summary', date ? `生年月日 ${date}　出生時刻 ${time}　TZ ${tz}　配点 ${wHon}/${wMid}/${wRem}　透干+${tokoBonus}` : 'パラメータがありません');
    const diag = $('diag'); if (diag) diag.textContent = '';

    if (!date) return;

    // 干支計算
    const [Y,M,D] = date.split('-').map(Number);
    const [hh] = time.split(':').map(Number);
    const hourInt = isFinite(hh) ? hh : 12;
    const calc = new Lib.BaziCalculator(Y, M, D, hourInt, 'male', loader);
    const pillars = calc.calculatePillars();

// ←この直後に追加
//let basic;
//If (typeof calc.calculateBasicAnalysis === 'function') { basic = calc.calculateBasicAnalysis();
} else {
  // 念のためフォールバック（ライブラリ差異対策）
  basic = { fiveFactors: {} };
}


// ---- 地支1文字を安全に取り出す（不可視文字 / 「地支：卯」対策）※定義は1回だけ
function getBranchSafe(pillar){
  const s = pillar && pillar.chinese ? String(pillar.chinese) : '';
  for (const ch of Array.from(s)) if (ZANG[ch]) return ch;   // '子'〜'亥'
  for (const zhi of BRANCH12) if (s.includes(zhi)) return zhi;
  return '';
}

// ---- 干（天干）と支（地支）を1回だけ定義
const yG = pickStem(pillars.year);
const mG = pickStem(pillars.month);
const dG = pickStem(pillars.day);
const hG = pickStem(pillars.time);

const yB = getBranchSafe(pillars.year);
const mB = getBranchSafe(pillars.month);
const dB = getBranchSafe(pillars.day);
const hB = getBranchSafe(pillars.time);

// （任意デバッグ：1回だけ）
console.log('[CHK] stems:', { yG, mG, dG, hG });
console.log('[CHK] branches:', { yB, mB, dB, hB });
console.log('[CHK] ZANG hit:', { y: ZANG[yB], m: ZANG[mB], d: ZANG[dB], h: ZANG[hB] });

// 上部カード（存在すれば）
setText('y', pillars.year.chinese);
setText('m', pillars.month.chinese);
setText('d', pillars.day.chinese);
setText('h', pillars.time.chinese);

// “地支”の表示は安全な1文字（yB…）を使う
setText('c_year_zhi', yB);
setText('c_month_zhi', mB);
setText('c_day_zhi',   dB);
setText('c_time_zhi',  hB);

// 旧カード用の id（yZ,mZ,dZ,hZ）が残っている場合に備えて、ここで一度だけ同値を用意（任意）
const yZ = yB, mZ = mB, dZ = dB, hZ = hB;

// 干に対する通変星（干）
const tgOf = (s) => tenGodSingle(dG, s) || '－';
setText('c_year_tg',  tgOf(yG));
setText('c_month_tg', tgOf(mG));
setText('c_day_tg',   '日主');
setText('c_time_tg',  tgOf(hG));


    //（旧）蔵干テーブル #zTable が残っている場合のみ再描画（※本体はクラシック表）
    const tbody = document.querySelector('#zTable tbody');
    if (tbody){
      while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
      const branchesMap = {'年':yZ,'月':mZ,'日':dZ,'時':hZ};
      for (const k of ['年','月','日','時']){
        const b = branchesMap[k];
        const z = ZANG[ normalizeBranch(b) ] || {hon:null,mid:null,rem:null};
        const tgTriple = [z.hon?tenGodSingle(dG,z.hon):'－', z.mid?tenGodSingle(dG,z.mid):'－', z.rem?tenGodSingle(dG,z.rem):'－'].join('／');
        const tr = document.createElement('tr');
        [k, normalizeBranch(b), (z.hon||'-'), (z.mid||'-'), (z.rem||'-'), tgTriple].forEach(v=>{
          const td=document.createElement('td'); td.textContent=String(v); tr.appendChild(td);
        });
        tbody.appendChild(tr);
      }
    }

// === エネルギー（五行スコア：単純カウント） ===

  const counts = simpleElementCount([yG, mG, dG, hG], [yB, mB, dB, hB]);

  const engWrap = $('energy');
  if (engWrap){
    while (engWrap.firstChild) engWrap.removeChild(engWrap.firstChild);
    const row = [counts.木, counts.火, counts.土, counts.金, counts.水];
    engWrap.appendChild(createTable(['木','火','土','金','水'], [row]));
  }
　　// 後で使うなら任意で公開
　　window.__fiveCounts = counts;

    // 身強弱

    const fiveForStrength = {
  WOOD:  counts.木,
  FIRE:  counts.火,
  EARTH: counts.土,
  METAL: counts.金,
  WATER: counts.水
};

    const st = judgeStrength(basic.fiveFactors||{}, dG);
    const stW = $('strength'); if (stW){ stW.innerHTML=''; stW.appendChild(badge(st.label)); const span=document.createElement('span'); span.style.marginLeft='8px'; span.textContent=st.detail; stW.appendChild(span); }

    // 格局 + 用神
    const kk = judgeKakkyoku(dG, mZ, st.label);
    const kkW = $('kakkyoku'); if (kkW){ kkW.innerHTML=''; kkW.appendChild(badge(kk.name)); const b2=document.createElement('span'); b2.style.marginLeft='8px'; b2.textContent=kk.basis; kkW.appendChild(b2); }
    const yj = YOJIN[kk.name]; const yWrap = $('yojin'); if (yWrap){ yWrap.innerHTML=''; if (yj) yWrap.appendChild(createTable(['用神','喜神','忌神','仇神'], [[yj.用神.join('・'), yj.喜神.join('・'), yj.忌神.join('・'), yj.仇神.join('・')]])); }
   // 成敗：透干・合冲刑害・調候
   const toko = detectToko(pillars); const rel = detectRelations(pillars); const chk = judgeChoko(mZ, window.__fiveCounts || counts );

    const tWrap = $('toko');     if (tWrap){ tWrap.innerHTML=''; tWrap.appendChild(createList(toko)); }
    const rWrap = $('relations');if (rWrap){ rWrap.innerHTML=''; rWrap.appendChild(createList(rel)); }
    const cWrap = $('choko');    if (cWrap){ cWrap.textContent = chk.text; }

    // 天剋地冲
    const tkdc = [];
    const cols=['年','月','日','時'], stems=[yG,mG,dG,hG], brs=[yZ,mZ,dZ,hZ];
    const isChong=(a,b)=> CHONG.some(p=> (p[0]===a&&p[1]===b)||(p[0]===b&&p[1]===a));
    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
      if (isCounterPair(stems[i],stems[j]) && isChong(normalizeBranch(brs[i]),normalizeBranch(brs[j]))) tkdc.push(`${cols[i]}-${cols[j]}：天剋地冲`);
    }
    if ($('tkdc')) { $('tkdc').innerHTML = ''; $('tkdc').appendChild(createList(tkdc.length?tkdc:['該当なし'])); }

    // 守護神（調候優先）
    if ($('guardian')) {
      const guardian = [];
      if (chk.need.length) guardian.push('第一：'+(chk.need[0]||'－'));
      if (chk.need.length>1) guardian.push('第二：'+(chk.need[1]||'－'));
      $('guardian').textContent = guardian.length? guardian.join('　') : '—';
    }

    // 天中殺（空亡）
    const kubo = $('kubo');
    if (kubo){
      kubo.innerHTML = '';
      kubo.appendChild( renderKuboBlock('日天中殺',  kongwangPairByGanzhi(pillars.day.chinese)) );
      kubo.appendChild( renderKuboBlock('生年天中殺', kongwangPairByGanzhi(pillars.year.chinese)) );
    }
console.log('[CHK] yB,mB,dB,hB =', yB, mB, dB, hB);

/* ========== クラシック命式表：ここが “if ブロック” ========== */
console.log('[BLOCK] classic exists?', !!$('c_year_gz'));
if ($('c_year_gz')) {
  try {
    console.log('[BLOCK] classic entered');

    // 4柱（干支）
    const Yc = pillars.year.chinese;
    const Mc = pillars.month.chinese;
    const Dc = pillars.day.chinese;
    const Hc = pillars.time.chinese;

    // 干支（上段）
    setText('c_year_gz',  Yc);
    setText('c_month_gz', Mc);
    setText('c_day_gz',   Dc);
    setText('c_time_gz',  Hc);

    // 地支（安全な1文字）
    setText('c_year_zhi', yB);
    setText('c_month_zhi', mB);
    setText('c_day_zhi',   dB);
    setText('c_time_zhi',  hB);

    // 五行（±）
    setText('c_year_gogyou',  signEl(yG));
    setText('c_month_gogyou', signEl(mG));
    setText('c_day_gogyou',   signEl(dG));
    setText('c_time_gogyou',  signEl(hG));

    // 通変星（干）
    const tgLocal = (s) => tenGodSingle(dG, s) || '－';
    setText('c_year_tg',  tgLocal(yG));
    setText('c_month_tg', tgLocal(mG));
    setText('c_day_tg',   '日主');
    setText('c_time_tg',  tgLocal(hG));

    // ===== 蔵干（区分）だけ反映 =====
    const paintZangBadgesOnly = (prefix, b) => {
      const z = (b && ZANG[b]) ? ZANG[b] : {};
      const map = { hon: z.hon || '－', mid: z.mid || '－', rem: z.rem || '－' };
      ['hon','mid','rem'].forEach(k=>{
        const el = document.getElementById(`${prefix}_zang_${k}`);
        if (!el) return;
        el.classList.remove('yin','yang','neutral');
        el.textContent = map[k];
        el.classList.add(
          !map[k] || map[k]==='－' || map[k]==='-' ? 'neutral'
          : (['甲','丙','戊','庚','壬'].includes(map[k]) ? 'yang' : 'yin')
        );
      });
    };
    paintZangBadgesOnly('c_year',  yB);
    paintZangBadgesOnly('c_month', mB);
    paintZangBadgesOnly('c_day',   dB);
    paintZangBadgesOnly('c_time',  hB);

    // ===== 十二運（文字） =====
    const s12Local = (g,b) => stage12Of(g, b) || '－';
    const sYear  = s12Local(dG, yB);
    const sMonth = s12Local(dG, mB);
    const sDay   = s12Local(dG, dB);
    const sTime  = s12Local(dG, hB);
    setText('c_year_12un',  sYear);
    setText('c_month_12un', sMonth);
    setText('c_day_12un',   sDay);
    setText('c_time_12un',  sTime);

    // ===== 十二運（数）→ 添付表の値 =====
    const STAGE_ENERGY = {
      '胎':3, '養':6, '長生':9, '沐浴':7,
      '冠帯':10, '建禄':11, '帝旺':12,
      '衰':8, '病':4, '死':2, '墓':5, '絶':1,
      // 互換用：実装が「臨官」を返すケース
      '臨官':11
    };
    setText('c_year_12un_val',  STAGE_ENERGY[sYear]  ? String(STAGE_ENERGY[sYear])  : '－');
    setText('c_month_12un_val', STAGE_ENERGY[sMonth] ? String(STAGE_ENERGY[sMonth]) : '－');
    setText('c_day_12un_val',   STAGE_ENERGY[sDay]   ? String(STAGE_ENERGY[sDay])   : '－');
    setText('c_time_12un_val',  STAGE_ENERGY[sTime]  ? String(STAGE_ENERGY[sTime])  : '－');

    // 天中殺（2行）
    const dayKW  = kongwangPairByGanzhi(Dc);
    const yearKW = kongwangPairByGanzhi(Yc);
    setText('kwDay',  dayKW  ? `日天中殺：${dayKW[0]}・${dayKW[1]}`   : '日天中殺：－');
    setText('kwYear', yearKW ? `生年天中殺：${yearKW[0]}・${yearKW[1]}` : '生年天中殺：－');

    console.log('[BLOCK] classic finished');
  } catch (subErr) {
    console.error('[Classic table block error]', subErr);
    const d = $('diag');
    if (d) d.textContent = 'クラシック表の描画中にエラー：' + (subErr?.message || subErr);
  }
} else {
  console.warn('[BLOCK] classic not found: #c_year_gz が無い');
}

// app.js
// ========== URLの生年月日から必ず命式を計算する版 ==========
// ===== 天剋地冲の検出（簡易）=====
// ルール：対象2柱の「地支が冲（子-午, 丑-未, 寅-申, 卯-酉, 辰-戌, 巳-亥）」
// かつ「天干が相剋（元素で剋関係）」なら天剋地冲と判定。
function detectTkdcLocal(pillars) {
  if (!pillars) return [];

  const clashPairs = new Set(['子-午','午-子','丑-未','未-丑','寅-申','申-寅','卯-酉','酉-卯','辰-戌','戌-辰','巳-亥','亥-巳']);
  const ke = {'木':'土','土':'水','水':'火','火':'金','金':'木'}; // Aが剋す→ke[A]

  const getStem = p => p && p.chinese ? p.chinese[0] : null;
  const getBranch = p => p && p.chinese ? p.chinese[1] : null;

  const stemEl = (s) => (typeof stemElement !== 'undefined' && stemElement[s]) ? stemElement[s] : null;

  const pairs = [
    { a:'年', p1:pillars.year,  b:'月', p2:pillars.month },
    { a:'年', p1:pillars.year,  b:'日', p2:pillars.day   },
    { a:'年', p1:pillars.year,  b:'時', p2:pillars.time  },
    { a:'月', p1:pillars.month, b:'日', p2:pillars.day   },
    { a:'月', p1:pillars.month, b:'時', p2:pillars.time  },
    { a:'日', p1:pillars.day,   b:'時', p2:pillars.time  },
  ];

  const out = [];
  for (const pr of pairs) {
    const s1 = getStem(pr.p1), s2 = getStem(pr.p2);
    const b1 = getBranch(pr.p1), b2 = getBranch(pr.p2);
    if (!s1 || !s2 || !b1 || !b2) continue;

    const clashKey = `${b1}-${b2}`;
    const isChong = clashPairs.has(clashKey);
    const e1 = stemEl(s1), e2 = stemEl(s2);
    const stemKe = (e1 && e2) ? (ke[e1] === e2 || ke[e2] === e1) : false;

    if (isChong && stemKe) {
      out.push(`${pr.a}-${pr.b}：天剋地冲（${s1}${b1} × ${s2}${b2}）`);
    }
  }
  return out;
}
// 節入日からの経過日数（0日目=節入当日）を date_mapping から算出
function calcDaysFromJieqiStart(year, month, day, loader) {
  if (!loader || typeof loader.getDateMappingData !== 'function') return null;

  const data = loader.getDateMappingData().mappings || {};
  const yStr = String(year);
  const mStr = String(month);
  const dStr = String(day);
  const todayInfo = (data[yStr] && data[yStr][mStr]) ? data[yStr][mStr][dStr] : null;
  if (!todayInfo || todayInfo.season == null) return null;

  const targetSeason = todayInfo.season;
  const birthDate = new Date(year, month - 1, day);
  let startDate = new Date(birthDate);

  // 前日に同じ season が続く限りさかのぼる（最大 60 日の安全弁）
  for (let i = 0; i < 60; i += 1) {
    const prev = new Date(startDate);
    prev.setDate(prev.getDate() - 1);
    const py = String(prev.getFullYear());
    const pm = String(prev.getMonth() + 1);
    const pd = String(prev.getDate());
    const prevInfo = (data[py] && data[py][pm]) ? data[py][pm][pd] : null;
    if (!prevInfo || prevInfo.season !== targetSeason) {
      break;
    }
    startDate = prev;
  }

  const diffDays = Math.round((birthDate - startDate) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 ? diffDays : null;
}

// ===== 用神セット（四神：五行で表示。身強/身弱ベース）=====
// 仕様：
//  身強 → 用神: 食神/傷官（洩気 = 生じる側）、喜神: 正財/偏財（我剋）、忌神: 正官/偏官（剋我）、仇神: 印綬/偏印（生我）
//  身弱 → 用神: 印綬/偏印（生我）、喜神: 比肩/劫財（比劫）、忌神: 正財/偏財（我剋）、仇神: 正官/偏官（剋我）
//  表示は各十神ペアに対応する五行（日干基準）。不足側の順序調整は行わず、五行を固定で示す。
function drawYojinSetAsTenGods(stems, fiveCounts) {
  const elYou = document.getElementById('yojin_you') || null;
  const elKi  = document.getElementById('yojin_ki')  || null;
  const elIki = document.getElementById('yojin_iki') || null;
  const elGyu = document.getElementById('yojin_gyu') || null;
  const elOne = document.getElementById('yojin')     || null;

  // 身強弱
  let strengthLabel = '';
  try {
    const fv = {
      WOOD:  fiveCounts['木']||0, FIRE: fiveCounts['火']||0,
      EARTH: fiveCounts['土']||0, METAL: fiveCounts['金']||0, WATER:fiveCounts['水']||0
    };
    const s = judgeStrength(fv, stems.dG);
    strengthLabel = (s && (s.name || s.label)) ? (s.name || s.label) : '';
  } catch (e) {
    console.warn('[YOJIN-TG] judgeStrength error', e);
  }
  const isStrong = /身強/.test(strengthLabel);
  const isWeak   = /身弱/.test(strengthLabel);

  // 日干の五行
  const dayElJP = stemEl(stems.dG);
  const day = dayElJP ? JP2EN[dayElJP] : null;

  if (!day) {
    const fallback = '-';
    if (elYou) elYou.textContent = fallback;
    if (elKi)  elKi.textContent  = fallback;
    if (elIki) elIki.textContent = fallback;
    if (elGyu) elGyu.textContent = fallback;
    if (elOne) elOne.textContent = '—';
    console.warn('[YOJIN-TG] 日干の五行が取得できません');
    return;
  }

  // 十神ペア → 五行（日干基準）のマッピング
  const pairElement = {
    shokusho: EN2JP[SHENG_NEXT[day]], // 洩気（食傷）
    zai:      EN2JP[KE_TARGET[day]],  // 我剋（財）
    kan:      EN2JP[KE_BY[day]],      // 剋我（官殺）
    in:       EN2JP[SHENG_PREV[day]], // 生我（印）
    hiki:     EN2JP[day],             // 比劫

  let YOU='', KI='', IKI='', GYU='';
  if (isStrong) {
    YOU = pairElement.shokusho;
    KI  = pairElement.zai;
    IKI = pairElement.kan;
    GYU = pairElement.in;
  } else if (isWeak) {
    YOU = pairElement.in;
    KI  = pairElement.hiki;
    IKI = pairElement.zai;
    GYU = pairElement.kan;
  } else {
    // 中庸：最小限のルール（財・官を抑え、印・比で補う）
    YOU = pairElement.in;
    KI  = pairElement.hiki;
    IKI = pairElement.zai;
    GYU = pairElement.kan;
  }

  if (elYou && elKi && elIki && elGyu) {
    elYou.textContent = YOU;
    elKi.textContent  = KI;
    elIki.textContent = IKI;
    elGyu.textContent = GYU;
  } else if (elOne) {
    elOne.innerHTML = `用神：${YOU} ｜ 喜神：${KI} ｜ 忌神：${IKI} ｜ 仇神：${GYU}`;
  }
  console.log('[YOJIN-TG]', {strengthLabel, YOU, KI, IKI, GYU});
}

// ===== 五行ユーティリティ（相生・相剋：内部専用） =====
const JP2EN = { '木':'WOOD','火':'FIRE','土':'EARTH','金':'METAL','水':'WATER' };
const EN2JP = { WOOD:'木', FIRE:'火', EARTH:'土', METAL:'金', WATER:'水' };

// 相生（生み出す）: 木→火→土→金→水→木
const SHENG_NEXT = { WOOD:'FIRE', FIRE:'EARTH', EARTH:'METAL', METAL:'WATER', WATER:'WOOD' };
// 相剋（克する）: 木剋土／土剋水／水剋火／火剋金／金剋木
const KE_TARGET = { WOOD:'EARTH', EARTH:'WATER', WATER:'FIRE', FIRE:'METAL', METAL:'WOOD' };

// 逆参照（誰がこの要素を生むか・誰に剋されるか）
const SHENG_PREV = { FIRE:'WOOD', EARTH:'FIRE', METAL:'EARTH', WATER:'METAL', WOOD:'WATER' };
const KE_BY      = { EARTH:'WOOD', WATER:'EARTH', FIRE:'WATER', METAL:'FIRE', WOOD:'METAL' };

// ===== 用神セット描画（身強弱×日干五行で決定） =====
// ルール（簡易・一貫性重視）
// - 身強：日主が強い → 瀉（漏・剋）でバランス
//    用神: 官殺（剋する五行 = KE_BY[day]）／財（漏らす五行 = SHENG_NEXT[day]）
//    喜神: 上記2つのうち不足側（fiveCountsで少ない方）を優先
//    忌神: 比劫（同五行 = day）、印（生じる五行 = SHENG_PREV[day]）
// - 身弱：日主が弱い → 扶（生・比）で補強
//    用神: 印（SHENG_PREV[day]）／比劫（day）
//    喜神: 上記2つのうち不足側を優先
//    忌神: 財（SHENG_NEXT[day]）、官殺（KE_BY[day]）
// - 仇神: 忌神の次順位（残った方）
// ※ strengthLabel は "身強"/"身弱" を含む想定。含まれない場合は五行差最小化で中庸を返す。
function drawYojinSet(stems, fiveCounts) {
  // 出力先（4行版に対応：存在しなければ #yojin 一括にフォールバック）
  const elYou = document.getElementById('yojin_you') || null;
  const elKi  = document.getElementById('yojin_ki')  || null;
  const elIki = document.getElementById('yojin_iki') || null;
  const elGyu = document.getElementById('yojin_gyu') || null;
  const elOneCell = document.getElementById('yojin') || null;

  // 日干の五行
  const dayStem = stems.dG;
  const dayElJP = (typeof stemElement !== 'undefined' && stemElement[dayStem]) ? stemElement[dayStem] : null;
  const day = dayElJP ? JP2EN[dayElJP] : null;
  if (!day) {
    if (elOneCell) elOneCell.textContent = '—';
    if (elYou) elYou.textContent = '-';
    if (elKi)  elKi.textContent  = '-';
    if (elIki) elIki.textContent = '-';
    if (elGyu) elGyu.textContent = '-';
    console.warn('[YOJIN] 日干の五行が取得できません');
    return;
  }

  // 身強弱を再計算（judgeStrength は bazi-logic.js）
  let strengthLabel = '';
  try {
    const fv = {
      WOOD:  fiveCounts['木']||0, FIRE: fiveCounts['火']||0,
      EARTH: fiveCounts['土']||0, METAL:fiveCounts['金']||0, WATER:fiveCounts['水']||0
    };
    const s = judgeStrength(fv, stems.dG);
    strengthLabel = (s && (s.name || s.label)) ? (s.name || s.label) : '';
  } catch (e) {
    console.warn('[YOJIN] judgeStrength でエラー', e);
  }

  const isStrong = /身強/.test(strengthLabel);
  const isWeak   = /身弱/.test(strengthLabel);

  // 候補生成
  let youjin = [], kishin = [], ikishin = [], gyoushin = [];

  if (isStrong) {
    const 官殺 = KE_BY[day];         // 日主を剋する要素
    const 財   = SHENG_NEXT[day];     // 日主から洩れる要素
    const 印   = SHENG_PREV[day];     // 日主を生む要素
    const 比劫 = day;                 // 同五行

    // 不足側を優先（簡易：fiveCountsの少ない方）
    const 官殺JP = EN2JP[官殺], 財JP = EN2JP[財], 印JP = EN2JP[印], 比劫JP = EN2JP[比劫];
    const 官殺Cnt = fiveCounts[官殺JP]||0, 財Cnt = fiveCounts[財JP]||0;

    youjin = (官殺Cnt <= 財Cnt) ? [官殺JP, 財JP] : [財JP, 官殺JP];
    kishin = youjin.slice(); // 喜神は用神の補助
    ikishin = [印JP, 比劫JP]; // 抑えたい
    gyoushin = ikishin.slice(1).concat(ikishin.slice(0,1)); // 次順位
  } else if (isWeak) {
    const 印   = SHENG_PREV[day];
    const 比劫 = day;
    const 財   = SHENG_NEXT[day];
    const 官殺 = KE_BY[day];

    const 印JP = EN2JP[印], 比劫JP = EN2JP[比劫], 財JP = EN2JP[財], 官殺JP = EN2JP[官殺];
    const 印Cnt = fiveCounts[印JP]||0, 比Cnt = fiveCounts[比劫JP]||0;

    youjin = (印Cnt <= 比Cnt) ? [印JP, 比劫JP] : [比劫JP, 印JP];
    kishin = youjin.slice();
    ikishin = [財JP, 官殺JP];
    gyoushin = ikishin.slice(1).concat(ikishin.slice(0,1));
  } else {
    // 中庸：総数が最小の2要素を用神・喜神、最大の2要素を忌神・仇神に配分
    const entries = Object.entries(fiveCounts); // [ ['木',n], ... ]
    entries.sort((a,b)=>a[1]-b[1]);
    youjin = [entries[0][0], entries[1][0]];
    kishin = youjin.slice();
    const maxSorted = [...entries].sort((a,b)=>b[1]-a[1]);
    ikishin = [maxSorted[0][0], maxSorted[1][0]];
    gyoushin = ikishin.slice(1).concat(ikishin.slice(0,1));
  }

  // 出力
  const fmt = arr => (arr && arr.length) ? arr.slice(0,2).join('・') : '-';

  if (elYou && elKi && elIki && elGyu) {
    elYou.textContent = fmt(youjin);
    elKi.textContent  = fmt(kishin);
    elIki.textContent = fmt(ikishin);
    elGyu.textContent = fmt(gyoushin);
  } else if (elOneCell) {
    elOneCell.innerHTML = `
      用神：${fmt(youjin)}　｜　喜神：${fmt(kishin)}　｜　
      忌神：${fmt(ikishin)}　｜　仇神：${fmt(gyoushin)}
    `;
  }
  console.log('[YOJIN SET]', {strengthLabel, day:EN2JP[day], youjin, kishin, ikishin, gyoushin});
}
// ===== 守護神（調候優先）。季節×不足五行から1〜2件を五行で表示 =====
function drawGuardianByChoko(branches, fiveCounts) {
  const el = document.getElementById('guardian');
  if (!el) return;

  let needs = [];
  try {
    const choko = judgeChoko(branches.mB, fiveCounts); // 想定: { need: ['木','水'] など, lack:[...], basis:... }
    if (choko && Array.isArray(choko.need)) needs = choko.need;
  } catch (e) {
    console.warn('[GUARDIAN] judgeChoko でエラー', e);
  }

  if (!needs || needs.length === 0) {
    el.textContent = '-';
    return;
  }

  // 1〜2件に絞る（不足度が大きい順を優先…現状は順序どおり）
  const pick = needs.slice(0,2);
  el.textContent = pick.join('・');
  console.log('[GUARDIAN]', pick);
}


(async function () {
  // 0) まず URL を読む
  let params = {};
  try {
    params = safeParseParams();
    console.log('[BOOT] URL params =', params);
  } catch (e) {
    console.error('[BOOT] URL params が読めません', e);
    showDiag('URLパラメータの読み込みに失敗しました。birth, time, gender を確認してください。');
    return;
  }

  // 1) 必須チェック：birth がなければ何もできない
  if (!params.birth) {
    console.error('[BOOT] birth=YYYY-MM-DD がありません。');
    showDiag('birth=YYYY-MM-DD がありません。入力ページの送信内容を確認してください。');
    return;
  }

  // 2) BaziCalculator がロードされているか確認
  if (typeof globalThis.BaziCalculator === 'undefined') {
    console.error('[BOOT] BaziCalculator(index.global.js) が読み込まれていません。');
    showDiag('index.global.js の読み込み順を確認してください（app.js より前）。');
    return;
  }

  // 3) birth, time, gender をJSの値にする
  const [by, bm, bd] = params.birth.split('-').map(n => parseInt(n, 10));
  if (!by || !bm || !bd) {
    console.error('[BOOT] birth の形式が不正です:', params.birth);
    showDiag('birth の形式が不正です。YYYY-MM-DD で送ってください。');
    return;
  }

const hour = params.time ? parseInt(params.time.split(':')[0], 10) : 0;
const gender = (params.gender === 'male' || params.gender === 'female')
  ? params.gender
  : 'female';
drawKyuseiByYear(by);

  // 4) date mapping を読み込む（あなたの指定パス）
  // ▼ date_mapping.json をいくつかの候補パスで探す
const mappingPaths = [
  // 実際に存在するパス（あなたの環境）
  './src/dates_mapping.json',

  // 予備（同じドメイン相対で動かしたいとき用）
  './src/dates_mapping.json',
  './src/dates_mapping.json',

  // 万一ローカルで見るときの予備
  './dates_mapping.json'
];

let loader = null;
let loaded = false;

for (const p of mappingPaths) {
  try {
    loader = new BaziCalculator.BrowserDateMappingLoader(p);
    if (typeof loader.loadDateMappings === 'function') {
      await loader.loadDateMappings();
    }
    console.log('[BOOT] dates_mapping.json 読み込み成功:', p);

    // 中身に何年あるか見ておくと検証しやすい
    const allMaps = loader.getDateMappingData().mappings || {};
    console.log('[DEBUG] years in mapping =', Object.keys(allMaps).slice(0, 50));
    loaded = true;
    break;
  } catch (e) {
    console.warn('[BOOT] dates_mapping.json 読み込み失敗:', p, e);
  }
}

if (!loaded) {
  showDiag('dates_mapping.json が取得できませんでした。パスを確認してください。');
  return;
}



  // 5) 実際に四柱を計算
  let pillars;
  try {
    const calc = new BaziCalculator.BaziCalculator(by, bm, bd, hour, gender, loader);
    const res  = calc.calculatePillars();

    pillars = {
      year:  { chinese: res.year.chinese },
      month: { chinese: res.month.chinese },
      day:   { chinese: res.day.chinese },
      time:  { chinese: res.time.chinese }
    };
    console.log('[BOOT] 命式を計算しました', pillars);
  } catch (e) {
    console.error('[BOOT] 命式計算に失敗しました', e);
    showDiag('命式計算に失敗しました。date_mapping の中に対象日付があるか確認してください。');
    return;
  }
 // ★ここを足す：大運・九星で使う生年
  const birthYear = by;
  drawKyuseiByYear(birthYear);

  // 6) 干支を分解（ここから先はいつもの描画ルート）
  const stems = {
    yG: pickStem(pillars.year),
    mG: pickStem(pillars.month),
    dG: pickStem(pillars.day),
    hG: pickStem(pillars.time),
  };
  const branches = {
    yB: pickBranch(pillars.year),
    mB: pickBranch(pillars.month),
    dB: pickBranch(pillars.day),
    hB: pickBranch(pillars.time),
  };

  // 7) 生年（大運・九星用）は birth から取る
 // 生年だけで出す超簡易九星（1979 → 三碧木星 になる式）
function drawKyuseiByYear(birthYear) {
  const el = document.getElementById('c_kyusei');
  if (!el) return;

  const numToName = {
    1: '一白水星',
    2: '二黒土星',
    3: '三碧木星',
    4: '四緑木星',
    5: '五黄土星',
    6: '六白金星',
    7: '七赤金星',
    8: '八白土星',
    9: '九紫火星'
  };

  // 西暦から九星番号を出す簡易式
  let n = (11 - (birthYear % 9)) % 9;
  if (n === 0) n = 9;  // 0 は九紫に振る

  const name = numToName[n] || '—';
  console.log('[KYUSEI]', birthYear, '→', n, name);
  el.textContent = name;
}


  // 8) 命式テーブル
  try {
    renderClassicTable(pillars, stems.dG, stems, branches);
    console.log('[BOOT] 命式テーブル描画OK');
  } catch (e) {
    console.error('[BOOT] 命式テーブル描画でエラー', e);
  }

  // 9) 五行・陰陽
  let fiveCounts = { 木:0, 火:0, 土:0, 金:0, 水:0 };
  let yyCounts   = { 陽:0, 陰:0 };
  try {
    fiveCounts = buildFiveCounts(stems, branches);
    yyCounts   = buildYinYangCounts(stems, branches);
    renderFiveBalanceSection(fiveCounts, yyCounts);
console.log('[BOOT] 五行・陰陽OK (2)', fiveCounts, yyCounts);
  } catch (e) {
    console.warn('[BOOT] 五行・陰陽でエラー', e);
  }

/// ▼出力一式
drawStrengthKakkyokuYojin(stems, branches, fiveCounts);   // 身強弱・格局（既存OK）
drawZangRepresentative(stems, branches);                   // 蔵干通変星（OK）
drawStage12(stems.dG, branches);                           // 十二運星・十二運（数）（OK）
drawYojinSetAsTenGods(stems, fiveCounts);                  // ★新：十神ペアで出力
drawGuardianByChoko(branches, fiveCounts);                 // ★新：調候の書式
drawLogicBlocks(pillars, stems, branches, fiveCounts);     // 成敗ロジック（tkdc 表示含む）


// ===== 守護神（調候優先）：季節・推奨・不足を明示 =====
function drawGuardianByChoko(branches, fiveCounts) {
  const el = document.getElementById('guardian');
  if (!el) return;

  // 季節判定（簡易）
  const seasonMap = {
    '寅':'春','卯':'春','辰':'春',
    '巳':'夏','午':'夏','未':'夏',
    '申':'秋','酉':'秋','戌':'秋',
    '亥':'冬','子':'冬','丑':'冬'
  };
  const monthB = branches.mB;
  const season = seasonMap[monthB] || '—';

  // 調候ロジック
  let needs = [], basis = '';
  try {
    const choko = judgeChoko(branches.mB, fiveCounts);
    if (choko) {
      if (Array.isArray(choko.need)) needs = choko.need;
      if (choko.basis) basis = choko.basis;
    }
  } catch (e) {
    console.warn('[GUARDIAN] judgeChoko error', e);
  }

  if (!needs || needs.length === 0) {
    el.textContent = '-';
    return;
  }

  // 不足：needs の中で fiveCounts が最小の要素（複数同率なら複数）
  let min = Infinity;
  needs.forEach(g => { const v = fiveCounts[g]||0; if (v < min) min = v; });
  const lackList = needs.filter(g => (fiveCounts[g]||0) === min);

  const recommended = needs.join('・');
  const lackText   = lackList.join('・') || '-';

  // 出力：「季節=夏（月支：巳） 推奨=水・金 → 不足：金」
  const parts = [
    `季節=${season}（月支：${monthB}）`,
    `推奨=${recommended}`,
    `→ 不足：${lackText}`
  ];
  el.textContent = parts.join('　');
  console.log('[GUARDIAN]', {season, monthB, recommended, lackList, basis});
}


  // ★ここから追加：計算済みの値で描画する
  drawStrengthKakkyokuYojin(stems, branches, fiveCounts);
  drawZangRepresentative(stems, branches);
  drawStage12(stems.dG, branches);
  drawLogicBlocks(pillars, stems, branches, fiveCounts);

  
  // 14) 大運・年運（性別と「誕生日ISO」を渡す：立運で使用）
try {
  // URLから birth を最優先。なければ誕生日/年から暫定日付を生成
  const birthISO =
    (params.birth && /^\d{4}-\d{2}-\d{2}/.test(params.birth)) ? params.birth :
    (params.birthday && /^\d{4}-\d{2}-\d{2}/.test(params.birthday)) ? params.birthday :
    (birthYear ? `${birthYear}-06-15` : null);

  // 大運：月柱起点・行運（順/逆）・立運（年/月）・通変星/十二運を月柱参照で算出
  renderDaiunTable(pillars, gender, birthISO, { count: 11 });
// 年運：0歳（出生年）からスタート
try {
  const birthY = (birthISO && /^\d{4}/.test(birthISO)) ? parseInt(birthISO.slice(0, 4), 10) : null;
  // 安全策：birthISOが無い/壊れている場合は従来表示にフォールバック
  if (birthY == null || isNaN(birthY)) {
    const thisYear = new Date().getFullYear();
    renderLiunianTable(pillars, gender, birthISO, {
      startYear: thisYear,
      years: 10,
      baseAge: null
    });
  } else {
    // ★ここが「0歳から」の指定
    renderLiunianTable(pillars, gender, birthISO, {
      startYear: birthY,  // 出生年から
      years: 100,         // 表示年数（例：100年分）
      baseAge: 0          // 年齢列は 0,1,2,... と表示
    });
  }
// ★ここを追加：ここまで来れば「正常終了」とみなしてローディング文言を消す
    showDiag('');
    
} catch (e) {
  console.warn('[BOOT] 大運/年運でエラー（続行します）', e);
}
} catch (e) {
  console.warn('[BOOT] 大運/年運（全体）でエラー（続行します）', e);
}


  // ========= ヘルパー =========
  function showDiag(msg) {
    const diag = document.getElementById('diag');
    if (diag) diag.textContent = msg;
  }

  function buildFiveCounts(stems, branches) {
    const cnt = { '木':0, '火':0, '土':0, '金':0, '水':0 };
    [stems.yG, stems.mG, stems.dG, stems.hG].forEach(g => {
      const e = stemElement[g];
      if (e) cnt[e] += 1;
    });
    [branches.yB, branches.mB, branches.dB, branches.hB].forEach(b => {
      const e = branchElement[b];
      if (e) cnt[e] += 1;
    });
    return cnt;
  }

  function buildYinYangCounts(stems, branches) {
    const yy = { 陽:0, 陰:0 };
    [stems.yG, stems.mG, stems.dG, stems.hG].forEach(g => {
      const isYang = ['甲','丙','戊','庚','壬'].includes(g);
      yy[isYang ? '陽' : '陰'] += 1;
    });
    if (typeof BRANCH_YIN_YANG !== 'undefined') {
      [branches.yB, branches.mB, branches.dB, branches.hB].forEach(b => {
        const v = BRANCH_YIN_YANG[b];
        if (v) yy[v] += 1;
      });
    }
    return yy;
  }

})();
 // 10) 身強弱・格局・用神（4行版）
  function drawStrengthKakkyokuYojin(stems, branches, fiveCounts) {
  // 五行カウントを judgeStrength の想定形に整える
  const fiveForJudge = {
    WOOD:  fiveCounts['木'] || 0,
    FIRE:  fiveCounts['火'] || 0,
    EARTH: fiveCounts['土'] || 0,
    METAL: fiveCounts['金'] || 0,
    WATER: fiveCounts['水'] || 0,
  };

  // ① 身強弱（日干ベース）
  let strengthLabel = '—';
  let strengthBasis  = '';
  try {
    const s = judgeStrength(fiveForJudge, stems.dG);
    if (s) {
      strengthLabel = s.name || s.label || '—';
      strengthBasis  = s.basis || '';
    }
  } catch (e) {
    console.warn('[DRAW] judgeStrength でエラー', e);
  }
  const elStrength = document.getElementById('strength');
  if (elStrength) {
    elStrength.textContent = strengthLabel;
  }

  // ② 格局（月支＋身強弱で決める）
  let kakkyokuLabel = '—';
  let kakkyokuBasis  = '';
  try {
    const k = judgeKakkyoku(stems.dG, branches.mB, strengthLabel);
    if (k) {
      kakkyokuLabel = k.name || '—';
      kakkyokuBasis = k.basis || '';
    }
  } catch (e) {
    console.warn('[DRAW] judgeKakkyoku でエラー', e);
  }
  const elKak = document.getElementById('kakkyoku');
  if (elKak) {
    elKak.textContent = kakkyokuLabel;
  }

  // ③ 用神・喜神・忌神・仇神（今はロジックがないので根拠だけ出す）
  //    将来ここに「調候優先の守護神」などを差し込む想定。
  const elYojin = document.getElementById('yojin');
  if (elYojin) {
    const lines = [];
    if (strengthBasis) lines.push('身強弱根拠：' + strengthBasis);
    if (kakkyokuBasis) lines.push('格局根拠：' + kakkyokuBasis);
    elYojin.innerHTML = lines.join('<br>');
  }
}
  // 11) 蔵干代表
  // 通変星（蔵干・代表）を4本ぶん表示
function drawZangRepresentative(stems, branches) {
  const dayStem = stems.dG;
  const stemsByPos = {
    year:  stems.yG,
    month: stems.mG,
    day:   stems.dG,
    time:  stems.hG,
  };

  const targets = [
    { id: 'c_time_zang_tg_main',  branch: branches.hB, col: '時' },
    { id: 'c_day_zang_tg_main',   branch: branches.dB, col: '日' },
    { id: 'c_month_zang_tg_main', branch: branches.mB, col: '月' },
    { id: 'c_year_zang_tg_main',  branch: branches.yB, col: '年' },
  ];

  targets.forEach(t => {
    const el = document.getElementById(t.id);
    if (!el) return;
    try {
      // bazi-logic.js 側のロジックをそのまま使う
      const picked = selectZangTenGod(dayStem, t.branch, stemsByPos);
      console.log('[ZANG TG]', t.col, 'branch=', t.branch, '→', picked);
      el.textContent = picked && picked.tg ? picked.tg : '—';
    } catch (e) {
      console.warn('[DRAW] 蔵干通変星でエラー', t, e);
      el.textContent = '—';
    }
  });
}


// 12) 十二運
  // 十二運星と値を4本ぶん表示
function drawStage12(dayStem, branches) {
  const rows = [
    { nameId: 'c_time_12un',     valId: 'c_time_12un_val',     branch: branches.hB, col: '時' },
    { nameId: 'c_day_12un',      valId: 'c_day_12un_val',      branch: branches.dB, col: '日' },
    { nameId: 'c_month_12un',    valId: 'c_month_12un_val',    branch: branches.mB, col: '月' },
    { nameId: 'c_year_12un',     valId: 'c_year_12un_val',     branch: branches.yB, col: '年' },
  ];

  rows.forEach(r => {
    const elName = document.getElementById(r.nameId);
    const elVal  = document.getElementById(r.valId);
    try {
      // ← ここが大事：まず名前を出す
      const stageName = stage12Of(dayStem, r.branch) || '—';
      // ← その名前を値に変換する
      const stageVal  = stage12Value(stageName) || '—';

      console.log('[STAGE12]', r.col, 'branch=', r.branch, '→', stageName, stageVal);

      if (elName) elName.textContent = stageName;
      if (elVal)  elVal.textContent  = stageVal;
    } catch (e) {
      console.warn('[DRAW] 十二運でエラー', r, e);
      if (elName) elName.textContent = '—';
      if (elVal)  elVal.textContent  = '—';
    }
  });
}

  // 13) 成敗ロジック
  function drawLogicBlocks(pillars, stems, branches, fiveCounts) {
  // 透干（天透）
  try {
    const tokoList = detectToko(pillars); // 配列で返ってくる想定
    const el = document.getElementById('toko');
    if (el && Array.isArray(tokoList)) {
      el.innerHTML = tokoList.length ? tokoList.join('<br>') : '—';
    }
  } catch (e) {
    console.warn('[DRAW] detectToko でエラー', e);
  }

  // 合・冲・刑・害
  try {
    const relList = detectRelations(pillars);
    const el = document.getElementById('relations');
    if (el && Array.isArray(relList)) {
      el.innerHTML = relList.length ? relList.join('<br>') : '—';
    }
  } catch (e) {
    console.warn('[DRAW] detectRelations でエラー', e);
  }

  // 調候（季節と五行不足）
  try {
    const choko = judgeChoko(branches.mB, fiveCounts);
    const el = document.getElementById('choko');
    if (el && choko) {
      // judgeChoko の戻りはおそらく {need:[], lack:[], basis:...} 系
      const lines = [];
      if (choko.basis) lines.push(choko.basis);
      if (Array.isArray(choko.need) && choko.need.length) {
        lines.push('必要五行：' + choko.need.join('・'));
      }
      if (Array.isArray(choko.lack) && choko.lack.length) {
        lines.push('不足五行：' + choko.lack.join('・'));
      }
      el.innerHTML = lines.join('<br>') || '—';
    }
  } catch (e) {
    console.warn('[DRAW] judgeChoko でエラー', e);
  }
   // 天剋地冲（detectTkdc があれば優先。なければローカル簡易判定）
try {
  const list = (typeof detectTkdc === 'function') ? detectTkdc(pillars) : detectTkdcLocal(pillars);
  const el = document.getElementById('tkdc');
  if (el) el.textContent = (Array.isArray(list) && list.length) ? list.join(' / ') : '—';
} catch (e) {
  console.warn('[DRAW] tkdc error', e);
  const el = document.getElementById('tkdc');
  if (el) el.textContent = '—';
}


  // 守護神（調候優先）はここで将来足す
  const guardianEl = document.getElementById('guardian');
  if (guardianEl && !guardianEl.innerHTML) {
    guardianEl.textContent = '—';
  }
}
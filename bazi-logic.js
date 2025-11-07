// bazi-logic.js
// ========================
// 四柱推命 判定・計算ロジック
// ========================

/* ===================== 星の判定 ===================== */
function starOf(dayStem, targetStem) {
  const d = stemElement[dayStem];
  const t = stemElement[targetStem];
  if (!d || !t) return null;
  if (t === d) return '比肩/劫財';
  if (gen[t] === d) return '印綬/偏印';
  if (gen[d] === t) return '食神/傷官';
  if (COUNTER[d] === t) return '正財/偏財';
  if (COUNTER[t] === d) return '正官/偏官';
  return null;
}

/* ===================== 身強弱判定 ===================== */
function judgeStrength(five, dayStem) {
  const e = stemElement[dayStem];
  const by = {
    '木': five.WOOD || 0,
    '火': five.FIRE || 0,
    '土': five.EARTH || 0,
    '金': five.METAL || 0,
    '水': five.WATER || 0
  };
  const helper = (by[e] || 0) + (by[Object.keys(gen).find(k => gen[k] === e)] || 0);
  const leak = (by[gen[e]] || 0);
  const cai = (by[COUNTER[e]] || 0);
  const guan = (by[Object.keys(COUNTER).find(k => COUNTER[k] === e)] || 0);
  const suppress = leak + cai + guan;
  const total = helper + suppress;
  
  if (!total) return {label:'中庸', detail:'—'};
  
  const r = helper / total;
  let label = '中庸';
  if (r >= 0.70) label = '極身強';
  else if (r >= 0.55) label = '身強';
  else if (r <= 0.30) label = '極身弱';
  else if (r <= 0.45) label = '身弱';
  
  return {
    label,
    detail: `助身=${helper.toFixed(2)} / 抑身=${suppress.toFixed(2)}（${(r*100).toFixed(1)}%）`
  };
}

/* ===================== 格局判定 ===================== */
function judgeKakkyoku(dayStem, monthBranch, strengthLabel) {
  const z = ZANG[normalizeBranch(monthBranch)];
  if (!z || !z.hon) return {name:'不明', basis:'—'};
  
  const s = starOf(dayStem, z.hon) || '不明';
  const base = {
    '比肩/劫財': '建禄（比劫）格',
    '印綬/偏印': '印綬格',
    '正財/偏財': '財格',
    '正官/偏官': '官格（官殺格）',
    '食神/傷官': '食傷格'
  }[s] || '不明';
  
  let name = base;
  if (strengthLabel === '極身弱') {
    if (s === '正財/偏財') name = '従財格';
    else if (s === '正官/偏官') name = '従殺格';
    else if (s === '食神/傷官') name = '従児格';
  } else if (strengthLabel === '極身強') {
    if (s === '比肩/劫財') name = '従強格';
  }
  
  return {
    name,
    basis: `月令本気「${z.hon}」は日干に対し「${s}」`
  };
}

/* ===================== 透干検出 ===================== */
function detectToko(p) {
  const res = [];
  const stems = [pickStem(p.year), pickStem(p.month), pickStem(p.day), pickStem(p.time)];
  const branches = [pickBranch(p.year), pickBranch(p.month), pickBranch(p.day), pickBranch(p.time)];
  const cols = ['年','月','日','時'];
  
  branches.forEach((br, bi) => {
    const z = ZANG[normalizeBranch(br)];
    if (!z) return;
    ['hon','mid','rem'].forEach(k => {
      const s = z[k];
      if (s && stems.includes(s)) {
        res.push(`${cols[bi]}支${k==='hon'?'本気':k==='mid'?'中気':'余気'}「${s}」が天干に透出`);
      }
    });
  });
  
  return res.length ? res : ['透干なし'];
}

/* ===================== 支の関係検出 ===================== */
function detectRelations(p) {
  const b = [
    pickBranch(p.year), pickBranch(p.month),
    pickBranch(p.day), pickBranch(p.time)
  ];
  const cols = ['年','月','日','時'];
  const pairs = [];
  
  const has = (arr, a, c) => arr.some(x => 
    x.length === 2
      ? ((x[0] === a && x[1] === c) || (x[1] === a && x[0] === c))
      : (x.includes(a) && x.includes(c))
  );
  
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

/* ===================== 調候判定 ===================== */
function judgeChoko(monthBranch, energy) {
  const seasonMap = {
    '春': ['寅','卯','辰'],
    '夏': ['巳','午','未'],
    '秋': ['申','酉','戌'],
    '冬': ['亥','子','丑']
  };
  
  let season = '';
  for (const [k, v] of Object.entries(seasonMap)) {
    if (v.includes(normalizeBranch(monthBranch))) season = k;
  }
  
  const need = {
    '冬': ['火','木'],
    '夏': ['水','金'],
    '春': ['金','土'],
    '秋': ['木','火']
  }[season] || [];
  
  const lack = need.filter(e => (energy[e] || 0) < 0.8);
  
  return {
    season,
    need,
    text: `季節=${season}（月支：${normalizeBranch(monthBranch)}） 推奨=${need.join('・')||'—'} → ` +
      (lack.length ? `不足：${lack.join('・')}` : `概ね充足`)
  };
}

/* ===================== 守護神（調候優先） ===================== */
/**
 * 調候で必要と言われた五行の中から、
 * いま足りていないものを1～2個返す。
 *
 * @param {Object} pillars  {year:{chinese}, month:{...}, day:{...}, time:{...}}
 * @param {Object} stems    {yG,mG,dG,hG}  ※今は使わないが将来拡張用
 * @param {Object} branches {yB,mB,dB,hB}  ※今は使わないが将来拡張用
 * @param {Object} energy   {木:数, 火:数, 土:数, 金:数, 水:数}
 * @returns {{elements: string[], text: string}}
 */
function selectGuardian(pillars, stems, branches, energy) {
  // 月支から季節を決める（調候は月支基準なので pillars.month を見る）
  const monthBranch = pickBranch(pillars.month);
  const choko = judgeChoko(monthBranch, energy); // {season, need, text}

  // 調候が要求している五行の中で、今のエネルギーが不足しているものだけ拾う
  // judgeChoko と同じ 0.8 を閾値にする
  const lack = (choko.need || []).filter(el => {
    const v = energy[el] || 0;
    return v < 0.8;
  });

  let picked;
  if (lack.length > 0) {
    // 足りないものがあるときは、最大2つまで挙げる
    picked = lack.slice(0, 2);
  } else {
    // 一応足りているときは、季節が要求したものの先頭だけ挙げる
    picked = (choko.need || []).slice(0, 1);
  }

  return {
    elements: picked,
    text: picked.length
      ? `調候優先：${picked.join('・')}`
      : '調候上の不足は特にありません'
  };
}

/* ===================== 天剋地冲の検出 ===================== */
/**
 * 4本の柱の中で「支が冲」かつ「干が相剋」しているものを列挙する
 * @param {Object} p  {year:{chinese:..}, month:{...}, day:{...}, time:{...}}
 * @returns {string[]} 例: ["年-日：天剋地冲（己未 × 乙亥）"]
 */
function detectTkdc(p) {
  // 1. 4本の干支をばらす
  const stems = [
    pickStem(p.year),
    pickStem(p.month),
    pickStem(p.day),
    pickStem(p.time)
  ];
  const branches = [
    pickBranch(p.year),
    pickBranch(p.month),
    pickBranch(p.day),
    pickBranch(p.time)
  ];
  const cols = ['年','月','日','時'];
  const results = [];

  // 2. 支が冲しているペアを探す
  const isChongPair = (b1, b2) => {
    if (!b1 || !b2) return false;
    return CHONG.some(pair =>
      (pair[0] === b1 && pair[1] === b2) ||
      (pair[1] === b1 && pair[0] === b2)
    );
  };

  // 3. 干が相剋しているかどうか（どちらかがどちらかを剋す）
  const isStemKe = (s1, s2) => {
    if (!s1 || !s2) return false;
    const e1 = stemElement[s1];
    const e2 = stemElement[s2];
    if (!e1 || !e2) return false;
    return (COUNTER[e1] === e2) || (COUNTER[e2] === e1);
  };

  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const b1 = branches[i];
      const b2 = branches[j];
      if (!isChongPair(b1, b2)) continue;       // 地冲してないなら次

      const s1 = stems[i];
      const s2 = stems[j];
      if (!isStemKe(s1, s2)) continue;          // 干が剋してないなら次

      // ここまで来たら「天剋地冲」
      // 元の干支をそのまま書いておくと見やすい
      const gz1 = (pOrder(i, p) || '');
      const gz2 = (pOrder(j, p) || '');
      results.push(`${cols[i]}-${cols[j]}：天剋地冲（${gz1} × ${gz2}）`);
    }
  }

  // 1件もなければ空配列
  return results;
}

/**
 * インデックスから元のpillarの干支文字列を取り出す小ヘルパー
 * 0:年,1:月,2:日,3:時
 */
function pOrder(idx, p) {
  switch (idx) {
    case 0: return p.year && p.year.chinese;
    case 1: return p.month && p.month.chinese;
    case 2: return p.day && p.day.chinese;
    case 3: return p.time && p.time.chinese;
    default: return '';
  }
}

/* ===================== 空亡判定 ===================== */
function kongwangPairByGanzhi(gz) {
  if (!gz || gz.length < 2) return null;
  const idx = JIAZI.findIndex(x => x === gz);
  if (idx < 0) return null;
  const decade = Math.floor(idx / 10);
  return KONGWANG_PAIRS[decade];
}

/* ===================== 陰陽判定 ===================== */
function isYang(stem) {
  return ['甲','丙','戊','庚','壬'].includes(stem);
}

/* ===================== 十神正確判定 ===================== */
function tenGodExact(dayStem, targetStem) {
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

/* ===================== 符号付き五行 ===================== */
const signEl = s => (isYang(s) ? '＋' : '－') + stemEl(s);

/* ===================== 十二運星判定 ===================== */
function stage12Of(dayStem, branch) {
  const map = STAGE12[dayStem];
  if (!map) return '';
  const nb = normalizeBranch(branch);
  for (const [stageName, branchChar] of Object.entries(map)) {
    if (branchChar === nb) return stageName;
  }
  return '';
}

function stage12Value(stageName) {
  return STAGE12_VALUES[stageName] || 0;
}

/* ===================== 相剋ペア判定 ===================== */
const isCounterPair = (a, b) =>
  COUNTER[stemEl(a)] === stemEl(b) || COUNTER[stemEl(b)] === stemEl(a);

/* ===================== 蔵干十神選択 ===================== */
function selectZangTenGod(dayStem, monthBranch, stemsByPos) {
  const b = normalizeBranch(monthBranch);
  const zang = ZANG[b];
  if (!zang) return { tg: '－', basis: '蔵干なし', zangKey: null };

  const zangLayers = [
    { key: 'hon', label: '本気', stem: zang.hon },
    { key: 'mid', label: '中気', stem: zang.mid },
    { key: 'rem', label: '余気', stem: zang.rem },
  ].filter(z => z.stem);

  // 透出している層を優先
  const visible = zangLayers.find(layer => 
    Object.values(stemsByPos).includes(layer.stem)
  );
  if (visible) {
    return {
      tg: tenGodExact(dayStem, visible.stem) || '－',
      basis: `${visible.label}「${visible.stem}」が天干に透出`,
      zangKey: visible.key,
      stem: visible.stem
    };
  }

  // 透出なしの場合、本気→中気→余気の順
  for (const layer of zangLayers) {
    const tg = tenGodExact(dayStem, layer.stem);
    if (tg && tg !== ' ') {
      return {
        tg,
        basis: `${layer.label}「${layer.stem}」を採用（透干なし）`,
        zangKey: layer.key,
        stem: layer.stem
      };
    }
  }

  return { tg: ' ', basis: '蔵干該当なし', zangKey: null, stem: null };
}
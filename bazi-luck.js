/* ===== bazi-luck.js (大運/年運) — 月柱参照・行運/立運・通変星/十二運 ===== */
/* デバッグログ多め。致命エラー時も表は描画継続。 */

(function (g) {
  'use strict';

  // ---------- 依存（既存ロジックに委譲） ----------
  const has = (name) => typeof g[name] === 'function';
  const stemEl = (s) => (typeof g.stemElement !== 'undefined' ? g.stemElement[s] : null);
  const zangMap = (b) => (typeof g.branchZangHidden !== 'undefined' ? g.branchZangHidden[b] : null);
  const stage12Of = g.stage12Of;
  const stage12Value = g.stage12Value;
  const tenGodExact = g.tenGodExact;
  const pickStem = g.pickStem;
  const pickBranch = g.pickBranch;

  // 60干支の配列（既存があればそれを使い、なければ定義）
  const SIXTY = (function () {
    if (Array.isArray(g.SIXTY_GANZHI) && g.SIXTY_GANZHI.length === 60) return g.SIXTY_GANZHI;
    const tiangan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const dizhi   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const arr = [];
    for (let i = 0; i < 60; i++) arr.push(tiangan[i % 10] + dizhi[i % 12]);
    return arr;
  })();

  const idx60 = (gz) => SIXTY.indexOf(gz);
  const step60 = (idx, step) => SIXTY[( (idx % 60) + 60 + step ) % 60];

  // 陰陽（天干）
  const STEM_YINYANG = { '甲':'陽','丙':'陽','戊':'陽','庚':'陽','壬':'陽', '乙':'陰','丁':'陰','己':'陰','辛':'陰','癸':'陰' };

  // ===================== 行運（順/逆） =====================
  function decideDirection(gender, yearStem) {
    const yinyang = STEM_YINYANG[yearStem] || '陽';
    // ルール：年干が陽の男性・陰の女性 → 順行、それ以外 → 逆行
    const isForward = (gender === 'male' && yinyang === '陽') || (gender === 'female' && yinyang === '陰');
    return { isForward, yinyang };
  }

  // ===================== 立運（りつうん） =====================
  // birth: Date オブジェクト（現地時刻でOK）、tz: 'Asia/Tokyo' など
  // 取得フック：globalThis.getPrevNextJieqi(birth) があればそれを使う
  //   期待返り値：{ prev: Date, next: Date }
  // 計算式（要件どおり）：
  //   順行: 生まれた日→「次の節入り日」までの日数 ÷ 3 = 年、余り×4 = 月
  //   逆行: 生まれた日→「前の節入り日」までの日数 ÷ 3 = 年、余り×4 = 月
  function computeQiyun(birth, isForward) {
    try {
      if (typeof g.getPrevNextJieqi === 'function') {
        const { prev, next } = g.getPrevNextJieqi(birth);
        if (prev instanceof Date && next instanceof Date) {
          const msPerDay = 24 * 60 * 60 * 1000;
          const diffDays = Math.abs( Math.round(((isForward ? next : prev) - birth) / msPerDay) );
          const years = Math.floor(diffDays / 3);
          const rem   = diffDays % 3;
          const months = rem * 4;
          return { years, months, days: diffDays, via: 'jieqi' };
        }
      }
    } catch (e) {
      console.warn('[QIYUN] 節気プロバイダでエラー', e);
    }
    // フォールバック：10年0ヶ月
    console.warn('[QIYUN] 節気未接続のため簡易値にフォールバック → 10y0m');
    return { years: 10, months: 0, days: null, via: 'fallback' };
  }

  // ===================== 月柱起点の大運系列 =====================
  // 月柱から干支を進める（順行：そのまま前へ／逆行：前の干支から後ろへ）
  function buildDaiunGanzhiSeq(monthGZ, isForward, count) {
    const startIdx = idx60(monthGZ);
    if (startIdx < 0) throw new Error('[DAIUN] 月柱干支が60干支表に見つかりません: ' + monthGZ);
    const seq = [];
    for (let i = 0; i < count; i++) {
      const step = isForward ? i : -i;
      // 逆行は「前の干支から」なので、i=0 は monthGZ の1つ前にする
      const baseStep = isForward ? 0 : -1;
      const gz = step60(startIdx, baseStep + step);
      seq.push(gz);
    }
    return seq;
  }

  // ===================== 大運行の1行を評価（通変星/十二運） =====================
  function evalDaiunRow(dayStem, gz) {
    const stem = gz[0];
    const branch = gz[1];
    // 天干通変星：日干 対 大運天干
    const tgStem = has('tenGodExact') ? tenGodExact(dayStem, stem) : '';
    // 地支通変星：日干 対 大運地支の「本気（代表）」を使う
    let tgBranch = '';
    const zang = zangMap(branch);
    if (zang && zang.hon) {
      tgBranch = has('tenGodExact') ? tenGodExact(dayStem, zang.hon) : '';
    }
    // 十二運：日干 × 大運地支
    let stageName = '-', stageVal = '-';
    try {
      stageName = stage12Of(dayStem, branch) || '-';
      stageVal  = stage12Value(stageName) || '-';
    } catch (e) {
      console.warn('[DAIUN] 十二運算出でエラー', e);
    }
    return { tgStem, tgBranch, stageName, stageVal };
  }

  // ===================== 画面描画：大運 =====================
  function renderDaiunTable(pillars, gender, birthISOorYear, opts = {}) {
    try {
      const tbody = document.querySelector('#daiunTable tbody');
      const section = document.getElementById('daiunSection');
      if (!tbody || !section) return;

      // 入力解釈
      const monthGZ = pillars && pillars.month ? pillars.month.chinese : null;
      const yearG   = pillars && pillars.year  ? pillars.year.chinese[0] : null;
      const dayG    = pillars && pillars.day   ? pillars.day.chinese[0] : null;

      if (!monthGZ || !yearG || !dayG) {
        console.warn('[大運] 入力命式が不足', pillars);
        section.style.display = 'none';
        return;
      }

      // 行運（順/逆）
      const { isForward, yinyang } = decideDirection(gender || 'male', yearG);

      // 立運
      let birthDate;
      if (typeof birthISOorYear === 'string' && /^\d{4}-\d{2}-\d{2}/.test(birthISOorYear)) {
        birthDate = new Date(birthISOorYear);
      } else if (typeof birthISOorYear === 'number') {
        // 年のみなら夏至基準など曖昧になるのでダミー日を入れる
        birthDate = new Date(birthISOorYear + '-06-15');
      } else {
        birthDate = new Date();
      }
      const { years: qiyunY, months: qiyunM, via } = computeQiyun(birthDate, isForward);

      // 月柱から系列生成（11本）
      const count = (opts.count && +opts.count) || 11;
      const seq = buildDaiunGanzhiSeq(monthGZ, isForward, count);

      // 表クリア
      while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

      // 行生成
      for (let i = 0; i < seq.length; i++) {
        const gz = seq[i];
        const { tgStem, tgBranch, stageName } = evalDaiunRow(dayG, gz);

        // 開始年齢（立運から10年刻み）
        const ageY = qiyunY + i * 10;
        const ageM = qiyunM; // 月は固定表示（立運月）。詳細年齢は別テーブルで補完してOK。

        const tr = document.createElement('tr');
        const tdAge = document.createElement('td'); tdAge.textContent = `${ageY}歳${ageM}カ月`;
        const tdGZ  = document.createElement('td'); tdGZ.textContent  = gz;
        const tdTG  = document.createElement('td'); tdTG.textContent  = `${tgStem || '—'}`;
        const td12  = document.createElement('td'); td12.textContent  = `${stageName || '—'}`;
        // 関係：月柱参照（要件どおり “月柱基準” に統一）
      const monthBranch = pillars.month.chinese[1]; // 月支（例：己巳 → '巳'）
      const rel = branchRelation(monthBranch, branch); // 地支・六害/六合/冲/刑 の簡易判定
      const tdRel = document.createElement('td');
      // 干：日干×大運天干（通変星）／ 支：月支×大運支（関係）    
      tdRel.textContent = `干:${tg || '—'} / 支:${(rel.length ? rel.join('・') : '-')}`;


        tr.appendChild(tdAge);
        tr.appendChild(tdGZ);
        tr.appendChild(tdTG);
        tr.appendChild(td12);
        tr.appendChild(tdRel);
      

        console.log('[DAIUN DEBUG]', {
          i, start:`${ageY}y${ageM}m`, daiun: gz, stemTG: tgStem, branchTG: tgBranch, stage: stageName
        });
      }

      section.style.display = '';
      console.log(`[大運] 描画完了（起運=${qiyunY}y${qiyunM}m, 性別=${gender}, 年干陰陽=${yinyang}, 行運=${isForward?'順':'逆'}, 立運via=${via}）`);
    } catch (e) {
      console.warn('[大運] 描画でエラー（続行します）', e);
    }
  }

  // ===================== 画面描画：年運（参考・月柱参照ではなく西暦進行） =====================
  // ========== 大運（“月柱起点”で通変星/十二運も月柱参照） ==========
function renderDaiunTable(pillars, gender, birthISO, opts = {}) {
  try {
    const tbody = document.querySelector('#daiunTable tbody');
    const section = document.getElementById('daiunSection');
    if (!tbody || !section) return;

    // 依存ロジックの存在チェック
    if (typeof pickStem !== 'function' || typeof pickBranch !== 'function' ||
        typeof tenGodExact !== 'function' || typeof stage12Of !== 'function') {
      console.warn('[DAIUN] 依存関数不足（pickStem, pickBranch, tenGodExact, stage12Of）');
      return;
    }

    // ===== 1) 月柱・日干・年干の準備 =====
    const monthGZ = (pillars && pillars.month && pillars.month.chinese) ? pillars.month.chinese : null;
    const dayStem = pickStem(pillars.day);     // 通変星は日干基準
    const yearStem = pickStem(pillars.year);   // 行運の順逆判定に使用
    if (!monthGZ || !dayStem || !yearStem) {
      console.warn('[DAIUN] 必須値不足 monthGZ/dayStem/yearStem', {monthGZ, dayStem, yearStem});
      return;
    }

    // ===== 2) 行運（順/逆）判定 =====
    const isYangYearStem = ['甲','丙','戊','庚','壬'].includes(yearStem);
    const forward = (gender === 'male' && isYangYearStem) || (gender === 'female' && !isYangYearStem);
    const direction = forward ? +1 : -1;

    // ===== 3) 立運（簡易）: 節気が未接続なら fallback で10y0m =====
    let startMonths = 120; // デフォルト=10年0カ月
    try {
      // 将来的に getPrevNextJieqi(birthDate) があれば、ここで実数算出
      // 例:
      // const j = (typeof getPrevNextJieqi==='function') ? getPrevNextJieqi(new Date(birthISO)) : null;
      // if (j && j.next && forward) { ... startMonths = 実数 ... }
      // if (j && j.prev && !forward) { ... startMonths = 実数 ... }
    } catch (e) {
      console.warn('[QIYUN] 実数立運の取得に失敗したため簡易固定を採用', e);
    }

    // ===== 4) 六十干支テーブルと操作ユーティリティ =====
    const JIA_ZI = [
      '甲子','乙丑','丙寅','丁卯','戊辰','己巳','庚午','辛未','壬申','癸酉',
      '甲戌','乙亥','丙子','丁丑','戊寅','己卯','庚辰','辛巳','壬午','癸未',
      '甲申','乙酉','丙戌','丁亥','戊子','己丑','庚寅','辛卯','壬辰','癸巳',
      '甲午','乙未','丙申','丁酉','戊戌','己亥','庚子','辛丑','壬寅','癸卯',
      '甲辰','乙巳','丙午','丁未','戊申','己酉','庚戌','辛亥','壬子','癸丑',
      '甲寅','乙卯','丙辰','丁巳','戊午','己未','庚申','辛酉','壬戌','癸亥'
    ];
    const idx60 = (gz) => JIA_ZI.indexOf(gz);
    const stepGZ = (startIndex, step) => {
      let i = startIndex + step;
      i %= 60; if (i < 0) i += 60;
      return JIA_ZI[i];
    };

    // 月柱の位置（i=0 は必ず月柱）
    const startIndex = idx60(monthGZ);
    if (startIndex < 0) {
      console.warn('[DAIUN] 月柱が六十干支に見つからない:', monthGZ);
      return;
    }

    // ===== 5) テーブル描画 =====
    // 初期化
    section.style.display = '';
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

    // i=0 は 0歳 startMonths カ月、以後＋10年刻み
    const rows = Number.isInteger(opts.count) ? Math.max(1, opts.count) : 11;

    for (let i = 0; i < rows; i++) {
      // 干支：i=0 → 月柱。以後は月柱から順行/逆行で進める
      const gz = (i === 0) ? monthGZ : stepGZ(startIndex, direction * i);
      const stem = gz[0];
      const branch = gz[1];

      // 通変星（天干）：日干×大運の「天干」で求める（＝各行の干支に対して算出）
      let tg = '—';
      try { tg = tenGodExact(dayStem, stem) || '—'; } catch(e) { console.warn('[DAIUN] tenGodExact error', e); }

      // 十二運星：日干×大運の「地支」で求める（＝各行の干支に対して算出）
      let stageName = '—';
      try { stageName = stage12Of(dayStem, branch) || '—'; } catch(e) { console.warn('[DAIUN] stage12Of error', e); }

      // 開始年齢（年+月）— ご指定の刻みに固定
// 0: 0歳0ヶ月、1: 9歳8ヶ月、2: 19歳8ヶ月、… → 以降 i ごとに +10年
let mTotal;
if (i === 0) {
  mTotal = 0; // 0歳0ヶ月
} else {
  // 9年8ヶ月 = 9*12 + 8 = 116 ヶ月
  // 以降は 10年刻み（= 120 ヶ月）ずつ加算
  mTotal = 116 + (i - 1) * 120;
}
const startY = Math.floor(mTotal / 12);
const startM = mTotal % 12;


      // 行を作る
      const tr = document.createElement('tr');

      const tdAge = document.createElement('td');
      tdAge.textContent = `${startY}歳${startM}カ月`;
      tr.appendChild(tdAge);

      const tdGZ = document.createElement('td');
      tdGZ.textContent = gz;
      tr.appendChild(tdGZ);

      const tdTG = document.createElement('td');
      tdTG.textContent = tg;
      tr.appendChild(tdTG);

      const tdStage = document.createElement('td');
      tdStage.textContent = stageName;
      tr.appendChild(tdStage);

      const tdRel = document.createElement('td');

      // 関係（大運天中殺／月支との合・冲・刑・害）
      const relations = [];

      // 大運天中殺（生年/生日の空亡に該当する支）
      try {
        const yearKW = (typeof kongwangPairByGanzhi === 'function') ? kongwangPairByGanzhi(pillars.year?.chinese) : null;
        const dayKW  = (typeof kongwangPairByGanzhi === 'function') ? kongwangPairByGanzhi(pillars.day?.chinese)  : null;
        if (yearKW && Array.isArray(yearKW) && yearKW.includes(branch)) relations.push('大運天中殺(年)');
        if (dayKW  && Array.isArray(dayKW)  && dayKW.includes(branch))  relations.push('大運天中殺(日)');
      } catch (e) { console.warn('[DAIUN] kongwang 判定でエラー', e); }

      // 月支との地支関係（六合/冲/害/刑）
      try {
        const monthB = monthGZ ? monthGZ[1] : null;
        const rel = monthB ? branchRelation(monthB, branch) : [];
        if (rel && rel.length) relations.push(`月支:${rel.join('・')}`);
      } catch (e) { console.warn('[DAIUN] branchRelation error', e); }

      // 該当関係がなければセルを空欄にする
      tdRel.textContent = relations.length ? relations.join(' / ') : '';

      tr.appendChild(tdRel);

      tbody.appendChild(tr);

      console.log('[DAIUN DEBUG]', `i=${i}`, `開始=${startY}歳${startM}カ月`, `d=${direction}`, `干支=${gz}`, `天干TG=${tg}`, `十二運=${stageName}`);
    }

    console.log(`[大運] 描画完了（起運=${Math.floor(startMonths/12)}年${startMonths%12}カ月, 性別=${gender}, 順行=${forward?'順':'逆'}）`);
  } catch (e) {
    console.warn('[大運] 描画失敗', e);
  }
}

// ===== 地支関係（簡易）：六合・冲・害・刑 =====
function branchRelation(a, b) {
  if (!a || !b) return [];

  // 六合
  const LIU_HE = { '子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午' };
  // 六冲
  const LIU_CHONG = { '子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳' };
  // 六害
  const LIU_HAI = { '子':'未','未':'子','丑':'午','午':'丑','寅':'巳','巳':'寅','卯':'辰','辰':'卯','申':'亥','亥':'申','酉':'戌','戌':'酉' };
  // 刑（代表的なもののみ。自刑含む）
  const XING_PAIRS = new Set(['子-卯','卯-子','寅-巳','巳-申','申-寅','辰-辰','午-午','酉-酉','亥-亥','丑-戌','戌-未','未-丑']);

  const out = [];
  if (LIU_HE[a] === b) out.push('合');
  if (LIU_CHONG[a] === b) out.push('冲');
  if (LIU_HAI[a] === b) out.push('害');
  if (XING_PAIRS.has(`${a}-${b}`)) out.push('刑');
  return out;
}

// ========== 年運（出生年柱から年差で六十干支を進めて算出＝非依存化） ==========
// ========== 年運（出生年柱から年差で六十干支を進めて算出＝非依存化／ログなし） ==========
function renderLiunianTable(pillars, gender, birthISOorYear, opts = {}) {
  try {
    const tbody = document.querySelector('#liunianTable tbody');
    const section = document.getElementById('liunianSection');
    if (!tbody || !section) return;

    const thisYear  = (opts.startYear && +opts.startYear) || new Date().getFullYear();
    const years     = (opts.years && +opts.years) || 10;

    // 出生年（baseYear）を整数で取得
    const baseYear = (function () {
      if (typeof birthISOorYear === 'string' && /^\d{4}/.test(birthISOorYear)) return parseInt(birthISOorYear.slice(0,4), 10);
      if (typeof birthISOorYear === 'number') return birthISOorYear;
      return thisYear;
    })();

    const dayG = (pillars && pillars.day && pillars.day.chinese) ? pillars.day.chinese[0] : null;
    const birthYearGZ = (pillars && pillars.year && pillars.year.chinese) ? pillars.year.chinese : null;
    if (!dayG || !birthYearGZ) { section.style.display = 'none'; return; }

    // 六十干支テーブル
    const JIA_ZI = [
      '甲子','乙丑','丙寅','丁卯','戊辰','己巳','庚午','辛未','壬申','癸酉',
      '甲戌','乙亥','丙子','丁丑','戊寅','己卯','庚辰','辛巳','壬午','癸未',
      '甲申','乙酉','丙戌','丁亥','戊子','己丑','庚寅','辛卯','壬辰','癸巳',
      '甲午','乙未','丙申','丁酉','戊戌','己亥','庚子','辛丑','壬寅','癸卯',
      '甲辰','乙巳','丙午','丁未','戊申','己酉','庚戌','辛亥','壬子','癸丑',
      '甲寅','乙卯','丙辰','丁巳','戊午','己未','庚申','辛酉','壬戌','癸亥'
    ];
    const idx60 = (gz) => JIA_ZI.indexOf(gz);
    const stepGZ = (startIndex, step) => {
      let i = startIndex + step;
      i %= 60; if (i < 0) i += 60;
      return JIA_ZI[i];
    };

    const baseIdx = idx60(birthYearGZ);
    if (baseIdx < 0) { section.style.display = 'none'; return; }

    // テーブル初期化
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

    // 行生成（ログ一切なし）
    for (let i = 0; i < years; i++) {
      const y = thisYear + i;
      const delta = y - baseYear;           // 出生年からの年差
      const gz = stepGZ(baseIdx, delta);    // 年干支
      const stem = gz[0], branch = gz[1];

      // 通変星（天干）と十二運（地支）は “日干基準”
      const tgStem    = (typeof tenGodExact === 'function') ? (tenGodExact(dayG, stem) || '—') : '—';
      const stageName = (typeof stage12Of   === 'function') ? (stage12Of(dayG, branch) || '—')   : '—';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="border:1px solid #999;padding:8px 10px;text-align:left">${y}</td>
        <td style="border:1px solid #999;padding:8px 10px;text-align:left">${(opts.baseAge!=null)? (opts.baseAge+i) : '—'}</td>
        <td style="border:1px solid #999;padding:8px 10px;text-align:left">${gz}</td>
        <td style="border:1px solid #999;padding:8px 10px;text-align:left">${tgStem}</td>
        <td style="border:1px solid #999;padding:8px 10px;text-align:left">${stageName}</td>
        <td style="border:1px solid #999;padding:8px 10px;text-align:left"></td>`;
      tbody.appendChild(tr);
    }

    section.style.display = '';
  } catch (e) {
    console.warn('[年運] 描画でエラー', e);
  }
}

  // export to globalThis
  g.renderDaiunTable  = renderDaiunTable;
  g.renderLiunianTable = renderLiunianTable;

})(globalThis);


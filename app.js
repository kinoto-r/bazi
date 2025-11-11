// app.js
// =====================================
// 四柱推命 結果ページ 初期化
// =====================================
(function () {
  // この4つがなければ何もできない
  const required = ['setText', 'safeParseParams', 'pickStem', 'pickBranch'];
  const missing = required.filter(n => typeof globalThis[n] === 'undefined');

  if (missing.length > 0) {
    const msg = `必要な関数が読み込まれていません: ${missing.join(', ')}`;
    console.error('[BOOT ERROR]', msg);
    const s = document.getElementById('summary');
    if (s) s.textContent = msg;
    return;
  }

  console.log('[BOOT] 依存関数OK、初期化を開始します');

  initPage();

  // =====================================
  // メイン初期化
  // =====================================
  function initPage() {
    // 1) とりあえず固定の干支（ここは実際は別ファイルで計算する）
    const pillars = {
      year:  { chinese: '己未' },
      month: { chinese: '己巳' },
      day:   { chinese: '乙亥' },
      time:  { chinese: '丁丑' }
    };

    // 2) URLパラメータから生年・性別を拾う
    let params = {};
    try {
      params = safeParseParams();
      console.log('[BOOT] URL params =', params);
    } catch (e) {
      console.warn('[BOOT] URL params 読み込み失敗', e);
    }

    // 生年を決める（?birth=1979-05-10 / ?birthday=... / ?year=1979 / ?y=1979 のどれか）
    let birthYear = 1989;
    if (params.birth) {
      const y = String(params.birth).split('-')[0];
      if (!isNaN(+y)) birthYear = +y;
    } else if (params.birthday) {
      const y = String(params.birthday).split('-')[0];
      if (!isNaN(+y)) birthYear = +y;
    } else if (params.year) {
      if (!isNaN(+params.year)) birthYear = +params.year;
    } else if (params.y) {
      if (!isNaN(+params.y)) birthYear = +params.y;
    }

    // 性別（大運の順逆に使う）
    const gender = (params.gender === 'male' || params.gender === 'female')
      ? params.gender
      : 'female';

    // 3) 干支を分解
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

    // 4) 命式テーブル描画
    try {
      if (typeof renderClassicTable === 'function') {
        renderClassicTable(pillars, stems.dG, stems, branches);
        console.log('[BOOT] 命式テーブル描画OK');
      }
    } catch (e) {
      console.error('[BOOT] 命式テーブル描画でエラー', e);
    }

    // 5) 五行・陰陽
    let fiveCounts = { 木:0, 火:0, 土:0, 金:0, 水:0 };
    let yyCounts   = { 陽:0, 陰:0 };
    try {
      fiveCounts = buildFiveCounts(stems, branches);
      yyCounts   = buildYinYangCounts(stems, branches);
      if (typeof renderFiveBalanceSection === 'function') {
        renderFiveBalanceSection(fiveCounts, yyCounts);
      }
      console.log('[BOOT] 五行・陰陽OK', fiveCounts, yyCounts);
    } catch (e) {
      console.warn('[BOOT] 五行/陰陽の描画でエラー（続行します）', e);
    }

    // 6) 身強弱・格局・用神
    try {
      drawStrengthKakkyokuYojin(stems, branches, fiveCounts);
    } catch (e) {
      console.warn('[BOOT] 身強弱・格局でエラー（続行します）', e);
    }

    // ★ 互換用：以前の名前で呼ばれても動くようにしておく
    // （いまは使ってないけど、他のファイルから呼ばれても死なないようにする）
    globalThis.drawStrengthAndKakkyoku = function (s, b, fc) {
      drawStrengthKakkyokuYojin(s, b, fc);
    };

    // 7) 蔵干代表
    try {
      drawZangRepresentative(stems, branches);
    } catch (e) {
      console.warn('[BOOT] 蔵干代表でエラー（続行します）', e);
    }

    // 8) 十二運
    try {
      drawStage12(stems.dG, branches);
    } catch (e) {
      console.warn('[BOOT] 十二運でエラー（続行します）', e);
    }

    // 9) 九星（いまは年で見る。節分対応は bazi-constants.js 側の関数に入っている前提）
    try {
      if (typeof kyuseiSimpleByYear === 'function') {
        const ky = kyuseiSimpleByYear(params.birth || birthYear);
        setTextIf('c_kyusei', ky);
      }
    } catch (e) {
      console.warn('[BOOT] 九星でエラー（続行します）', e);
    }

    // 10) 成敗ロジック（天剋地冲・守護神ふくむ、あるものだけ出す）
    try {
      drawLogicBlocks(pillars, stems, branches, fiveCounts);
    } catch (e) {
      console.warn('[BOOT] 成敗ロジックでエラー（続行します）', e);
    }

    // 11) 大運・年運（性別・生年・生年月日を渡すようにした）
try {
  if (typeof renderDaiunTable === 'function') {
    // URLパラメータから birth を渡す（なければ null）
    renderDaiunTable(pillars, gender, birthYear, {
      birth: params.birth || null
    });
  }
  if (typeof renderLiunianTable === 'function') {
    renderLiunianTable(pillars, gender, birthYear, {
      startYear: 2025,
      years: 10
    });
  }
} catch (e) {
  console.warn('[BOOT] 大運/年運でエラー（続行します）', e);
}

    const diag = document.getElementById('diag');
    if (diag) diag.textContent = '表示完了';
  }

  // =====================================
  // 身強弱・格局・用神
  // =====================================
  function drawStrengthKakkyokuYojin(stems, branches, fiveCounts) {
    if (typeof judgeStrength !== 'function' || typeof judgeKakkyoku !== 'function') {
      return;
    }

    const judgeInput = {
      WOOD:  fiveCounts['木'] || 0,
      FIRE:  fiveCounts['火'] || 0,
      EARTH: fiveCounts['土'] || 0,
      METAL: fiveCounts['金'] || 0,
      WATER: fiveCounts['水'] || 0,
    };

    const strength = judgeStrength(judgeInput, stems.dG);
    const kak      = judgeKakkyoku(stems.dG, branches.mB, strength.label);

    // 身強弱
    setTextIf('strength', `${strength.label}　${strength.detail}`);
    // 格局
    setTextIf('kakkyoku', `${kak.name}（${kak.basis}）`);

    // 用神（4行に分けて出すバージョン）
    const yojinIDs = ['yojin_yong','yojin_xi','yojin_ji','yojin_chou'];
    // 先にクリア
    yojinIDs.forEach(id => setTextIf(id, ''));

    if (typeof YOJIN !== 'undefined') {
      const yj = YOJIN[kak.name];
      if (yj) {
        setTextIf('yojin_yong', (yj['用神'] || []).join('・') || '—');
        setTextIf('yojin_xi',   (yj['喜神'] || []).join('・') || '—');
        setTextIf('yojin_ji',   (yj['忌神'] || []).join('・') || '—');
        setTextIf('yojin_chou', (yj['仇神'] || []).join('・') || '—');
      }
    }
  }

   

  // =====================================
  // 蔵干代表
  // =====================================
  function drawZangRepresentative(stems, branches) {
    if (typeof selectZangTenGod !== 'function') return;

    const stemsByPos = {
      year:  stems.yG,
      month: stems.mG,
      day:   stems.dG,
      time:  stems.hG,
    };
    const branchByPos = {
      year:  branches.yB,
      month: branches.mB,
      day:   branches.dB,
      time:  branches.hB,
    };
    const idMain = {
      year:  'c_year_zang_tg_main',
      month: 'c_month_zang_tg_main',
      day:   'c_day_zang_tg_main',
      time:  'c_time_zang_tg_main',
    };

    ['time','day','month','year'].forEach(pos => {
      const res = selectZangTenGod(stems.dG, branchByPos[pos], stemsByPos);
      setTextIf(idMain[pos], res && res.tg ? res.tg : '—');
    });
  }

  // =====================================
  // 十二運
  // =====================================
  function drawStage12(dayStem, branches) {
    if (typeof stage12Of !== 'function' || typeof stage12Value !== 'function') return;

    const targets = [
      { b: branches.hB, id: 'c_time_12un',  val: 'c_time_12un_val' },
      { b: branches.dB, id: 'c_day_12un',   val: 'c_day_12un_val' },
      { b: branches.mB, id: 'c_month_12un', val: 'c_month_12un_val' },
      { b: branches.yB, id: 'c_year_12un',  val: 'c_year_12un_val' },
    ];

    targets.forEach(t => {
      const name = stage12Of(dayStem, t.b) || '—';
      const num  = stage12Value(name) || 0;
      setTextIf(t.id, name);
      setTextIf(t.val, String(num));
    });
  }

  // =====================================
  // 成敗ロジック（あるものだけ出す）
  // =====================================
  function drawLogicBlocks(pillars, stems, branches, fiveCounts) {
    // 透干
    if (typeof detectToko === 'function') {
      const tk = detectToko(pillars);
      const box = document.getElementById('toko');
      if (box) box.innerHTML = Array.isArray(tk) ? tk.join('<br>') : (tk || '');
    }

    // 合・冲・刑・害
    if (typeof detectRelations === 'function') {
      const rel = detectRelations(pillars);
      const box = document.getElementById('relations');
      if (box) box.innerHTML = Array.isArray(rel) ? rel.join('<br>') : (rel || '');
    }

    // 調候
    if (typeof judgeChoko === 'function') {
      const mB = pickBranch(pillars.month);
      const ch = judgeChoko(mB, fiveCounts);
      const box = document.getElementById('choko');
      if (box) box.textContent = ch && ch.text ? ch.text : '';
    }

    // 天剋地冲（さっき bazi-logic.js に足した detectTkdc を呼ぶ）
    if (typeof detectTkdc === 'function') {
      const r = detectTkdc(pillars);
      const box = document.getElementById('tkdc');
      if (box) box.innerHTML = Array.isArray(r) ? r.join('<br>') : (r || '');
    }

    // 守護神（調候優先）… bazi-logic.js に selectGuardian を足してあればここに出る
    if (typeof selectGuardian === 'function') {
      const g = selectGuardian(pillars, stems, branches, fiveCounts);
      const box = document.getElementById('guardian');
      if (box) box.textContent = g && g.text ? g.text : '';
    }
  }

  // =====================================
  // ヘルパー
  // =====================================
  function setTextIf(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = (txt ?? '');
  }

  function buildFiveCounts(stems, branches) {
    const cnt = { '木':0, '火':0, '土':0, '金':0, '水':0 };
    if (typeof stemElement === 'undefined' || typeof branchElement === 'undefined') {
      return cnt;
    }
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
    const yy = { '陽':0, '陰':0 };
    [stems.yG, stems.mG, stems.dG, stems.hG].forEach(g => {
      if (!g) return;
      const isYang = ['甲','丙','戊','庚','壬'].includes(g);
      yy[isYang ? '陽' : '陰'] += 1;
    });
    if (typeof BRANCH_YIN_YANG !== 'undefined') {
      [branches.yB, branches.mB, branches.dB, branches.hB].forEach(b => {
        if (!b) return;
        const v = BRANCH_YIN_YANG[b];
        if (v) yy[v] += 1;
      });
    }
    return yy;
  }

})();

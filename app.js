// app.js
// =====================================
// 四柱推命 結果ページ 初期化
// ・あるものだけ表示する
// ・無い機能は黙ってスキップする
// ・コンソールには全部ログを残す
// =====================================
(function () {
  // 最低限これだけはないと何もできない
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
  function initSampleView() {
  // ▼ 1) とりあえず固定の命式（ここは今のままでもOK）
  const pillars = {
    year:  { chinese: '己未' },
    month: { chinese: '己巳' },
    day:   { chinese: '乙亥' },
    time:  { chinese: '丁丑' }
  };

  // ▼ 2) URLから値を拾う
  let params = {};
  try {
    params = safeParseParams();
    console.log('[BOOT] URL params =', params);
  } catch (e) {
    console.warn('[BOOT] URL params 読み込み失敗', e);
  }

  // birth, birthday, y, year のどれかに入っている想定
  // 例: ?birth=1989-06-07  または ?year=1989
  let birthYear = 1989;
  if (params.birth) {
    // "1989-06-07" みたいなのを想定
    const y = String(params.birth).split('-')[0];
    if (y && !isNaN(+y)) birthYear = +y;
  } else if (params.birthday) {
    const y = String(params.birthday).split('-')[0];
    if (y && !isNaN(+y)) birthYear = +y;
  } else if (params.year) {
    if (!isNaN(+params.year)) birthYear = +params.year;
  } else if (params.y) {
    if (!isNaN(+params.y)) birthYear = +params.y;
  }

  // 性別（大運の順逆に効くやつ）
  // ?gender=male / ?gender=female で渡すようにする
  const gender = (params.gender === 'male' || params.gender === 'female')
    ? params.gender
    : 'female'; // デフォルト

  // ▼ 3) 干支を分解（ここは元のまま）
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

  // ▼ 4) 命式テーブル
  if (typeof renderClassicTable === 'function') {
    try {
      renderClassicTable(pillars, stems.dG, stems, branches);
    } catch (e) {
      console.error('[BOOT] renderClassicTable でエラー', e);
    }
  }

  // ▼ 5) 五行・陰陽
  const fiveCounts = buildFiveCounts(stems, branches);
  const yyCounts   = buildYinYangCounts(stems, branches);
  renderFiveBalanceSection(fiveCounts, yyCounts);

  // ▼ 6) 身強弱・格局・喜神
  drawStrengthAndKakkyoku(stems, branches, fiveCounts);

  // ▼ 7) 蔵干代表
  drawZangRep(stems, branches);

  // ▼ 8) 十二運
  drawStage12(stems.dG, branches);

  // ▼ 9) 九星 ←ここでさっき直した関数を使う
  try {
    const ky = kyuseiSimpleByYear(birthYear);
    setTextIf('c_kyusei', ky);
  } catch (e) {
    console.error('[BOOT] 九星でエラー', e);
  }

  // ▼ 10) 成敗ロジック
  drawLogicBoxes(pillars);

  // ▼ 11) 大運・年運 ←ここに性別と生年を渡す
  try {
    renderDaiunTable(pillars, gender, birthYear);
    renderLiunianTable(pillars, gender, birthYear, { startYear: 2025, years: 10 });
  } catch (e) {
    console.error('[BOOT] 大運・年運でエラー', e);
  }

  const diag = document.getElementById('diag');
  if (diag) diag.textContent = '表示完了（パラメータ反映済み）';
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

    // 用神・喜神・忌神・仇神
    const yjBox = document.getElementById('yojin');
    if (yjBox) {
      // HTML側を汚したくないのでここで整形して入れる
      if (typeof YOJIN !== 'undefined') {
        const yj = YOJIN[kak.name];
        if (yj) {
          const rows = [
            { label: '用神', val: (yj['用神'] || []).join('・') || '—' },
            { label: '喜神', val: (yj['喜神'] || []).join('・') || '—' },
            { label: '忌神', val: (yj['忌神'] || []).join('・') || '—' },
            { label: '仇神', val: (yj['仇神'] || []).join('・') || '—' },
          ];
          yjBox.innerHTML = rows.map(r => (
            `<div style="display:flex;gap:.5rem;margin:.15rem 0;">
               <span style="min-width:5.5rem;color:#555;">${r.label}</span>
               <span>${r.val}</span>
             </div>`
          )).join('');
        } else {
          // 対応がないときは空にしておく（前の表示を消す）
          yjBox.textContent = '';
        }
      } else {
        yjBox.textContent = '';
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

    // 天剋地冲… 定義がなければ「何も書かない」でおく（空欄維持）
    if (typeof detectTkdc === 'function') {
      const r = detectTkdc(pillars);
      const box = document.getElementById('tkdc');
      if (box) box.innerHTML = Array.isArray(r) ? r.join('<br>') : (r || '');
    }

    // 守護神（調候優先）… 同じく定義があれば出す、なければ空欄のまま
    if (typeof selectGuardian === 'function') {
      const g = selectGuardian(pillars, stems, branches, fiveCounts);
      const box = document.getElementById('guardian');
      if (box) box.textContent = g && g.text ? g.text : '';
    }
  }

  // =====================================
  // ヘルパー群
  // =====================================
  function setTextIf(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = (txt ?? '');
  }

  // 干支→五行
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

  // 干支→陰陽
  function buildYinYangCounts(stems, branches) {
    const yy = { '陽':0, '陰':0 };
    // 干
    [stems.yG, stems.mG, stems.dG, stems.hG].forEach(g => {
      if (!g) return;
      const isYang = ['甲','丙','戊','庚','壬'].includes(g);
      yy[isYang ? '陽' : '陰'] += 1;
    });
    // 支
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

// bazi-luck.js
// ========================
// 大運・年運（流年）描画専用
// ========================

/* ===================== 大運表（0歳から、月柱基準固定） ===================== */
function renderDaiunTable(pillars, gender, birthYear) {
  const section = document.getElementById('daiunSection');
  const tbody = document.querySelector('#daiunTable tbody');
  if (!section || !tbody) {
    console.error('[大運] 要素未発見');
    return;
  }

  // 月数 → 「X歳Yカ月」表記（※「カ月」固定）
  const fmtAge = (months) => {
    const y = Math.floor(months / 12);
    const m = months % 12;
    return `${y}歳${m}カ月`;
  };

  try {
    // 順逆行（年干の陰陽 × 性別）
    const yearStem = pickStem(pillars.year);
    const stemYinYang = YANG_STEMS.includes(yearStem) ? '陽' : '陰';
    const isForward = (gender === 'male' && stemYinYang === '陽') ||
                      (gender === 'female' && stemYinYang === '陰');

    // 基準は月柱
    const monthStem = pickStem(pillars.month);
    const monthBranch = pickBranch(pillars.month);

    // 起点（干支インデックス）
    const stems = STEMS.slice();
    const branches = BRANCHES.slice();
    const currentStemIdx = stems.indexOf(monthStem);
    const currentBranchIdx = branches.indexOf(monthBranch);

    tbody.innerHTML = '';

    // 0〜99歳8カ月まで = 11行
    for (let i = 0; i <= 10; i++) {
      // 開始月：1行目だけ 0、以降は 9歳8カ月 → 19歳8カ月 …（= 116カ月、その後120カ月刻み）
      const startMonths = (i === 0) ? 0 : (((i - 1) * 10 + 9) * 12 + 8);
      // 干支の進み：0行目は0歩＝月柱
      const step = isForward ? i : -i;

      const stemIdx = (currentStemIdx + step + 10) % 10;
      const branchIdx = (currentBranchIdx + step + 12) % 12;

      const daiunStem = stems[stemIdx];
      const daiunBranch = branches[branchIdx];
      const daiunGanshi = daiunStem + daiunBranch;

      // 月干を基準に評価
      const tgStem = tenGodExact(monthStem, daiunStem) || '—';
      const zang = ZANG[daiunBranch];
      const mainZG = zang && zang.hon ? zang.hon : '';
      const tgBranch = mainZG ? (tenGodExact(monthStem, mainZG) || '—') : '—';
      const junii = stage12Of(monthStem, daiunBranch) || '—';

      // 命式4支との冲
      const pairList = [
        { key: 'time', label: '時' },
        { key: 'day', label: '日' },
        { key: 'month', label: '月' },
        { key: 'year', label: '年' }
      ];
      const relations = [];
      pairList.forEach(({ key, label }) => {
        const pBranch = pickBranch(pillars[key]);
        if (CHONG.some(([a, b]) => (a === daiunBranch && b === pBranch) || (a === pBranch && b === daiunBranch))) {
          relations.push(label + '支と冲');
        }
      });

      console.log(
        `[DAIUN DEBUG] i=${i} 開始=${fmtAge(startMonths)} step=${step} ` +
        `干支=${daiunGanshi} 天干TG=${tgStem} 地支TG=${tgBranch} 十二運=${junii}`
      );

      const startAgeLabel = fmtAge(startMonths) + '〜';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${startAgeLabel}</td>
        <td><strong>${daiunGanshi}</strong></td>
        <td>天干: ${tgStem}<br>地支: ${tgBranch}</td>
        <td>${junii}</td>
        <td>${relations.length > 0 ? relations.join('<br>') : '—'}</td>
      `;
      tbody.appendChild(tr);

      console.log(`[大運] i=${i} start=${startAgeLabel} daiun=${daiunGanshi} step=${step}`);
    }

    section.style.display = 'block';
    console.log('[大運] 描画完了（0歳0カ月→9歳8カ月→以後10年刻み、全11行）');
  } catch (err) {
    console.error('[大運] 描画エラー:', err);
  }
}

/* ===================== 年運（流年）テーブル ===================== */
function renderLiunianTable(pillars, gender, birthYear, options = {}) {
  const section = document.getElementById('liunianSection');
  const tbody = document.querySelector('#liunianTable tbody');
  if (!section || !tbody) {
    console.error('[年運] 要素未発見');
    return;
  }

  // オプション
  const startYear = Number(options.startYear) || birthYear;
  const years = Math.max(1, Math.min(120, Number(options.years) || 10));

  // 基準：月干・月支
  const monthStem = pickStem(pillars.month);
  const monthBranch = pickBranch(pillars.month);

  // 出生年の干支 → 以後+1年ずつローテーション
  const birthGZ = (pillars.year?.chinese || '').trim();
  const birthIdx = JIAZI.indexOf(birthGZ);
  if (birthIdx < 0) {
    console.warn('[年運] 出生年の干支が60干支表に見つからない:', birthGZ);
  }

  // 命式4支（関係判定に使用）
  const natalBranches = {
    time: pickBranch(pillars.time),
    day: pickBranch(pillars.day),
    month: pickBranch(pillars.month),
    year: pickBranch(pillars.year)
  };
  const relLabels = { time:'時', day:'日', month:'月', year:'年' };

  tbody.innerHTML = '';

  for (let i = 0; i < years; i++) {
    const y = startYear + i;
    const age = y - birthYear;

    // 出生年からの経過年数
    const delta = y - birthYear;
    // 干支（出生GZを起点に delta 年進める）
    let gz, stem, branch;
    if (birthIdx >= 0) {
      gz = JIAZI[(birthIdx + delta) % 60];
      stem = gz?.charAt(0) || '';
      branch = gz?.charAt(1) || '';
    } else {
      // フォールバック：五黄中宮年など外部計算に頼らず、現在の pillars.year を基準に +delta
      const base = (pillars.year?.chinese || '').trim();
      const idx2 = JIAZI.indexOf(base);
      gz = idx2 >= 0 ? JIAZI[(idx2 + delta) % 60] : '';
      stem = gz?.charAt(0) || '';
      branch = gz?.charAt(1) || '';
    }

    // 通変星（天干：月干→年干、地支：月干→年支の本気蔵干）
    const tgStem = tenGodExact(monthStem, stem) || '—';
    const zang = ZANG[branch];
    const mainZG = zang && zang.hon ? zang.hon : '';
    const tgBr = mainZG ? (tenGodExact(monthStem, mainZG) || '—') : '—';

    // 十二運星（基準：月干、対象：年支）
    const stage = stage12Of(monthStem, branch) || '—';

    // 命式4支との「冲」を簡易表示
    const relations = [];
    Object.entries(natalBranches).forEach(([k, nb]) => {
      if (!nb) return;
      if (CHONG.some(([a,b]) => (a === branch && b === nb) || (a === nb && b === branch))) {
        relations.push(`${relLabels[k]}支と冲`);
      }
    });

    // 行を追加
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="border:1px solid #999;padding:8px 10px">${y}</td>
      <td style="border:1px solid #999;padding:8px 10px">${age}歳</td>
      <td style="border:1px solid #999;padding:8px 10px"><strong>${stem}${branch}</strong></td>
      <td style="border:1px solid #999;padding:8px 10px">天干: ${tgStem}<br>地支: ${tgBr}</td>
      <td style="border:1px solid #999;padding:8px 10px">${stage}</td>
      <td style="border:1px solid #999;padding:8px 10px">${relations.length ? relations.join('<br>') : '—'}</td>
    `;
    tbody.appendChild(tr);

    console.log(`[年運] y=${y} age=${age} gz=${stem}${branch} tg=${tgStem}/${tgBr} stage=${stage}`);
  }

  section.style.display = 'block';
  console.log('[年運] 描画完了: startYear=%d years=%d', startYear, years);
}
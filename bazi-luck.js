// bazi-luck.js
// ========================
// 大運・年運（流年）描画専用
// ========================

/**
 * 起運(月数)を出すための器
 * ここでは「ロジック未実装なら null を返す」だけにしておく
 * あとで節入りとの差分→÷3→順逆で前後…をここに書けばOK。
 *
 * @param {string} birthStr  "1979-05-10" みたいな文字列想定
 * @param {string} gender    "male" | "female"
 * @param {string} stemYinYang "陽" | "陰"
 * @returns {number|null} 起運までの月数（たとえば 9歳8カ月なら 116）or null
 */
/**
 * 起運までの月数を求める器
 * - ここでは「おおまかな優先順」だけ決めておく
 * - 本物の節気計算は getNextSolarTerm() を実装したときに有効にする
 *
 * @param {string|null} birthStr "1979-05-08" など。nullならフォールバック。
 * @param {string} gender        "male" or "female"
 * @param {string} stemYinYang   "陽" or "陰" … 年干の陰陽
 * @returns {number|null}        起運までの月数、わからなければ null
 */
function calcQiYunMonths(birthStr, gender, stemYinYang) {
  // 入力がなければ何もできないので null → 呼び出し側が116でフォールバックする
  if (!birthStr) {
    console.log('[QIYUN] birth が無いのでフォールバックします');
    return null;
  }

  // 1. 生年月日を分解
  // "YYYY-MM-DD" or "YYYY/M/D" 程度は受ける
  const normalized = birthStr.replace(/\//g, '-');
  const parts = normalized.split('-');
  if (parts.length < 3) {
    console.log('[QIYUN] birth の形式が想定外です:', birthStr);
    return null;
  }
  const by = parseInt(parts[0], 10);
  const bm = parseInt(parts[1], 10);
  const bd = parseInt(parts[2], 10);

  if (!by || !bm || !bd) {
    console.log('[QIYUN] birth の数値変換に失敗しました:', birthStr);
    return null;
  }

  // 2. ここで本当は「節入りの日時」を求める。
  //    → まだ無いので、月だけでざっくり分類しておく。
  //
  // 中国式でよくあるのは
  //   ・順行のとき：出生後の節気までの日数 ÷ 3 日 = 起運年齢(年)
  //   ・逆行のとき：出生前の節気までの日数 ÷ 3 日 = 起運年齢(年)
  // なので、その“日数を出す”ところだけ後で埋められるようにする。
  //
  // 今は「とりあえず性別×年干陰陽だけで 9年 or 10年 にする」簡易ロジックにしておく。

  const isForward = (gender === 'male' && stemYinYang === '陽') ||
                    (gender === 'female' && stemYinYang === '陰');

  // 簡易：順行なら 9年8カ月(116)、逆行なら 10年0カ月(120) にしておく
  // ここはあとで「節気日数÷3」を入れたら消す前提
  if (isForward) {
    console.log('[QIYUN] 簡易順行 → 9y8m に設定');
    return 116; // 9年8カ月
  } else {
    console.log('[QIYUN] 簡易逆行 → 10y0m に設定');
    return 120; // 10年
  }
}


/* ===================== 大運表 ===================== */
/**
 * @param {Object} pillars  {year:{chinese}, month:{...}, day:{...}, time:{...}}
 * @param {string} gender   "male" or "female"
 * @param {number} birthYear 西暦
 * @param {Object} [options]
 *    - birth: "YYYY-MM-DD" を渡せるようにしておく
 *    - firstStartMonths: 数字で渡せば起運をそれにする
 */
function renderDaiunTable(pillars, gender, birthYear, options) {
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

    // ▼ ここが今回のポイント：起運を可変にする
    let firstStartMonths = 116; // 従来どおり 9歳8カ月
    if (options && typeof options.firstStartMonths === 'number') {
      firstStartMonths = Math.max(0, Math.floor(options.firstStartMonths));
    } else if (options && options.birth) {
      // 生年月日と性別と年干陰陽がそろっていれば、ここで起運を計算して差し込む
      const q = calcQiYunMonths(options.birth, gender, stemYinYang);
      if (typeof q === 'number' && q >= 0) {
        firstStartMonths = q;
      }
    }

    // 0〜99歳台まで = 11行
    for (let i = 0; i <= 10; i++) {
      // 行ごとの開始月
      // 1行目だけ 0、2行目は「起運の月」、以降は10年刻み
      let startMonths;
      if (i === 0) {
        startMonths = 0;
      } else if (i === 1) {
        startMonths = firstStartMonths;
      } else {
        // 2行目以降は「(i-1) * 10年 + 起運の年齢」で刻む感じにする
        // 120カ月 = 10年
        startMonths = firstStartMonths + (i - 1) * 120;
      }

      // 干支の進み：0行目は0歩＝月柱
      const step = isForward ? i : -i;
      const stemIdx = (currentStemIdx + step + 10) % 10;
      const branchIdx = (currentBranchIdx + step + 12) % 12;

      const daiunStem = stems[stemIdx];
      const daiunBranch = branches[branchIdx];
      const daiunGanshi = daiunStem + daiunBranch;

      // 月干を基準に評価
      const tgStem = tenGodExact(monthStem, daiunStem) || '—';
      const tgBr = tenGodExact(monthStem, pickStem({ chinese: daiunBranch + '' })) || '—';

      // 十二運（「日干 vs 地支」でもいいがここでは月干ベースで）
      const stage = stage12Of(monthStem, daiunBranch) || '—';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtAge(startMonths)}</td>
        <td><strong>${daiunGanshi}</strong></td>
        <td>${tgStem}</td>
        <td>${stage}</td>
        <td class="muted">—</td>
      `;
      tbody.appendChild(tr);

      console.log('[DAIUN DEBUG] i=%d 開始=%s step=%d 干支=%s 天干TG=%s 地支TG=%s 十二運=%s',
        i, fmtAge(startMonths), step, daiunGanshi, tgStem, tgBr, stage);
    }

    section.style.display = 'block';
    console.log('[大運] 描画完了（起運=%sカ月, 性別=%s, 順行=%s）',
      firstStartMonths, gender, isForward ? '順' : '逆');

  } catch (e) {
    console.error('[大運] 描画でエラー', e);
  }
}

/* ===================== 年運表 ===================== */
function renderLiunianTable(pillars, gender, birthYear, options) {
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

  // 出生年の干支を起点にする
  const birthGz = pillars.year.chinese;
  const birthIdx = JIAZI.indexOf(birthGz);

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
      // 年柱の干支が取れなかった場合は十二支だけでも進める
      branch = BRANCHES[(BRANCHES.indexOf(monthBranch) + delta) % 12];
      stem = STEMS[(STEMS.indexOf(monthStem) + delta) % 10];
      gz = stem + branch;
    }

    // 通変星（天干・地支で2つ出す）
    const tgStem = tenGodExact(monthStem, stem) || '—';
    const tgBr = tenGodExact(monthStem, pickStem({ chinese: branch + '' })) || '—';

    // 十二運
    const stage = stage12Of(monthStem, branch) || '—';

    // 合・冲など（柱と年運の干支判定）…ここはあとで拡張
    const relations = [];

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

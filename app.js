// app.js
// ========================
// メイン実行・データフロー制御
// ========================

(async function main() {
  try {
    console.log('[BOOT] app.js start');

    const Lib = window.BaziCalculator;
    if (!Lib) {
      setText('summary', 'BaZiライブラリ未読み込み（index.global.js）');
      return;
    }

    const loader = new Lib.BrowserDateMappingLoader('./src/dates_mapping.json');
    if (typeof loader.loadDateMappings === 'function') {
      try {
        await loader.loadDateMappings();
      } catch (e) {
        console.error('[LOADER]', e);
      }
    }

    const params = safeParseParams();

    const rawDate = params.date || '';
    const rawTime = params.time || '12:00';
    const rawTz = params.tz || 'Asia/Tokyo';
    const rawW = params.w || '1.0,0.6,0.3';
    const rawTb = params.tb || '0.2';
    const rawGender = (params.gender || 'male') + '';
    const rawLnStart = params.lnStart;
    const rawLnYears = params.lnYears;

    const date = rawDate;
    const time = /^\d{1,2}:\d{2}$/.test(rawTime) ? rawTime : '12:00';
    const tz = rawTz.replace(/[^\w/+\-]/g,'').slice(0,64);
    const [wHon, wMid, wRem] = rawW.replace(/_/g,',').split(',').slice(0,3).map(Number);
    const tokoBonus = parseFloat(rawTb) || 0.2;
    const gender = rawGender.toLowerCase() === 'female' ? 'female' : 'male';

    setText('summary',
      date
        ? `生年月日 ${date}　出生時刻 ${time}　TZ ${tz}　配点 ${wHon}/${wMid}/${wRem}　透干+${tokoBonus}`
        : 'パラメータがありません'
    );
    
    const diag = $('diag');
    if (diag) diag.textContent = '';

    if (!date) {
      console.warn('[PARAM] date なし。例: ?date=1990-01-01&time=12:00');
      return;
    }

    const [Y, M, D] = date.split('-').map(Number);
    const [hh] = time.split(':').map(Number);
    const hourInt = isFinite(hh) ? hh : 12;

    const calc = new Lib.BaziCalculator(Y, M, D, hourInt, gender, loader);
    const pillars = calc.calculatePillars();

    let basic;
    if (typeof calc.calculateBasicAnalysis === 'function') {
      try {
        basic = calc.calculateBasicAnalysis();
      } catch (e) {
        console.error('[BASIC]', e);
        basic = { fiveFactors: {} };
      }
    } else {
      basic = { fiveFactors: {} };
    }

    function getBranchSafe(pillar) {
      const s = pillar && pillar.chinese ? String(pillar.chinese) : '';
      for (const ch of Array.from(s)) if (ZANG[ch]) return ch;
      for (const zhi of BRANCH12) if (s.includes(zhi)) return zhi;
      return '';
    }

    const hG = pickStem(pillars.time);
    const dG = pickStem(pillars.day);
    const mG = pickStem(pillars.month);
    const yG = pickStem(pillars.year);

    const hB = getBranchSafe(pillars.time);
    const dB = getBranchSafe(pillars.day);
    const mB = getBranchSafe(pillars.month);
    const yB = getBranchSafe(pillars.year);

    console.log('[CHK] stems:', { yG, mG, dG, hG });
    console.log('[CHK] branches:', { yB, mB, dB, hB });

    setText('h', pillars.time.chinese);
    setText('d', pillars.day.chinese);
    setText('m', pillars.month.chinese);
    setText('y', pillars.year.chinese);

    setText('c_time_tg', tenGodExact(dG, hG) || '－');
    setText('c_day_tg', '　');
    setText('c_month_tg', tenGodExact(dG, mG) || '－');
    setText('c_year_tg', tenGodExact(dG, yG) || '－');
    
    paintTgCell('c_time_tg');
    paintTgCell('c_day_tg');
    paintTgCell('c_month_tg');
    paintTgCell('c_year_tg');

    const birthYearForKyusei = Number((date||'').slice(0,4));
    if ($('c_kyusei') && birthYearForKyusei) {
      setText('c_kyusei', kyuseiSimpleByYear(birthYearForKyusei) + '（※簡易計算)');
    }

    /* ===== 十二運星の描画（日干基準） ===== */
    (function renderStage12() {
      console.log('[十二運星] デバッグ開始');
      console.log('[十二運星] 日干 dG:', dG);

      const map = [
        { label: '時', branch: hB, textId: 'c_time_12un', valId: 'c_time_12un_val' },
        { label: '日', branch: dB, textId: 'c_day_12un', valId: 'c_day_12un_val' },
        { label: '月', branch: mB, textId: 'c_month_12un', valId: 'c_month_12un_val' },
        { label: '年', branch: yB, textId: 'c_year_12un', valId: 'c_year_12un_val' },
      ];

      console.log('[十二運星] 地支配列(時→日→月→年):', map.map(x => x.branch));

      map.forEach(({ label, branch, textId }) => {
        console.log(`[十二運星] ${label}支: ${branch}`);
        const stageName = stage12Of(dG, branch);
        console.log(`[十二運星] ${label}支の十二運星: ${stageName || '（なし）'}`);

        const cell = document.getElementById(textId);
        console.log(`[十二運星] セルID ${textId} の存在:`, cell ? 'あり' : 'なし');

        if (cell) {
          cell.textContent = stageName || '—';
          cell.classList.remove('yang','yin','neutral');

          if (stageName) {
            const val = stage12Value(stageName);
            console.log(`[十二運星] ${label}支の数値: ${val}`);
            if (val >= 8) cell.classList.add('yang');
            else if (val >= 5) cell.classList.add('neutral');
            else cell.classList.add('yin');
          } else {
            cell.classList.add('neutral');
          }
          console.log(`[十二運星] ${label}支セル更新完了: textContent="${cell.textContent}", classes="${cell.className}"`);
        }
      });

      // 「十二運（数）」の描画
      map.forEach(({ label, branch, valId }) => {
        const stageName = stage12Of(dG, branch);
        const cell = document.getElementById(valId);
        console.log(`[十二運星数] セルID ${valId} の存在:`, cell ? 'あり' : 'なし');

        if (cell) {
          const val = stage12Value(stageName);
          cell.textContent = val > 0 ? val : '—';
          cell.classList.remove('yang','yin','neutral');

          if (val >= 8) cell.classList.add('yang');
          else if (val >= 5) cell.classList.add('neutral');
          else if (val > 0) cell.classList.add('yin');
          else cell.classList.add('neutral');

          console.log(`[十二運星数] ${label}支更新完了: textContent="${cell.textContent}", classes="${cell.className}"`);
        }
      });

      console.log('[十二運星] デバッグ終了');
    })();

    console.log('[BALANCE] hosts:',
      !!$('energy'), !!$('fiveRadar'), !!$('yyWrap'), !!$('yyChart'));

    /* ===== 五行バランス描画 ===== */
    (function renderFiveBalance() {
      const order = ['木','火','土','金','水'];
      const cnt = { 木:0, 火:0, 土:0, 金:0, 水:0 };

      [yG, mG, dG, hG].forEach(s => {
        const el = stemElement[s];
        if (el) cnt[el] += 1;
      });
      [yB, mB, dB, hB].forEach(b => {
        const el = branchElement[b];
        if (el) cnt[el] += 1;
      });

      const yy = { 陽:0, 陰:0 };
      [yG, mG, dG, hG].forEach(s => {
        if (s) yy[yinYangOfStem(s)]++;
      });
      [yB, mB, dB, hB].forEach(b => {
        if (b) yy[yinYangOfBranch(b)]++;
      });

      window.__fiveCounts = cnt;
      window.__yyCounts = yy;

      renderFiveBalanceSection(cnt, yy);
    })();

    /* ===== 身強弱・格局 ===== */
    const fiveCounts = window.__fiveCounts || {木:0,火:0,土:0,金:0,水:0};
    const fiveForStrength = {
      WOOD: fiveCounts.木,
      FIRE: fiveCounts.火,
      EARTH: fiveCounts.土,
      METAL: fiveCounts.金,
      WATER: fiveCounts.水
    };
    
    const st = judgeStrength(fiveForStrength, dG);
    const stW = $('strength');
    if (stW) {
      stW.innerHTML = '';
      stW.appendChild(badge(st.label));
      const span = document.createElement('span');
      span.style.marginLeft = '8px';
      span.textContent = st.detail;
      stW.appendChild(span);
    }

    const kk = judgeKakkyoku(dG, mB, st.label);
    const kkW = $('kakkyoku');
    if (kkW) {
      kkW.innerHTML = '';
      kkW.appendChild(badge(kk.name));
      const b2 = document.createElement('span');
      b2.style.marginLeft = '8px';
      b2.textContent = kk.basis;
      kkW.appendChild(b2);
    }

    const yj = YOJIN[kk.name];
    const yWrap = $('yojin');
    if (yWrap) {
      yWrap.innerHTML = '';
      if (yj) {
        yWrap.appendChild(
          createTable(['用神','喜神','忌神','仇神'],
            [[yj.用神.join('・'), yj.喜神.join('・'), yj.忌神.join('・'), yj.仇神.join('・')]]
          )
        );
      }
    }

    /* ===== 透干・関係・調候 ===== */
    const toko = detectToko(pillars);
    const rel = detectRelations(pillars);
    const chk = judgeChoko(mB, fiveCounts);
    
    const tWrap = $('toko');
    if (tWrap) {
      tWrap.innerHTML = '';
      tWrap.appendChild(createList(toko));
    }
    
    const rWrap = $('relations');
    if (rWrap) {
      rWrap.innerHTML = '';
      rWrap.appendChild(createList(rel));
    }
    
    const cWrap = $('choko');
    if (cWrap) cWrap.textContent = chk.text;

    /* ===== 天剋地冲 ===== */
    const tkdc = [];
    const cols = ['年','月','日','時'];
    const stems = [yG, mG, dG, hG];
    const brs = [yB, mB, dB, hB];
    const isChong = (a, b) => CHONG.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
    
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        if (isCounterPair(stems[i], stems[j]) && isChong(normalizeBranch(brs[i]), normalizeBranch(brs[j]))) {
          tkdc.push(`${cols[i]}-${cols[j]}：天剋地冲`);
        }
      }
    }
    
    if ($('tkdc')) {
      $('tkdc').innerHTML = '';
      $('tkdc').appendChild(createList(tkdc.length ? tkdc : ['該当なし']));
    }

    /* ===== 守護神 ===== */
    if ($('guardian')) {
      const asStem = (el) => GUARDIAN_DEFAULT_STEM[el] || '－';
      const parts = [];
      if (chk.need.length >= 1) parts.push(`第一：${asStem(chk.need[0])}（${chk.need[0]||'－'}）`);
      if (chk.need.length >= 2) parts.push(`第二：${asStem(chk.need[1])}（${chk.need[1]||'－'}）`);
      $('guardian').textContent = parts.length ? parts.join('　') : '—';
    }

    /* ===== 蔵干十神 ===== */
    try {
      const stemsByPos = { yearG: yG, monthG: mG, dayG: dG, timeG: hG };

      const defs = [
        { pillar:'year', branch: yB, mainId:'c_year_zang_tg_main', basisId:'c_year_zang_tg_basis' },
        { pillar:'month', branch: mB, mainId:'c_month_zang_tg_main', basisId:'c_month_zang_tg_basis' },
        { pillar:'day', branch: dB, mainId:'c_day_zang_tg_main', basisId:'c_day_zang_tg_basis' },
        { pillar:'time', branch: hB, mainId:'c_time_zang_tg_main', basisId:'c_time_zang_tg_basis' },
      ];

      defs.forEach(({ pillar, branch, mainId, basisId }) => {
        const rep = selectZangTenGod(dG, branch, stemsByPos, pillar);
        const mainEl = document.getElementById(mainId);
        const basisEl = document.getElementById(basisId);
        if (mainEl) mainEl.textContent = rep.tg || '－';
        if (basisEl) basisEl.textContent = rep.basis || '';
      });
    } catch(e) {
      console.error('[ZANG_TG]', e);
    }

    /* ===== 命式表描画 ===== */
    const hasClassicTable = document.getElementById('c_time_gz');
    if (hasClassicTable) {
      const ready = await waitForId('c_time_gz');
      if (ready) {
        renderClassicTable(pillars, dG, 
          { yG, mG, dG, hG },
          { yB, mB, dB, hB }
        );
        console.log('[CLASSIC] 命式表描画完了');
      } else {
        console.error('[CLASSIC] タイムアウト');
      }
    }

    /* ===== 大運・年運描画 ===== */
    const birthYear = Number((date||'').slice(0,4)) || Y;
    renderDaiunTable(pillars, gender, birthYear);

    const lnStartYear = Number(rawLnStart) || birthYear;
    const lnYears = Number(rawLnYears) || 50;
    renderLiunianTable(pillars, gender, birthYear, {
      startYear: lnStartYear,
      years: lnYears
    });

    console.log('[BOOT] app.js end');

  } catch (err) {
    console.error('[ERROR] main:', err);
    if ($('summary')) {
      $('summary').textContent = 'エラーが発生しました: ' + err.message;
    }
  }
})();


function paintTgCell(id){
  const cell = document.getElementById(id);
  if (!cell) return;
  const label = (cell.textContent || '').trim();
  if (!label || label === '　'){ return; }
  const parts = splitTgLabel(label);
  if (!parts.length) return;
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode(label + ' '));
  parts.forEach((name, idx) => {
    const meta = TEN_GOD_META[name];
    if (!meta) return;
    if (idx>0) frag.appendChild(document.createTextNode(' '));
    frag.appendChild( makeBadge(meta.yy, [meta.yy==='陽' ? 'yang' : 'yin']) );
    frag.appendChild(document.createTextNode(' '));
    frag.appendChild( makeBadge(meta.el) );
  });
  cell.innerHTML = '';
  cell.appendChild(frag);
}

/* ===================== 4) 実行部 IIFE Start ===================== */
(async function main(){
  try {
    console.log('[BOOT] app.js start');

    const Lib = window.BaziCalculator;
    if (!Lib) { setText('summary','BaZiライブラリ未読み込み（index.global.js）'); return; }

    const loader = new Lib.BrowserDateMappingLoader('./src/dates_mapping.json');
    if (typeof loader.loadDateMappings === 'function') {
      try { await loader.loadDateMappings(); } catch (e) { console.error('[LOADER]', e); }
    }

    const params = safeParseParams();

    const rawDate   = params.date   || '';
    const rawTime   = params.time   || '12:00';
    const rawTz     = params.tz     || 'Asia/Tokyo';
    const rawW      = params.w      || '1.0,0.6,0.3';
    const rawTb     = params.tb     || '0.2';
    const rawGender = (params.gender || 'male') + '';
// 年運の開始年・行数（任意指定。指定がなければ出生年から10年分）
const rawLnStart = params.lnStart;   // 例：?lnStart=2026
const rawLnYears = params.lnYears;   // 例：?lnYears=12


    const date = rawDate;
    const time = /^\d{1,2}:\d{2}$/.test(rawTime) ? rawTime : '12:00';
    const tz   = rawTz.replace(/[^\w/+\-]/g,'').slice(0,64);
    const [wHon,wMid,wRem] = rawW.replace(/_/g,',').split(',').slice(0,3).map(Number);
    const tokoBonus = parseFloat(rawTb) || 0.2;
    const gender = rawGender.toLowerCase()==='female' ? 'female' : 'male';

    setText('summary',
      date
        ? `生年月日 ${date}　出生時刻 ${time}　TZ ${tz}　配点 ${wHon}/${wMid}/${wRem}　透干+${tokoBonus}`
        : 'パラメータがありません'
    );
    const diag = $('diag'); if (diag) diag.textContent = '';

    if (!date) {
      console.warn('[PARAM] date なし。例: ?date=1990-01-01&time=12:00');
      return;
    }

    const [Y,M,D] = date.split('-').map(Number);
    const [hh] = time.split(':').map(Number);
    const hourInt = isFinite(hh) ? hh : 12;

    const calc = new Lib.BaziCalculator(Y, M, D, hourInt, gender, loader);
    const pillars = calc.calculatePillars();

    let basic;
    if (typeof calc.calculateBasicAnalysis === 'function') {
      try { basic = calc.calculateBasicAnalysis(); }
      catch (e) { console.error('[BASIC]', e); basic = { fiveFactors: {} }; }
    } else {
      basic = { fiveFactors: {} };
    }

    function getBranchSafe(pillar){
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

    function buildZhiFrag(zhi){
      const frag = document.createDocumentFragment();
      const z = String(zhi || '').trim();
      const main = document.createElement('span');
      main.textContent = z || '—';
      main.style.marginRight = '6px';
      frag.appendChild(main);
      const meta = BRANCH_META[z];
      if (meta){
        const yyBadge = makeBadge(meta.yy, meta.yy === '陽' ? 'yang' : 'yin');
        frag.appendChild(yyBadge);
        frag.appendChild(document.createTextNode(' '));
        const elBadge = makeBadge(meta.el);
        elBadge.classList.add('el-' + meta.el);
        frag.appendChild(elBadge);
      }
      return frag;
    }

    const ZHI_ID_SETS = [
      ['c_year_zhi','c_month_zhi','c_day_zhi','c_time_zhi'],
      ['zhi_y','zhi_m','zhi_d','zhi_h']
    ];
    function pickZhiIdSet(){
      for (const set of ZHI_ID_SETS){
        if (set.every(id => document.getElementById(id))) return set;
      }
      return ZHI_ID_SETS[0];
    }
    function paintZhiRowWithBadges(yB, mB, dB, hB){
      const ids = pickZhiIdSet();
      const pairs = [
        [ids[0], yB],
        [ids[1], mB],
        [ids[2], dB],
        [ids[3], hB]
      ];
      pairs.forEach(([id, zhi])=>{
        const cell = document.getElementById(id);
        if (!cell) { console.error('[paintZhi] セル未発見:', id); return; }
        cell.innerHTML = '';
        cell.appendChild( buildZhiFrag(zhi) );
      });
    }
    function setZhiTextAll(yB, mB, dB, hB){
      const ids = pickZhiIdSet();
      const map = [[ids[0], yB],[ids[1], mB],[ids[2], dB],[ids[3], hB]];
      map.forEach(([id, val])=>{ const el = document.getElementById(id); if (el) el.textContent = val || '—'; });
    }

    function buildStemFrag(stem) {
      const frag = document.createDocumentFragment();
      const s = String(stem || '').trim();
      const main = document.createElement('span');
      main.textContent = s || '—';
      main.style.marginRight = '6px';
      frag.appendChild(main);
      if (s) {
        const yy = YANG_STEMS.includes(s) ? '陽' : '陰';
        frag.appendChild( makeBadge(yy, yy === '陽' ? 'yang' : 'yin') );
        frag.appendChild(document.createTextNode(' '));
      }
      const element = stemElement[s];
      if (element) {
        const elBadge = makeBadge(element);
        elBadge.classList.add('el-' + element);
        frag.appendChild(elBadge);
      }
      return frag;
    }
    (function paintStemRow(){
      const map = { 
        c_time_g: hG, 
        c_day_g: dG, 
        c_month_g: mG, 
        c_year_g: yG 
      };
      Object.entries(map).forEach(([id, stem])=>{
        const cell = document.getElementById(id);
        if (!cell) return;
        cell.innerHTML = '';
        cell.appendChild( buildStemFrag(stem) );
      });
    })();

    setText('c_time_tg',  tenGodExact(dG, hG) || '－');
    setText('c_day_tg',   '　');
    setText('c_month_tg', tenGodExact(dG, mG) || '－');
    setText('c_year_tg',  tenGodExact(dG, yG) || '－');
    paintTgCell('c_time_tg');
    paintTgCell('c_day_tg');
    paintTgCell('c_month_tg');
    paintTgCell('c_year_tg');

    const birthYearForKyusei = Number((date||'').slice(0,4));
    if ($('c_kyusei') && birthYearForKyusei){
      setText('c_kyusei', kyuseiSimpleByYear(birthYearForKyusei) + '（※簡易計算）');
    }

 /* ===== 十二運星の描画（日干基準） ===== */
(function renderStage12(){
  console.log('[十二運星] デバッグ開始');
  console.log('[十二運星] 日干 dG:', dG);

  // HTMLは「時・日・月・年」の並び＆ID命名なので、それに合わせる
  const map = [
    { label: '時',  branch: hB, textId: 'c_time_12un',  valId: 'c_time_12un_val'  },
    { label: '日',  branch: dB, textId: 'c_day_12un',   valId: 'c_day_12un_val'   },
    { label: '月',  branch: mB, textId: 'c_month_12un', valId: 'c_month_12un_val' },
    { label: '年',  branch: yB, textId: 'c_year_12un',  valId: 'c_year_12un_val'  },
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
        if (val >= 8)       cell.classList.add('yang');
        else if (val >= 5)  cell.classList.add('neutral');
        else                cell.classList.add('yin');
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

      if (val >= 8)       cell.classList.add('yang');
      else if (val >= 5)  cell.classList.add('neutral');
      else if (val > 0)   cell.classList.add('yin');
      else                cell.classList.add('neutral');

      console.log(`[十二運星数] ${label}支更新完了: textContent="${cell.textContent}", classes="${cell.className}"`);
    }
  });

  console.log('[十二運星] デバッグ終了');
})();

console.log('[BALANCE] hosts:',
  !!$('energy'), !!$('fiveRadar'), !!$('yyWrap'), !!$('yyChart'));

(function renderFiveBalance(){
  const order = ['木','火','土','金','水'];
  const cnt = { 木:0, 火:0, 土:0, 金:0, 水:0 };

  // 命式の天干・地支からカウント
  [yG, mG, dG, hG].forEach(s => { const el = stemElement[s]; if (el) cnt[el] += 1; });
  [yB, mB, dB, hB].forEach(b => { const el = branchElement[b]; if (el) cnt[el] += 1; });

  // ===== 左カラム：五行表＋レーダー =====
  const energyHost = $('energy');
  if (energyHost){
    while (energyHost.firstChild) energyHost.removeChild(energyHost.firstChild);
    const row = order.map(k => cnt[k]);
    energyHost.appendChild( createTable(order, [row]) );
  }
  const radarHost = $('fiveRadar');
  if (radarHost){
    while (radarHost.firstChild) radarHost.removeChild(radarHost.firstChild);
    radarHost.appendChild( makeFiveRadarSVG(cnt, {size:260, max:8}) );
  }

  // 保存（他ロジックで利用）
  window.__fiveCounts = cnt;

  // ===== 右カラム：陰陽表＋円グラフ =====
  const yy = { 陽:0, 陰:0 };
  [yG, mG, dG, hG].forEach(s => { if (s) yy[ yinYangOfStem(s) ]++; });
  [yB, mB, dB, hB].forEach(b => { if (b) yy[ yinYangOfBranch(b) ]++; });
  window.__yyCounts = yy;

  const yyWrap = $('yyWrap');
  if (yyWrap){
    while (yyWrap.firstChild) yyWrap.removeChild(yyWrap.firstChild);
    yyWrap.appendChild( createTable(['陽','陰'], [[yy.陽, yy.陰]]) );
  }
  const yyChartHost = $('yyChart');
  if (yyChartHost){
    while (yyChartHost.firstChild) yyChartHost.removeChild(yyChartHost.firstChild);
renderYinYangPie(yyChartHost, yy.陰, yy.陽);   // ← 第4引数を消す// ★ レーダーと同サイズ

  }

  // （任意）既存の「身強弱」「格局」をこの下に並べたい場合は、ここでappendChildすればOK
})();


    const fiveCounts = window.__fiveCounts || {木:0,火:0,土:0,金:0,水:0};
    const fiveForStrength = {
      WOOD:  fiveCounts.木,
      FIRE:  fiveCounts.火,
      EARTH: fiveCounts.土,
      METAL: fiveCounts.金,
      WATER: fiveCounts.水
    };
    const st = judgeStrength(fiveForStrength, dG);
    const stW = $('strength');
    if (stW){
      stW.innerHTML='';
      stW.appendChild(badge(st.label));
      const span=document.createElement('span');
      span.style.marginLeft='8px';
      span.textContent=st.detail;
      stW.appendChild(span);
    }

    const kk = judgeKakkyoku(dG, mB, st.label);
    const kkW = $('kakkyoku');
    if (kkW){
      kkW.innerHTML='';
      kkW.appendChild(badge(kk.name));
      const b2=document.createElement('span'); 
      b2.style.marginLeft='8px'; 
      b2.textContent=kk.basis; 
      kkW.appendChild(b2);
    }
    const yj = YOJIN[kk.name];
    const yWrap = $('yojin');
    if (yWrap){
      yWrap.innerHTML='';
      if (yj) yWrap.appendChild(
        createTable(['用神','喜神','忌神','仇神'],
          [[yj.用神.join('・'), yj.喜神.join('・'), yj.忌神.join('・'), yj.仇神.join('・')]]
        )
      );
    }

    const toko = detectToko(pillars);
    const rel  = detectRelations(pillars);
    const chk  = judgeChoko(mB, fiveCounts);
    const tWrap = $('toko');      if (tWrap){ tWrap.innerHTML=''; tWrap.appendChild(createList(toko)); }
    const rWrap = $('relations'); if (rWrap){ rWrap.innerHTML=''; rWrap.appendChild(createList(rel)); }
    const cWrap = $('choko');     if (cWrap){ cWrap.textContent = chk.text; }

    const tkdc = [];
    const cols=['年','月','日','時'], stems=[yG,mG,dG,hG], brs=[yB,mB,dB,hB];
    const isChong=(a,b)=> CHONG.some(p=> (p[0]===a&&p[1]===b)||(p[0]===b&&p[1]===a));
    for(let i=0;i<4;i++) for(let j=i+1;j<4;j++){
      if (isCounterPair(stems[i],stems[j]) && isChong(normalizeBranch(brs[i]),normalizeBranch(brs[j]))) {
        tkdc.push(`${cols[i]}-${cols[j]}：天剋地冲`);
      }
    }
    if ($('tkdc')) { $('tkdc').innerHTML = ''; $('tkdc').appendChild(createList(tkdc.length?tkdc:['該当なし'])); }

    if ($('guardian')) {
      const asStem = (el) => GUARDIAN_DEFAULT_STEM[el] || '－';
      const parts = [];
      if (chk.need.length >= 1) parts.push(`第一：${asStem(chk.need[0])}（${chk.need[0]||'－'}）`);
      if (chk.need.length >= 2) parts.push(`第二：${asStem(chk.need[1])}（${chk.need[1]||'－'}）`);
      $('guardian').textContent = parts.length ? parts.join('　') : '—';
    }




    try{
      const stemsByPos = { yearG:yG, monthG:mG, dayG:dG, timeG:hG };

      const defs = [
        { pillar:'year',  branch:yB, mainId:'c_year_zang_tg_main',  basisId:'c_year_zang_tg_basis'  },
        { pillar:'month', branch:mB, mainId:'c_month_zang_tg_main', basisId:'c_month_zang_tg_basis' },
        { pillar:'day',   branch:dB, mainId:'c_day_zang_tg_main',   basisId:'c_day_zang_tg_basis'   },
        { pillar:'time',  branch:hB, mainId:'c_time_zang_tg_main',  basisId:'c_time_zang_tg_basis'  },
      ];

      defs.forEach(({ pillar, branch, mainId, basisId })=>{
        const rep = selectZangTenGod(dG, branch, stemsByPos, pillar);
        const mainEl  = document.getElementById(mainId);
        const basisEl = document.getElementById(basisId);
        if (mainEl)  mainEl.textContent  = rep.tg || '－';
        if (basisEl) basisEl.textContent = rep.basis || '';
      });
    } catch(e){ console.error('[ZANG_TG]', e); }

    function waitForId(id, tries = 40, intervalMs = 50){
      return new Promise(resolve => {
        let i = 0;
        (function loop(){
          if (document.getElementById(id)) return resolve(true);
          if (++i >= tries) return resolve(false);
          setTimeout(loop, intervalMs);
        })();
      });
    }

    function renderClassic(){
      const Hc = pillars.time.chinese;
      const Dc = pillars.day.chinese;
      const Mc = pillars.month.chinese;
      const Yc = pillars.year.chinese;

      setText('c_time_gz',  Hc);
      setText('c_day_gz',   Dc);
      setText('c_month_gz', Mc);
      setText('c_year_gz',  Yc);

      /* ===== 生年天中殺 / 日中天中殺（空亡） ===== */
      try {
        const dayGZ  = String(pillars.day?.chinese || '').trim();
        const yearGZ = String(pillars.year?.chinese || '').trim();

        const dayPair  = kongwangPairByGanzhi(dayGZ);
        const yearPair = kongwangPairByGanzhi(yearGZ);

        const fmt = (pair) => {
          if (!pair || pair.length !== 2) return '—';
          const [a, b] = pair;
          return `${a}・${b}`; // 絵文字は任意。必要なら BRANCH_EMOJI を足してOK
        };

        const yearCell = document.getElementById('kwYear');
        const dayCell  = document.getElementById('kwDay');
        console.log('[KUBO] kwYear存在:', !!yearCell, 'kwDay存在:', !!dayCell, 'dayGZ:', dayGZ, 'yearGZ:', yearGZ);

        if (yearCell) {
          yearCell.textContent = fmt(yearPair);
          yearCell.classList.remove('yin','yang');
          yearCell.classList.add('neutral');
        }
        if (dayCell) {
          dayCell.textContent = fmt(dayPair);
          dayCell.classList.remove('yin','yang');
          dayCell.classList.add('neutral');
        }
      } catch (e) {
        console.error('[KUBO] 描画エラー:', e);
      }


      setText('c_time_g',  hG);
      setText('c_day_g',   dG);
      setText('c_month_g', mG);
      setText('c_year_g',  yG);

      [['c_year_g', yG], ['c_month_g', mG], ['c_day_g', dG], ['c_time_g', hG]].forEach(([id, g])=>{
        const cell = document.getElementById(id);
        if (!cell) return;
        cell.appendChild(document.createTextNode(' '));
        const yy = yinYangOfStem(g);
        cell.appendChild( makeBadge(yy, yy==='陽' ? 'yang' : 'yin') );
        cell.appendChild(document.createTextNode(' '));
        const element = stemElement[g] || '－';
        const elBadge2 = makeBadge(element);
        if (element && element !== '－') elBadge2.classList.add(`el-${element}`);
        cell.appendChild(elBadge2);
      });

      setZhiTextAll(yB, mB, dB, hB);
      paintZhiRowWithBadges(yB, mB, dB, hB);

      setText('c_time_gogyou',  signEl(hG));      
      setText('c_day_gogyou',   signEl(dG));
      setText('c_month_gogyou', signEl(mG));
      setText('c_year_gogyou',  signEl(yG));

      setText('c_time_tg',  tenGodExact(dG, hG) || '－');
      setText('c_day_tg',   '　');
      setText('c_month_tg', tenGodExact(dG, mG) || '－');
      setText('c_year_tg',  tenGodExact(dG, yG) || '－');

      const paintZangBadgesOnly = (prefix, b) => {
        const z = (b && ZANG[b]) ? ZANG[b] : {};
        const map = { hon: z.hon || '－', mid: z.mid || '－', rem: z.rem || '－' };
        ['hon','mid','rem'].forEach(k=>{
          const el = document.getElementById(`${prefix}_zang_${k}`);
          if (!el) return;
          el.classList.remove('yin','yang','neutral');
          el.textContent = map[k];
          el.classList.add(
            (!map[k] || map[k]==='－' || map[k]==='-') ? 'neutral'
            : (YANG_STEMS.includes(map[k]) ? 'yang' : 'yin')
          );
          const elName = stemEl(map[k]);
          if (elName) el.classList.add(`el-${elName}`);
        });
      };
      paintZangBadgesOnly('c_year',  yB);
      paintZangBadgesOnly('c_month', mB); 
      paintZangBadgesOnly('c_day',   dB);
      paintZangBadgesOnly('c_time',  hB);

      const paintZangTG = (prefix, branch) => {
        const b = normalizeBranch(branch);
        const z = (b && ZANG[b]) ? ZANG[b] : {};
        const tgMap = {
          hon: z.hon ? tenGodExact(dG, z.hon) : '－',
          mid: z.mid ? tenGodExact(dG, z.mid) : '－',
          rem: z.rem ? tenGodExact(dG, z.rem) : '－'
        };
        [['hon','_zang_tg_hon'],['mid','_zang_tg_mid'],['rem','_zang_tg_rem']].forEach(([k,suf])=>{
          const el = document.getElementById(prefix + suf);
          if (el) el.textContent = tgMap[k];
        });
      };
      paintZangTG('c_time',  hB);
      paintZangTG('c_day',   dB);
      paintZangTG('c_month', mB);
      paintZangTG('c_year',  yB);

/* ===== 大運表（0歳から、月柱“基準固定”） ===== */
function renderDaiunTable(pillars, gender, birthYear) {
  const section = document.getElementById('daiunSection');
  const tbody = document.querySelector('#daiunTable tbody');
  if (!section || !tbody) { console.error('[大運] 要素未発見'); return; }

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
    const monthStem   = pickStem(pillars.month);
    const monthBranch = pickBranch(pillars.month);

    // 起点（干支インデックス）
    const stems    = STEMS.slice();
    const branches = BRANCHES.slice();
    const currentStemIdx   = stems.indexOf(monthStem);
    const currentBranchIdx = branches.indexOf(monthBranch);

    tbody.innerHTML = '';

    // 0〜99歳8カ月まで = 11行
    for (let i = 0; i <= 10; i++) {
      // 開始月：1行目だけ 0、以降は 9歳8カ月 → 19歳8カ月 …（= 116カ月、その後120カ月刻み）
      const startMonths = (i === 0) ? 0 : (((i - 1) * 10 + 9) * 12 + 8);
      // 干支の進み：0行目は0歩＝月柱
      const step        = isForward ? i : -i;

      const stemIdx   = (currentStemIdx   + step + 10) % 10;
      const branchIdx = (currentBranchIdx + step + 12) % 12;

      const daiunStem   = stems[stemIdx];
      const daiunBranch = branches[branchIdx];
      const daiunGanshi = daiunStem + daiunBranch;

      // 月干を基準に評価
      const tgStem   = tenGodExact(monthStem, daiunStem) || '—';
      const zang     = ZANG[daiunBranch];
      const mainZG   = zang && zang.hon ? zang.hon : '';
      const tgBranch = mainZG ? (tenGodExact(monthStem, mainZG) || '—') : '—';
      const junii    = stage12Of(monthStem, daiunBranch) || '—';

      // 命式4支との冲
      const pairList = [
        { key: 'time',  label: '時' },
        { key: 'day',   label: '日' },
        { key: 'month', label: '月' },
        { key: 'year',  label: '年' }
      ];
      const relations = [];
      pairList.forEach(({ key, label }) => {
        const pBranch = pickBranch(pillars[key]);
        if (CHONG.some(([a, b]) => (a === daiunBranch && b === pBranch) || (a === pBranch && b === daiunBranch))) {
          relations.push(label + '支と冲');
        }
      });

// --- DEBUG: この行が「開始年齢の干支」を使っているか可視化 ---
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

      // デバッグ
      console.log(`[大運] i=${i} start=${startAgeLabel} daiun=${daiunGanshi} step=${step}`);
    }

    section.style.display = 'block';
    console.log('[大運] 描画完了（0歳0カ月→9歳8カ月→以後10年刻み、全11行）');
  } catch (err) {
    console.error('[大運] 描画エラー:', err);
  }
}


      const birthYear = Number((date||'').slice(0,4)) || Y;
      renderDaiunTable(pillars, gender, birthYear);

// 年運の開始年・行数（URLパラメータで上書き可）
const lnStartYear = Number(rawLnStart) || birthYear; // 既定は出生年
const lnYears     = Number(rawLnYears) || 50;        // 既定は50年分
renderLiunianTable(pillars, gender, birthYear, { startYear: lnStartYear, years: lnYears });

    }

/* ===== 年運（流年）テーブル ===== */
function renderLiunianTable(pillars, gender, birthYear, options = {}) {
  const section = document.getElementById('liunianSection');
  const tbody   = document.querySelector('#liunianTable tbody');
  if (!section || !tbody) { console.error('[年運] 要素未発見'); return; }

  // オプション
  const startYear = Number(options.startYear) || birthYear;   // 既定：出生年から
  const years     = Math.max(1, Math.min(120, Number(options.years) || 10)); // 既定：10年分

  // 基準：月干・月支
  const monthStem   = pickStem(pillars.month);
  const monthBranch = pickBranch(pillars.month);

  // 出生年の干支 → 以後+1年ずつローテーション
  const birthGZ   = (pillars.year?.chinese || '').trim();
  const birthIdx  = JIAZI.indexOf(birthGZ);
  if (birthIdx < 0) { console.warn('[年運] 出生年の干支が60干支表に見つからない:', birthGZ); }

  // 命式4支（関係判定に使用）
  const natalBranches = {
    time:  pickBranch(pillars.time),
    day:   pickBranch(pillars.day),
    month: pickBranch(pillars.month),
    year:  pickBranch(pillars.year)
  };
  const relLabels = { time:'時', day:'日', month:'月', year:'年' };

  // 年齢は「その西暦 − 出生年」
  tbody.innerHTML = '';

  for (let i = 0; i < years; i++) {
    const y = startYear + i;
    const age = y - birthYear;

    // 出生年からの経過年数
    const delta = y - birthYear;
    // 干支（出生GZを起点に delta 年進める）
    let gz, stem, branch;
    if (birthIdx >= 0) {
      gz     = JIAZI[(birthIdx + delta) % 60];
      stem   = gz?.charAt(0) || '';
      branch = gz?.charAt(1) || '';
    } else {
      // フォールバック：五黄中宮年など外部計算に頼らず、現在の pillars.year を基準に +delta
      const base = (pillars.year?.chinese || '').trim();
      const idx2 = JIAZI.indexOf(base);
      gz     = idx2 >= 0 ? JIAZI[(idx2 + delta) % 60] : '';
      stem   = gz?.charAt(0) || '';
      branch = gz?.charAt(1) || '';
    }

    // 通変星（天干：月干→年干、地支：月干→年支の本気蔵干）
    const tgStem = tenGodExact(monthStem, stem) || '—';
    const zang   = ZANG[branch];
    const mainZG = zang && zang.hon ? zang.hon : '';
    const tgBr   = mainZG ? (tenGodExact(monthStem, mainZG) || '—') : '—';

    // 十二運星（基準＝月干、対象＝年支）
    const stage  = stage12Of(monthStem, branch) || '—';

    // 命式4支との「冲」を簡易表示
    const relations = [];
    Object.entries(natalBranches).forEach(([k, nb]) => {
      if (!nb) return;
      if (CHONG.some(([a,b]) => (a===branch && b===nb) || (a===nb && b===branch))) {
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

    // デバッグ
    console.log(`[年運] y=${y} age=${age} gz=${stem}${branch} tg=${tgStem}/${tgBr} stage=${stage}`);
  }

  section.style.display = 'block';
  console.log('[年運] 描画完了: startYear=%d years=%d', startYear, years);
}

    const hasClassicTable = document.getElementById('c_time_gz');
    if (hasClassicTable) {
      const ready = await waitForId('c_time_gz');
      if (ready) {
        renderClassic();
        console.log('[CLASSIC] 命式表描画完了');
      } else {
        console.error('[CLASSIC] タイムアウト');
      }
    }

    console.log('[BOOT] app.js end');

  } catch (err) {
    console.error('[ERROR] main:', err);
    if ($('summary')) {
      $('summary').textContent = 'エラーが発生しました: ' + err.message;
    }
  }
})();

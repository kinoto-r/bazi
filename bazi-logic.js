function normalizeBranch(b){
  if (!b) return b;
  const s = String(b).replace(/\s+/g,'');
  if (BRANCH12.includes(s)) return s;
  for (const zhi of BRANCH12){ if (s.includes(zhi)) return zhi; }
  return b;
}

function kyuseiSimpleByYear(year){
  const n = (11 - (year % 9));
  const idx = ((n - 1 + 9) % 9) + 1;
  const names = {1:'一白水星',2:'二黒土星',3:'三碧木星',4:'四緑木星',5:'五黄土星',6:'六白金星',7:'七赤金星',8:'八白土星',9:'九紫火星'};
  return names[idx] || '—';
}


function splitTgLabel(raw){
  if (!raw) return [];
  return String(raw).split(/[／\/]/).map(s=>s.trim()).filter(Boolean);}

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

function isYang(stem){ return ['甲','丙','戊','庚','壬'].includes(stem); }

function tenGodExact(dayStem, targetStem){
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

const signEl = s => (isYang(s)?'＋':'－') + stemEl(s);

function stage12Of(dayStem, branch){
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

const isCounterPair = (a,b)=> COUNTER[stemEl(a)]===stemEl(b) || COUNTER[stemEl(b)]===stemEl(a);

function selectZangTenGod(dayStem, monthBranch, stemsByPos) {
  const b = normalizeBranch(monthBranch);
  const zang = ZANG[b];
  if (!zang) return { tg: '－', basis: '蔵干なし', zangKey: null };

  const zangLayers = [
    { key: 'hon', label: '本気', stem: zang.hon },
    { key: 'mid', label: '中気', stem: zang.mid },
    { key: 'rem', label: '余気', stem: zang.rem },
  ].filter(z => z.stem);

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

  for (const layer of zangLayers) {
    const tg = tenGodExact(dayStem, layer.stem);
    if (tg && tg !== '－') {
      return {
        tg,
        basis: `${layer.label}「${layer.stem}」を採用（露干なし）`,
        zangKey: layer.key,
        stem: layer.stem
      };
    }
  }

  return { tg: '－', basis: '蔵干該当なし', zangKey: null, stem: null };
}
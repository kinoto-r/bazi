// 依存関係チェック
const required = [
  'setText', 'safeParseParams', 'pickStem', 'pickBranch',
  'judgeStrength', 'tenGodExact', 'createTable', 'renderDaiunTable',
  'renderLiunianTable', '$', 'stage12Of', 'stage12Value', 'renderFiveBalanceSection'
];

const missing = required.filter(name => typeof globalThis[name] === 'undefined');

if (missing.length > 0) {
  const msg = `必要な関数が読み込まれていません: ${missing.join(', ')}`;
  console.error('[BOOT ERROR]', msg);
  console.error('[HINT] HTMLで以下の順序でスクリプトを読み込んでください:');
  console.error('1. bazi-constants.js');
  console.error('2. bazi-logic.js');
  console.error('3. bazi-utils.js');
  console.error('4. bazi-render.js');
  console.error('5. bazi-luck.js');
  console.error('6. app.js');
  if (typeof $ !== 'undefined' && $('summary')) {
    $('summary').textContent = msg;
  }
  return;
}

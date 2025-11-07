// app.js
// ==========================
// 依存関係チェックと起動
// ==========================
(function () {
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
    if (typeof $ !== 'undefined') {
      const s = document.getElementById('summary');
      if (s) s.textContent = msg;
    }
    // IIFE の中なので return してOK
    return;
  }

  // ここまで来たら全スクリプトが読めている
  console.log('[BOOT] 依存関数OK、初期化を開始します');

  // ここに今後の初期化処理を書く
  // 例：
  // const params = safeParseParams();
  // console.log('[BOOT] params=', params);
})();

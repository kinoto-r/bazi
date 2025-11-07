// bazi-utils.js
// ========================
// ユーティリティ関数（URL解析・汎用ヘルパー）
// ========================

/* ===================== DOM操作ヘルパー ===================== */
// ★ ここで定義してすぐ globalThis に載せる
const $ = id => document.getElementById(id);
globalThis.$ = $;

const setText = (id, txt) => {
  const n = $(id);
  if (n) n.textContent = (txt ?? "");
};
globalThis.setText = setText;

/* ===================== 干支抽出ヘルパー ===================== */
const pickStem = p => (p && p.chinese) ? p.chinese.charAt(0) : '';
globalThis.pickStem = pickStem;

const pickBranch = p => (p && p.chinese) ? p.chinese.charAt(1) : '';
globalThis.pickBranch = pickBranch;

/* ===================== URLパラメータ解析（403回避） ===================== */
function safeParseParams() {
  const params = {};
  
  // クエリパラメータ
  const search = window.location.search;
  if (search) {
    const sp = new URLSearchParams(search);
    sp.forEach((value, key) => {
      params[key] = value;
    });
  }
  
  // ハッシュパラメータ
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const hashStr = hash.substring(1);
    const pairs = hashStr.split('&');
    
    pairs.forEach(pair => {
      if (!pair) return;
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) return;
      
      let key = pair.substring(0, eqIndex);
      let value = pair.substring(eqIndex + 1);
      
      key = convertFullToHalf(key);
      value = convertFullToHalf(value);
      
      try {
        key = decodeURIComponent(key);
        value = decodeURIComponent(value);
      } catch (e) {
        console.warn('[safeParseParams] decode失敗', e);
      }
      
      if (!params[key]) {
        params[key] = value;
      }
    });
  }
  
  return params;
}
// 関数宣言はそのままでもglobalに出るが、念のため明示
globalThis.safeParseParams = safeParseParams;

/* ===================== 全角→半角変換 ===================== */
function convertFullToHalf(str) {
  if (!str) return '';
  return str
    .replace(/[\uFF01-\uFF5E]/g, s =>
      String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    )
    .replace(/\u3000/g, ' ');
}
globalThis.convertFullToHalf = convertFullToHalf;

/* ===================== 非同期待機ヘルパー ===================== */
function waitForId(id, tries = 40, intervalMs = 50) {
  return new Promise(resolve => {
    let i = 0;
    (function loop() {
      if (document.getElementById(id)) return resolve(true);
      if (++i >= tries) return resolve(false);
      setTimeout(loop, intervalMs);
    })();
  });
}
globalThis.waitForId = waitForId;

// デバッグログ（読み込まれたことがわかるように）
console.log('[bazi-utils] loaded and exported to globalThis');

- utils系をapp.jsから分離する
- constantsはbazi-constants.jsに集約
- 次：render系(レーダー、陰陽パイ)をbazi-render.jsへ？

## 📊 **最終的なファイル構成案**
```
bazi-constants.js  ← 定数・定義のみ（関数は kyuseiSimpleByYear, splitTgLabel のみ残す）
bazi-logic.js      ← 計算・判定ロジック（重複削除後）
bazi-render.js     ← DOM生成・描画全般（重複をここに集約）
bazi-utils.js      ← URL解析・汎用ヘルパー（描画系を削除）
bazi-luck.js       ← NEW: 大運・年運専用（app.jsから移動）
app.js             ← メイン実行・データフロー制御のみ

bazi-constants.js
   定数・基本定義干支、五行、ZANG、YOJIN、十二運星テーブル
bazi-logic.js
   計算・判定ロジック身強弱、格局、透干、十神、十二運星の判定
bazi-utils.js
   汎用ヘルパーURL解析、DOM操作、全角→半角変換
bazi-render.js
   描画全般テーブル、バッジ、レーダー、パイ、命式表
bazi-luck.js 
   (NEW)大運・年運専用renderDaiunTable, renderLiunianTable
app.js
   メインフロー制御データ取得→計算実行→描画呼び出し
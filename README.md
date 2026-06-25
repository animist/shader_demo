# スマホ向け Shader デモ集

スマートフォンのブラウザ向け、Shader を活用したビジュアルデモの実験集。
ジャイロ操作・解像度スケーリング・precision ガード・計測HUD・調整UIを共通基盤に持つ。

→ 方向性の全体プランは [shader-demo-plan.html](shader-demo-plan.html)（ブラウザで開く）

## 構成

```
index.html   ← 一覧（カタログ）。demos.js を読んでカードを自動生成
engine.js    ← 共通基盤（描画ループ / ジャイロ / 解像度スケーリング / precisionガード /
               計測HUD / エラー画面表示 / paramPanel 調整UI / singlePass ヘルパ）
demos.js     ← 全デモの定義（単一の真実）。追加・並べ替えはこの配列を編集するだけ
demos/
  ink.html                 有機的にうねる流れ場（確定路線）
  ink-smooth.html          ↑の格子低減版（quintic+回転+hash改良）
  kaleidoscope.html        万華鏡クリスタル（幾何・対称）
  kaleidoscope-color.html  万華鏡＋色も傾き連動
  reaction-diffusion.html  生命の模様（Gray-Scott 反応拡散・成長する）
  tunnel.html              トンネル飛行（没入・奥行き）
  caustics.html            水中コースティクス（光・透明）
  glitch.html              デジタル・グリッチ（合成・サイバー）
  particles.html           星の砂 / 流れ場の粒子（点が主役）
```

## 各デモ共通の操作

- 「タップして開始」→（iOSは）ジャイロ許可 → 端末を傾けると反応
- 左上HUD：FPS / 実バッファ解像度 / dpr / 傾き角
- 下部ボタン：30fps上限・解像度スケール（100/75/50%）
- 右上「⚙」：パラメータ調整（スライダー／カラー）。**値はURLハッシュに自動保存**され、
  ブックマーク／共有でその見栄えを再現できる
- 「← 一覧」で index へ戻る

## 動かす（ローカル）

ES module を CDN から読むため、ローカルサーバ経由で開く。

```bash
python -m http.server 8000   # もしくは: npx serve .
```

ブラウザで `http://localhost:8000/` を開く（ルート＝一覧）。

## スマホ実機でテスト（ジャイロは HTTPS 必須）

iOS Safari のジャイロは HTTPS でのみ動作する。トンネルかホスティングで HTTPS を用意する。

```bash
cloudflared tunnel --url http://localhost:8000     # 一時HTTPS URL（落ちると変わる）
# または npx localtunnel --port 8000
```

長期運用は GitHub Pages / Netlify 等に静的配置すると URL 固定で安定。

## デモを追加するには

1. `demos/<name>.html` を作成（`import { mount, singlePass } from '../engine.js'` など）
2. `demos.js` の `DEMOS` 配列に1行追加（file / title / cat / desc / thumb）

一覧は自動で反映される。

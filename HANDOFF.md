# HANDOFF — スマホ向け Shader デモ集

このリポジトリの作業を別セッション／別環境（例：Claude デスクトップアプリ）で引き継ぐためのメモ。
まず [README.md](README.md) と [learn.html](learn.html) も参照。

## これは何か
スマートフォンのブラウザ向け Shader ビジュアルデモ集（自己表現・実験＋学習教材）。
共通基盤 `engine.js` の上に、各デモが薄く乗る構成。全デモに ⚙ パラメータUI（値はURLに保存）。

- **本番公開**: https://hikikomo.ru/shader_demo/
- **デモ用リポジトリ**: https://github.com/animist/shader_demo （public, ブランチ **main**）
- **配信元サイト**: animist/animist.github.com（GitHub Pages, ブランチ **master**）の
  **submodule** として `shader_demo/` に組み込み済み。ローカル clone は `C:\animist.github.com`。

## デプロイ手順（重要・2ステップ）
1. **デモ側**（このリポジトリ）で編集 → commit → `git push`
2. **サイト側**でサブモジュールのポインタを更新：
   ```
   git -C C:\animist.github.com submodule update --remote shader_demo
   git -C C:\animist.github.com commit -aq -m "Update shader_demo: ..."
   git -C C:\animist.github.com push
   ```
   ※②のポインタ更新を忘れると Pages に反映されない（定番の罠）。
   ※Pages ビルドは反映まで1〜数分かかることがある（curl でポーリング確認）。

## 構成
```
index.html   一覧（demos.js から自動生成）＋ 学習ノートへのリンク
engine.js    共通基盤: mount() / singlePass() / paramPanel() / 解像度スケーリング /
             ジャイロ / precisionガード / 計測HUD / エラー画面表示 / hexToRGBArr
demos.js     全デモ定義（単一の真実）。追加・並べ替えはこの配列を編集
note.css     学習ノート3ページの共通スタイル
learn.html / glsl-intro.html / walkthrough.html  学習ノート3部作
demos/       各デモ（下記）
```

### デモ一覧（demos/）
- `ink` 有機インク（domain-warp ノイズ） / `ink-smooth` 格子低減版（quintic+回転+iq hash）
- `kaleidoscope` 万華鏡（極座標＋対称） / `kaleidoscope-color` 色も傾き連動（累積位相）
- `reaction-diffusion` 反応拡散（Gray-Scott, 多パス, half-float, 種まきで枯渇防止）
- `tunnel` トンネル（1/r 奥行き, 角度を周期化して継ぎ目解消, uHoleで黒丸径）
- `caustics` 水中コースティクス / `caustics-creature` 泳ぐ生き物（caustic関数化→座標ずらし再サンプル＝屈折, JSのuPos/uVel駆動）
- `glitch` 手続きグリッチ / `glitch-camera` カメラ実映像を歪ませる(getUserMedia) / `glitch-youtube` YouTube背景＋screen合成（映像自体は加工不可・動画ID可変）
- `particles` 流れ場の粒子（頂点でcurl風flow計算, 加算合成）
- `branch-tree` 再帰分岐ツリー（JS生成→Quad太線, 先細り/左右非対称/世代グラデ/原点XY, Line⇄Quad切替）
- `breakout` ゲーム（SDF描画＋JSロジック＋ブロック状態はデータテクスチャ）

## デモの追加手順
1. `demos/<name>.html` を作成。`import { mount, singlePass } from '../engine.js'`（単パス）か、
   `import { mount, paramPanel, PRECISION, Program, Mesh, ... } from '../engine.js'`（カスタム）。
2. `demos.js` の `DEMOS` 配列に1行追加（file / title / cat / desc / thumb）。
3. デプロイ手順（上記2ステップ）。

## 規約・ハマりどころ（engine 特有）
- **`mount()` は `document.body.innerHTML` を作り直す** → デモ独自のDOM（スコア表示等）は
  HTMLに直書きせず **init 内で `document.createElement` して append** する（Breakoutで踏んだ）。
- **paramPanel**: `{key, uniform, label, type:'range'|'color'|'text'|'button', min,max,step,value}`。
  `uniform` を持つ range/color は自動で uniform へ流し込み。JS制御の値は onChange で自前処理。
- 値は URL ハッシュに自動保存（良い見た目はブックマーク可）。
- 単パスシェーダは `PRECISION` が自動で前置される（precisionガード）。

## モバイル/GLSL の教訓（再発防止）
- `gl_` で始まる変数名は **予約語** → 使うとコンパイル失敗＝**黒画面**（`gl_line`で踏んだ）。
- `sin` ベースの hash はモバイルで破綻 → `fract(p*vec2(123.34,345.45))...` 系を使う。
- `smoothstep(e0,e1,x)` は **e0 < e1** 厳守（逆順は未定義）。
- `mediump` はオーバーフローしやすい。時間シードは `mod(..., N)` で有界化。
- 線幅（`GL_LINES`）はモバイルで1px固定 → 太さが要るなら **Quad描画**に。
- 反応拡散のラプラシアン係数は標準値（0.2/0.05/-1）。強すぎると“凍る”。half-float精度で
  mitosis等は枯れやすい → 低レートの自動種まきで延命。
- iOSジャイロは **HTTPS＋ユーザー操作起点**で `DeviceOrientationEvent.requestPermission()`。
- **PCで動いてもモバイルで壊れる**ことがある → 実機確認必須。engine の画面エラー表示が助けになる。

## 環境メモ（この作業マシン）
- Claude Code Remote：シェルは接続先マシンで動く。
- `gh` は PATH 未登録 → フルパス `"C:\Program Files\GitHub CLI\gh.exe"`。animist で認証済み（repoスコープ, ssh鍵は無く `gh auth setup-git`+HTTPSでpush）。
- git identity: Rei Kawai / leicay@gmail.com。
- 全パス相対設計なのでサブパス配信（/shader_demo/）でそのまま動く。外部依存は OGL の CDN のみ。

## 次の候補（未着手アイデア）
- caustics-creature：群れで泳ぐ / 自律遊泳（追わず勝手に泳ぐ）/ 泡が立ち上る
- 反応拡散ベースの目的付きゲーム、落ち砂サンドボックス（タップで砂・傾きで重力）
- 学習ノート新章：「GLSLを書き始める第一歩（Shadertoy/ローカル）」「リソース集（IQ, The Book of Shaders 等）」
- 実機での fps/発熱の体系的計測

---
最終更新の起点コミットは `git log` 参照。引き継ぎ後は本ファイルも適宜更新のこと。

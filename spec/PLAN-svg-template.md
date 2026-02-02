# SVGテンプレート化 仕様・設計書（v0.1 Draft）

## 0. 目的

現場と合意済みの **PDF（Excel→PDF）** を起点に、システム部門が **PDF→SVG** へ変換し、GUI操作により **SVGを帳票テンプレートとして意味付け**する。

本ドキュメントは、テンプレート化工程の
- 入力/出力
- データモデル（template.json）
- SVG側の規約（id付与、row-template）
- GUI操作要件
- 運用（合意・版管理）
を定義する。

---

## 1. スコープ（v0.1）

### 1.1 対応する
- 1ページ=1SVG のテンプレート化
- 1枚目/2枚目以降のページ種別（first/repeat）
- meta（kv）フィールドの差し込み定義
- items（table）明細の行テンプレ複製（固定行高）
- rows_per_page によるページ割
- text fit: shrink（枠内に縮小して収める）
- align: left/center/right
- format: raw/date/number/yen（最小）

### 1.2 対応しない（将来）
- 行高可変（wrapで行が伸びる等）
- 小計/合計のページ跨ぎ最適化
- 複数tableの同時ページング整合
- assets（画像差し替え）正式仕様
- 自動レイアウト最適化（職人調整の自動化）

---

## 2. 役割分担（RACI）

- 現場：
  - Excelレイアウト作成、PDF出力、出力結果の合意
- システム部門：
  - PDF→SVG変換、SVG正規化、テンプレ化（GUI）、テンプレの版管理
- 帳票システム：
  - テンプレ検証、データ流し込み、HTML生成、印刷/（将来PDF）

---

## 3. 入力/出力（テンプレート化工程）

### 3.1 入力
- agreed.pdf（合意済PDF）
- テンプレ候補情報（任意）
  - template_id（例：invoice）
  - version（例：v2）
  - ページ種別マッピング（どのページが first / repeat か）

### 3.2 中間成果物
- raw SVG（機械変換直後）
  - raw/page-1.svg, raw/page-2.svg, ...
- normalized SVG（正規化後）
  - normalized/page-1.svg, ...

### 3.3 出力（テンプレパッケージ）
```
templates/<template_id>/<version>/
  page-1.svg
  page-follow.svg
  template.json
  README.md（任意：運用メモ）
```

---

## 4. PDF→SVG変換仕様（v0.1）

### 4.1 変換要件
- 1ページ=1SVG に分割して生成できること
- viewBox/width/height を保持し、後工程で mm基準に統一可能なこと
- 罫線/枠/文字が可能な限りベクタで出力されること

### 4.2 推奨ツール
- pdf2svg（第一候補）
- Inkscape CLI（代替）

### 4.3 変換品質の許容
- text が path 化されても v0.1 では許容（ただし差し込み対象は後で text 化が必要）
- defs/clipPath が冗長でも許容（正規化で整理）

---

## 5. SVG正規化仕様（v0.1）

### 5.1 目的
- GUIテンプレ化が破綻しない構造に整える
- 差し込み対象の特定を容易にする
- ページサイズ/座標系を一定にする

### 5.2 正規化の必須処理（MVP）
1) ページサイズ統一
   - width/height/viewBox を正規化（A4/A3の mm と整合）
2) transform の削減
   - グループに付いた transform を可能な範囲で flatten（完全でなくてよい）
3) 不要要素の整理
   - 空の <g>、未参照 defs 等を安全に除去（攻めすぎない）
4) 差し込み候補の抽出補助
   - <text> を一覧化（GUIに渡す）
   - path化テキストが多い場合の警告

### 5.3 正規化の禁止事項
- 形状の見た目が変わる最適化（座標丸め、path結合など）
- 勝手なフォント差し替え（テンプレ化の責務）

---

## 6. SVGテンプレ規約（v0.1）

### 6.1 大原則
- SVGの「意味付け」は **template.json** に集約する
- SVG側に埋め込むのは **参照のための id** のみ
- 1ページ=1SVG

### 6.2 id命名ルール
- 参照対象は必ず id を持つ
- id はテンプレ内で一意
- 文字種：
  - 推奨: `[a-zA-Z0-9_-]`（ASCII）
  - 禁止: 空白、全角、`:`（xpath/namespace絡みの事故回避）
- 命名は “役割ベース”：
  - meta: `customer_name`, `issue_date`, `invoice_no`
  - page number: `page_no`
  - table row group: `row-template`
  - table cells: `item_name`, `item_price`, `item_qty`

### 6.3 差し込み対象要素
- 原則 `<text>` を差し込み対象とする
- `<text>` 内に `<tspan>` がある場合：
  - v0.1 では 1つの文字列として上書き（複雑な装飾は対象外）

---

## 7. 明細（table）テンプレ仕様

### 7.1 row-template（必須）
- 明細1行を表す `<g>` を用意し、id を `row-template` とする
- row-template 内にセル要素（text）を配置し、それぞれ id を持つ

例：
```xml
<g id="row-template">
  <text id="item_name">商品名</text>
  <text id="item_price">999,999</text>
  <text id="item_qty">99</text>
</g>
```

### 7.2 row_height_mm（必須）
- テーブルは「固定行高」を前提
- 行のY方向のピッチを mm で指定（template.json）

### 7.3 rows_per_page（必須）
- ページごとに表示可能行数を明示
- first と repeat で変えてよい

---

## 8. ページ種別（first/repeat）仕様

### 8.1 構成
- 1枚目ページ：`kind=first`（フルヘッダ等）
- 2枚目以降：`kind=repeat`（簡易ヘッダ等）

### 8.2 SVGファイルの割当
- kind ごとに SVG を指定
- repeat は “同一SVGの繰り返し” とする

---

## 9. バインディング仕様（template.json）

### 9.1 フィールド（meta）バインディング
- svg_id（SVG要素id）
- source（manifest.inputs のキー。通常 meta）
- key（meta.csv の key）
- fit/align/format（任意）

例：
```json
{ "svg_id": "customer_name", "source": "meta", "key": "customer.name", "fit": "shrink" }
```

### 9.2 テーブル（items）バインディング
- source（items等）
- row_group_id（row-template）
- row_height_mm
- rows_per_page
- cells（svg_id → column の対応）

例：
```json
{
  "source": "items",
  "row_group_id": "row-template",
  "row_height_mm": 6.0,
  "rows_per_page": 10,
  "cells": [
    { "svg_id": "item_name", "column": "name", "fit": "shrink" },
    { "svg_id": "item_price", "column": "price", "align": "right", "format": "yen" }
  ]
}
```

### 9.3 ページ番号
- svg_id（ページ番号を出す text の id）
- format（{current}/{total} 等）

---

## 10. GUI（テンプレート化エディタ）要件（v0.1）

### 10.1 目的
- PDF→SVG後の「汚いSVG」を、作業標準に沿ってテンプレ化できる
- 現場確認のためのプレビュー（ダミーデータ流し込み）を提供する

### 10.2 画面構成（最小）
1) Canvas（SVG表示）
2) Element Inspector（選択要素の属性・id編集）
3) Binding Panel（meta/table の割当）
4) Preview（ダミーCSVまたはサンプル入力でレンダリング結果表示）

### 10.3 必須機能
- SVG読み込み（page-1 / page-follow の選択）
- クリックで要素選択（textを優先）
- id付与・編集（重複チェック）
- metaフィールド割当
  - source=meta、key入力（候補一覧を出せると良い）
  - fit/align/format設定
- table定義
  - row-template の選択（矩形選択やクリックでgを指定）
  - row_height_mm / rows_per_page の入力
  - row-template内のセルを選択して column を割当
- プレビュー生成
  - ダミーmeta/itemsを生成して確認
  - 印刷プレビュー相当の表示（背景/影は任意）

### 10.4 便利機能（任意）
- <text> 一覧から選択（小さい文字のクリック困難対策）
- 候補の自動id付与（text内容や位置から仮名を生成）
- row-template の複製プレビュー（指定行数分を仮描画）

---

## 11. 合意プロセス（重要）

### 11.1 合意対象
- SVG/XMLは合意対象にしない
- 合意対象は「レンダリング結果」と「印刷結果」

### 11.2 手順
1) ダミーデータ（meta.csv/items.csv）でプレビュー
2) 現場レビュー（画面 + 印刷プレビュー）
3) 合意後、テンプレ version を確定し immutable とする

---

## 12. 版管理ポリシー（テンプレ）

- テンプレは immutable（修正＝新version）
- PDFが更新された場合は原則テンプレも新version
- template.json と SVG の整合は CI で検証（schema validation + 参照id存在確認）

---

## 13. 検証（CI/自動チェック）項目（推奨）

### 13.1 template.json 検証
- JSON Schema 準拠
- pages.kind の first が1つ以上ある
- repeat がある場合、kind=repeat が1つ以上ある

### 13.2 SVG参照整合
- fields[].svg_id が SVG内に存在
- tables[].row_group_id が SVG内に存在
- tables[].cells[].svg_id が row_group_id 配下に存在（推奨）
- page_number.svg_id が SVG内に存在（指定がある場合）

### 13.3 入力整合（サンプル）
- meta.csv が key,value 形式
- items.csv に必要列が存在

---

## 14. 付録：テンプレパッケージ最小例

```
templates/invoice/v2/
  page-1.svg
  page-follow.svg
  template.json
```

- page-1.svg：フルヘッダ、row-template（10行分）
- page-follow.svg：簡易ヘッダ、row-template（15行分）

---

## 15. 未決事項（v0.2候補）
- assets/ の仕様（logo差し替え、バーコード等）
- wrap/clip の確定仕様とテキスト計測戦略
- 複数table（items + payments 等）のページング整合
- サーバPDF化（Headless Chrome）運用標準


# SVG帳票生成ツール 仕様・設計書（v0.1 Draft）

## 0. 目的と前提

### 目的
- 現場が合意した **Excel→PDF** を起点に、システム部門が **PDF→SVGテンプレ化**し、
  n8n が生成する **複数CSV**（メタデータ/表示データ）を流し込み、
  ブラウザ発行またはサーバ自動発行で **PDF/印刷**を生成できるツールを提供する。

### 前提（責務分離）
- 現場：ExcelレイアウトとPDF出力（合意成果物）
- システム部門：PDF→SVGテンプレ化、テンプレの版管理、プレビュー合意
- n8n：業務データ抽出・変換（E/T）、帳票入力セット（CSV群+manifest）生成
- 帳票エンジン：L（読み込み）+テンプレ適用+出力（HTML/印刷/PDF）

---

## 1. 全体フロー（運用）

1) 現場：Excelで帳票を作成し、印刷設定を固定したPDFを提出（合意済）
2) システム部門：PDFをSVG化し、SVGテンプレ化（GUIで意味付け）
3) n8n：帳票入力セット（zip）を生成（meta=kv、items=table、複数CSV対応）
4) 実行：現場ユーザーがブラウザで発行 / もしくはサーバ自動発行（トリガー）

---

## 2. PDF受入チェックリスト（入口ゲート）

### 2.1 現場側の作法（提出PDF要件）
- [ ] 用紙サイズが明確（A4/A3、縦横）
- [ ] 余白・印刷倍率固定（100% / 「ページに合わせる」禁止）
- [ ] フォントが社内標準または汎用フォント
- [ ] 罫線が線要素として出力される（画像貼付け・スクショ貼付け禁止）
- [ ] 1帳票のページ数が確定

### 2.2 システム側の可否判定（変換後SVGの状態）
- [ ] SVGのページサイズが一致（width/height/viewBoxが想定通り）
- [ ] 主要文字が text 要素として残る（path化が致命的でない）
- [ ] 主要罫線が path/line/rect として残る（画像化されていない）
- [ ] 固定文言/可変項目の境界が目視で追える
- [ ] 明細領域は「固定行高 + 行数上限」で表現可能（v0.1）

判定：
- ✅ Pass：テンプレ化へ
- ⚠️ Conditional：出力条件調整を依頼（フォント/印刷設定/罫線）
- ❌ Fail：Excel→PDFの出し方を修正して再提出

---

## 3. 入力セット仕様（n8n→帳票エンジン）

### 3.1 入力形式
- 1ジョブ = 1zip
- zip内に `manifest.json` と複数CSVを含める

推奨構成：
- manifest.json（必須）
- meta.csv（必須：kv）
- items.csv（必須：table）
- 任意追加CSV（payments.csv 等）
- assets/（任意：v0.2以降でも可）

例：
```
job.zip
  manifest.json
  meta.csv
  items.csv
  payments.csv
  assets/
    logo.png
```

### 3.2 manifest.json（svgreport-job/v0.1）
- データソース名（meta/items/payments…）を宣言する契約
- CSVファイル名は manifest が参照するため任意

#### 最小例
```json
{
  "schema": "svgreport-job/v0.1",
  "job_id": "2026-02-02T10:00:00+09:00__INV-0001",
  "template": { "id": "invoice", "version": "2" },
  "encoding": "utf-8",
  "locale": "ja-JP",
  "inputs": {
    "meta":  { "type": "csv", "path": "meta.csv",  "kind": "kv" },
    "items": { "type": "csv", "path": "items.csv", "kind": "table" }
  }
}
```

### 3.3 meta.csv（kind=kv）
- 先頭行は固定：`key,value`
- 1行=1項目（項目追加に強い）
- keyはドット区切り可（階層表現）
- valueは文字列（数値/日付も文字列でOK。表示整形はテンプレ側）

例：
```csv
key,value
customer.name,株式会社サンプル
customer.address,東京都新宿区...
issue_date,2026-02-02
invoice_no,INV-0001
total_amount,123456
```

### 3.4 items.csv（kind=table）
- 先頭行は列名（header）
- 1行=1明細
- 行数は可変（ページ割はテンプレが規定）

例：
```csv
name,price,qty
商品A,100,2
商品B,200,1
```

### 3.5 文字コード等（v0.1）
- encoding：UTF-8（固定）
- delimiter：`,`（固定）
- quote：`"`（固定）
- 改行：LF推奨（CRLFも許容）
- 日付：ISO `YYYY-MM-DD` 推奨（n8n側で統一）
- 金額/数値：値は生、表示はテンプレ側format

---

## 4. テンプレ仕様（SVG + template.json）

### 4.1 テンプレ構成
- `templates/<template_id>/<version>/` に配置
- 1 SVG = 1ページ
- 1枚目と2枚目以降の差分は別SVGで吸収

例：
```
templates/invoice/v2/
  page-1.svg
  page-follow.svg
  template.json
```

### 4.2 template.json（svgreport-template/v0.1）
- ページ割
- 明細テーブルの繰り返し（row-template複製）
- フィールド割当（meta等）
- ページ番号

最小例：
```json
{
  "schema": "svgreport-template/v0.1",
  "template": { "id": "invoice", "version": "2" },
  "pages": [
    {
      "id": "first",
      "svg": "page-1.svg",
      "kind": "first",
      "tables": [
        {
          "source": "items",
          "row_group_id": "row-template",
          "row_height_mm": 6.0,
          "rows_per_page": 10,
          "cells": [
            { "svg_id": "item_name",  "column": "name",  "fit": "shrink" },
            { "svg_id": "item_price", "column": "price", "align": "right", "format": "yen" },
            { "svg_id": "item_qty",   "column": "qty",   "align": "right" }
          ]
        }
      ],
      "page_number": { "svg_id": "page_no", "format": "{current}/{total}" }
    },
    {
      "id": "follow",
      "svg": "page-follow.svg",
      "kind": "repeat",
      "tables": [
        {
          "source": "items",
          "row_group_id": "row-template",
          "row_height_mm": 6.0,
          "rows_per_page": 15,
          "cells": [
            { "svg_id": "item_name",  "column": "name",  "fit": "shrink" },
            { "svg_id": "item_price", "column": "price", "align": "right", "format": "yen" },
            { "svg_id": "item_qty",   "column": "qty",   "align": "right" }
          ]
        }
      ],
      "page_number": { "svg_id": "page_no", "format": "{current}/{total}" }
    }
  ],
  "fields": [
    { "svg_id": "customer_name", "source": "meta", "key": "customer.name", "fit": "shrink" },
    { "svg_id": "issue_date",    "source": "meta", "key": "issue_date",    "format": "date" },
    { "svg_id": "invoice_no",    "source": "meta", "key": "invoice_no" }
  ]
}
```

---

## 5. SVGテンプレ規約（v0.1）

### 5.1 大原則
- SVGに意味（key/column）を埋め込まない（template.jsonに集約）
- SVG要素は **id** で参照できること
- 明細の繰り返しは `<g id="row-template">` を複製して実現

### 5.2 必須ルール
1) 明細1行を表す `<g>` に固定idを付与：`row-template`
2) row-template内の差し込み対象要素に必ずidを付与（例：item_name等）
3) 差し込み対象は原則 `<text>`（path化は正規化工程でtextに置換）

### 5.3 row-template SVG例
```xml
<g id="row-template">
  <text id="item_name">商品名</text>
  <text id="item_price">999,999</text>
  <text id="item_qty">99</text>
</g>
```

### 5.4 2枚目以降の帳票差分
- 2枚目以降専用SVG（例：page-follow.svg）を用意し吸収
- rows_per_page をページ種別で変えられる

---

## 6. レンダリング仕様（v0.1：ページ割とデータ流し込み）

### 6.1 ページ割アルゴリズム（items可変）
- items（table）を rows_per_page でchunk分割
- 1chunk目 → kind=first のページを使用
- 2chunk目以降 → kind=repeat のページを繰り返し使用
- total pages は chunk 数で決定

擬似コード：
```text
chunks = chunk(items, rows_per_page_of_page_kind)
for i, chunk in chunks:
  page_svg = (i==0) ? first.svg : follow.svg
  render_page(page_svg, meta, chunk, page_no=i+1, total=len(chunks))
```

※ v0.1では「1つのtableBinding（items）」を前提とする（将来拡張で複数tableBindingの整合を扱う）

### 6.2 文字フィット（v0.1）
- `fit=shrink`：枠幅に収まるよう縮小（拡大はしない）
- `fit=wrap`：将来拡張（v0.1では非対応でも可）
- align：left/center/right（text-anchor等で実現）

### 6.3 出力形態（v0.1）
- ブラウザ発行：SVG→HTML埋込→印刷
- サーバ自動発行：HTML→Headless Chrome等でPDF化（v0.2以降の優先機能）

---

## 7. PDF→SVGテンプレ化 手順（標準作業）

### Step 1: PDF→SVG機械変換
- ページごとにSVGを生成（1ページ=1SVG）
- 出力を raw/ に保存

### Step 2: SVG正規化（半自動/自動）
- viewBox/width/height を mm基準に統一
- transformを可能な範囲でflatten
- テキストがpath化されている場合はtext化を検討（必要箇所のみ）
- 明細領域の `<g id="row-template">` 抽出（GUIでも可）

### Step 3: テンプレ化（GUIでid付与とマッピング）
- text要素に svg_id（id）を付与
- template.json の fields と tables.cells を作成

### Step 4: プレビュー合意
- ダミー `meta.csv` `items.csv` を用意し流し込み
- ブラウザ表示と印刷結果で現場確認（SVG/XMLを見せない）

---

## 8. 版管理ポリシー（重要）

- SVGテンプレは immutable（修正＝新バージョン）
- template.json も同様に version up
- CSV schema（meta keys / items columns）の変更はテンプレversionと連動
- 現場PDFが変わったらテンプレも新バージョン（既存は残す）

---

## 9. スコープ（v0.1 MVP）

### 対応
- meta(kv) + items(table) の複数入力
- items行数可変による2枚目以降の帳票切替
- 固定行高 + rows_per_page によるページ割
- フィールド差し込み（meta）
- 明細差し込み（items）
- ブラウザ印刷

### 非対応（将来）
- 行高可変（折返しで行が伸びる等）
- 小計/合計のページ跨ぎ最適化
- 複数tableの整合的ページ割（複数明細の同時ページング）
- assets差し替えの正式仕様（logo等）
- サーバ自動PDFの運用標準（v0.2）

---


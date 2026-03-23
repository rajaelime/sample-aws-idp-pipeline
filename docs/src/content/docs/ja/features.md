---
title: "主要機能"
description: "Sample AWS IDP Pipeline 主要機能紹介"
---

## 1. Getting Started

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/1.Getting+Started.mp4" type="video/mp4" />
</video>

### Login

Amazon Cognitoでサインインします。チャットセッションとアーティファクトはユーザーごとに管理されます。

### Create Project -- Where It Begins

プロジェクトを作成し、言語と分析方向を設定します。すべての文書と結果はプロジェクト単位で管理されます。

---

## 2. Document Analysis

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/2.Document+Analysis.mp4" type="video/mp4" />
</video>

### Upload Documents -- Multiple Formats

文書をアップロードし、BDA、OCR、Transcribeなどの分析オプションを設定します。分析言語も選択できます。

| ファイルタイプ | 対応フォーマット | 前処理 |
|---------------|-----------------|--------|
| 文書 | PDF, DOCX, DOC, TXT, MD | PaddleOCR + BDA（オプション）+ PDFテキスト抽出 |
| 画像 | PNG, JPG, JPEG, GIF, TIFF, WebP | PaddleOCR + BDA（オプション） |
| プレゼンテーション | PPTX, PPT | PaddleOCR + BDA（オプション） |
| 映像 | MP4, MOV, AVI, MKV, WebM | AWS Transcribe + BDA（オプション） |
| 音声 | MP3, WAV, FLAC, M4A | AWS Transcribe |
| CAD | DXF | PaddleOCR |
| ウェブ | .webreq（URLクローリング） | Web Crawler Agent |

> ファイルタイプ別前処理フローの詳細は[Preprocessing Pipeline](./preprocessing.md)を参照してください。

### Intelligent Processing -- Analysis Pipeline

文書分析が自動的に実行されます。WebSocket通知を通じてリアルタイムで進行状況を追跡します。

```
文書アップロード
  -> 前処理（OCR、BDA、Transcribe）
    -> セグメント分割
      -> Distributed Map（最大30同時実行）
        -> ReAct Agent分析（セグメントごと）
          -> ベクトル埋め込み -> LanceDB保存
      -> 文書要約生成
```

> 詳細な分析フローは[AI Analysis Pipeline](./analysis.md)を参照してください。

### Deep Analysis -- ReAct Agent

AI Agentが各セグメントを反復的に質問・回答しながら分析します。画像、表、ダイアグラムを視覚的に理解します。BDA、OCR、Parser、Transcribe、AI分析など、各処理ステップの結果を個別に確認します。

### Video & Audio Analysis -- Multimodal Processing

Transcribeが音声をテキストに変換し、AIがタイムコード付きで視覚的コンテンツを分析します。各映像のTranscribe結果とAI分析を確認し、タイムコードでセグメントをナビゲートします。

### Web Crawling -- Collect Data from URLs

URLと指示を入力すると、AIがウェブページをナビゲートし、自動的にコンテンツを分析パイプラインに収集します。訪問した各サイトは、抽出されたコンテンツとAI分析結果とともに個別ページに整理されます。

---

## 3. Knowledge Discovery

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/3.Knowledge+Discovery.mp4" type="video/mp4" />
</video>

### Knowledge Graph -- Entity Relationships

分析された文書から抽出されたエンティティが自動的にリンクされます。グラフを探索して文書間の隠れた関係を発見します。

### Tag Cloud -- Keywords at a Glance

エンティティの頻度と重要度を可視化します。文書の内容を一目で把握します。

---

## 4. AI Interaction

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/4.AI+Interaction.mp4" type="video/mp4" />
</video>

### AI Chat -- Hybrid Search & Graph Traversal

質問が与えられると、エージェントはまずSkillsを読み、検索と実行のガイドラインを把握します。Skillsに従い、ベクトル類似度とキーワードマッチングを組み合わせたハイブリッド検索を実行した後、ナレッジグラフを通じて接続されたページを見つけ、追加コンテキストを収集して回答を生成します。レスポンスから参照された文書、グラフ結果、ツール実行の詳細を確認します。

### Create Artifacts -- Document Generation

エージェントがアーティファクト作成のためのSkillsを読み、分析済みデータから必要なコンテンツを検索します。ガイドラインに従い、PDF、Word文書、Excelスプレッドシート、チャート、ダイアグラムを生成します。生成されたアーティファクトは右側のArtifactsパネルでプレビューしてダウンロードします。

### Define Agents -- Custom AI Configuration

プロジェクトに合わせた専門AIエージェントを定義します。例えば、財務アナリスト、法務レビュアーなど。カスタムエージェントを選択して質問すると、専門的な役割と指示に基づいて応答します。

### Refine & Enhance -- Targeted Reanalysis

特定のセグメントに指示を追加して再実行したり、オリジナルを上書きせずに新しい分析を追加できます。オリジナルの結果を補完するために、新しい質問や分析エントリを手動で追加します。

---

## 5. Voice Agent

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/5.Voice+Agent.mp4" type="video/mp4" />
</video>

### Voice Agent -- Real-Time Conversation

自然に話しかけて検索、分析、ツール呼び出しを実行します。低レイテンシストリーミングのAmazon Nova Sonicで駆動されます。ユーザーが音声で質問すると、エージェントが文書を検索してリアルタイムで応答します。

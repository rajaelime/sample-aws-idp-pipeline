---
title: "Features"
description: "Sample AWS IDP Pipeline Key Features"
---

## 1. Getting Started

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/1.Getting+Started.mp4" type="video/mp4" />
</video>

### Login

Sign in with Amazon Cognito. Chat sessions and artifacts are managed per user.

### Create Project -- Where It Begins

Create a project and configure language and analysis direction. All documents and results are managed at the project level.

---

## 2. Document Analysis

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/2.Document+Analysis.mp4" type="video/mp4" />
</video>

### Upload Documents -- Multiple Formats

Upload documents and configure analysis options such as BDA, OCR, and Transcribe. You can also select the language for analysis.

| File Type | Supported Formats | Preprocessing |
|-----------|-------------------|---------------|
| Documents | PDF, DOCX, DOC, TXT, MD | PaddleOCR + BDA (optional) + PDF text extraction |
| Images | PNG, JPG, JPEG, GIF, TIFF, WebP | PaddleOCR + BDA (optional) |
| Presentations | PPTX, PPT | PaddleOCR + BDA (optional) |
| Videos | MP4, MOV, AVI, MKV, WebM | AWS Transcribe + BDA (optional) |
| Audio | MP3, WAV, FLAC, M4A | AWS Transcribe |
| CAD | DXF | PaddleOCR |
| Web | .webreq (URL crawling) | Web Crawler Agent |

> For detailed preprocessing flows by file type, see [Preprocessing Pipeline](./preprocessing.md).

### Intelligent Processing -- Analysis Pipeline

Document analysis runs automatically. Track progress in real time through WebSocket notifications.

```
Document Upload
  -> Preprocessing (OCR, BDA, Transcribe)
    -> Segment Splitting
      -> Distributed Map (max 30 concurrency)
        -> ReAct Agent Analysis (per segment)
          -> Vector Embedding -> LanceDB Storage
      -> Document Summary Generation
```

> For detailed analysis flow, see [AI Analysis Pipeline](./analysis.md).

### Deep Analysis -- ReAct Agent

The AI Agent iteratively questions and answers to analyze each segment. It visually understands images, tables, and diagrams. Review results from each processing step individually: BDA, OCR, Parser, Transcribe, and AI analysis.

### Video & Audio Analysis -- Multimodal Processing

Transcribe converts speech to text, and AI analyzes visual content with timecodes. View Transcribe results and AI analysis for each video, and navigate through segments with timecodes.

### Web Crawling -- Collect Data from URLs

Enter a URL and instructions, and the AI navigates the web page, automatically collecting content into the analysis pipeline. Each visited site is organized into its own page with extracted content and AI analysis results.

---

## 3. Knowledge Discovery

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/3.Knowledge+Discovery.mp4" type="video/mp4" />
</video>

### Knowledge Graph -- Entity Relationships

Entities extracted from analyzed documents are automatically linked. Explore the graph to discover hidden relationships across documents.

### Tag Cloud -- Keywords at a Glance

Visualizes entity frequency and importance. Instantly grasp what a document is about.

---

## 4. AI Interaction

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/4.AI+Interaction.mp4" type="video/mp4" />
</video>

### AI Chat -- Hybrid Search & Graph Traversal

When a question is asked, the agent first reads the Skills to understand the guidelines for search and execution. Following the Skills, it performs a hybrid search combining vector similarity and keyword matching, then finds connected pages through the knowledge graph to gather additional context. Review referenced documents, graph results, and tool execution details from the response.

### Create Artifacts -- Document Generation

The agent reads the Skills for artifact creation, then searches for the necessary content from analyzed data. Following the guidelines, it generates PDFs, Word documents, Excel spreadsheets, charts, and diagrams. Generated artifacts appear in the Artifacts panel on the right for preview and download.

### Define Agents -- Custom AI Configuration

Define specialized AI agents for your project. For example, a financial analyst, a legal reviewer, and more. Select a custom agent and ask a question -- the agent responds based on its specialized role and instructions.

### Refine & Enhance -- Targeted Reanalysis

Add instructions to rerun specific segments, or append new analysis without overwriting the originals. Manually add new questions or analysis entries to supplement the original results.

---

## 5. Voice Agent

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/5.Voice+Agent.mp4" type="video/mp4" />
</video>

### Voice Agent -- Real-Time Conversation

Speak naturally to search, analyze, and invoke tools. Powered by Amazon Nova Sonic with low-latency streaming. The user asks a question by voice, the agent searches documents and responds in real time.


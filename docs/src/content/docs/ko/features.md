---
title: "주요 기능"
description: "Sample AWS IDP Pipeline 주요 기능 소개"
---

## 1. Getting Started

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/1.Getting+Started.mp4" type="video/mp4" />
</video>

### Login

Amazon Cognito로 로그인합니다. 채팅 세션과 아티팩트는 사용자별로 관리됩니다.

### Create Project -- Where It Begins

프로젝트를 생성하고 언어와 분석 방향을 설정합니다. 모든 문서와 결과는 프로젝트 단위로 관리됩니다.

---

## 2. Document Analysis

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/2.Document+Analysis.mp4" type="video/mp4" />
</video>

### Upload Documents -- Multiple Formats

문서를 업로드하고 BDA, OCR, Transcribe 등 분석 옵션을 설정합니다. 분석 언어도 선택할 수 있습니다.

| 파일 타입 | 지원 포맷 | 전처리 |
|-----------|-----------|--------|
| 문서 | PDF, DOCX, DOC, TXT, MD | PaddleOCR + BDA (선택) + PDF 텍스트 추출 |
| 이미지 | PNG, JPG, JPEG, GIF, TIFF, WebP | PaddleOCR + BDA (선택) |
| 프레젠테이션 | PPTX, PPT | PaddleOCR + BDA (선택) |
| 영상 | MP4, MOV, AVI, MKV, WebM | AWS Transcribe + BDA (선택) |
| 음성 | MP3, WAV, FLAC, M4A | AWS Transcribe |
| CAD | DXF | PaddleOCR |
| 웹 | .webreq (URL 크롤링) | Web Crawler Agent |

> 파일 유형별 전처리 흐름의 상세 내용은 [Preprocessing Pipeline](./preprocessing.md)을 참고하세요.

### Intelligent Processing -- Analysis Pipeline

문서 분석이 자동으로 실행됩니다. WebSocket 알림을 통해 실시간으로 진행 상황을 추적합니다.

```
문서 업로드
  -> 전처리 (OCR, BDA, Transcribe)
    -> 세그먼트 분할
      -> Distributed Map (최대 30 동시 실행)
        -> ReAct Agent 분석 (세그먼트별)
          -> 벡터 임베딩 -> LanceDB 저장
      -> 문서 요약 생성
```

> 상세 분석 흐름은 [AI Analysis Pipeline](./analysis.md)을 참고하세요.

### Deep Analysis -- ReAct Agent

AI Agent가 각 세그먼트를 반복적으로 질문하고 답변하며 분석합니다. 이미지, 표, 다이어그램을 시각적으로 이해합니다. BDA, OCR, Parser, Transcribe, AI 분석 등 각 처리 단계의 결과를 개별적으로 확인합니다.

### Video & Audio Analysis -- Multimodal Processing

Transcribe가 음성을 텍스트로 변환하고, AI가 타임코드와 함께 시각적 콘텐츠를 분석합니다. 각 영상의 Transcribe 결과와 AI 분석을 확인하고, 타임코드를 통해 세그먼트를 탐색합니다.

### Web Crawling -- Collect Data from URLs

URL과 지시사항을 입력하면 AI가 웹 페이지를 탐색하여 자동으로 콘텐츠를 분석 파이프라인에 수집합니다. 방문한 각 사이트는 추출된 콘텐츠와 AI 분석 결과와 함께 개별 페이지로 정리됩니다.

---

## 3. Knowledge Discovery

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/3.Knowledge+Discovery.mp4" type="video/mp4" />
</video>

### Knowledge Graph -- Entity Relationships

분석된 문서에서 추출된 엔티티가 자동으로 연결됩니다. 그래프를 탐색하여 문서 간 숨겨진 관계를 발견합니다.

### Tag Cloud -- Keywords at a Glance

엔티티의 빈도와 중요도를 시각화합니다. 문서의 핵심 내용을 한눈에 파악합니다.

---

## 4. AI Interaction

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/4.AI+Interaction.mp4" type="video/mp4" />
</video>

### AI Chat -- Hybrid Search & Graph Traversal

질문이 주어지면 에이전트가 먼저 Skills를 읽어 검색과 실행의 가이드라인을 파악합니다. Skills에 따라 벡터 유사도와 키워드 매칭을 결합한 하이브리드 검색을 수행한 후, 지식 그래프를 통해 연결된 페이지를 찾고 추가 컨텍스트를 수집하여 답변을 생성합니다. 응답에서 참조된 문서, 그래프 결과, 도구 실행 세부 정보를 확인합니다.

### Create Artifacts -- Document Generation

에이전트가 아티팩트 생성을 위한 Skills를 읽은 후, 분석된 데이터에서 필요한 콘텐츠를 검색합니다. 가이드라인에 따라 PDF, Word 문서, Excel 스프레드시트, 차트, 다이어그램을 생성합니다. 생성된 아티팩트는 오른쪽 Artifacts 패널에서 미리보기하고 다운로드합니다.

### Define Agents -- Custom AI Configuration

프로젝트에 맞는 전문 AI 에이전트를 정의합니다. 예를 들어, 재무 분석가, 법률 검토자 등. 커스텀 에이전트를 선택하고 질문하면 전문 역할과 지시사항에 따라 응답합니다.

### Refine & Enhance -- Targeted Reanalysis

특정 세그먼트에 지시사항을 추가하여 재실행하거나, 원본을 덮어쓰지 않고 새로운 분석을 추가할 수 있습니다. 원본 결과를 보완하기 위해 새로운 질문이나 분석 항목을 수동으로 추가합니다.

---

## 5. Voice Agent

<video width="100%" controls muted playsinline>
  <source src="https://d3g6mvioa0ibc9.cloudfront.net/5.Voice+Agent.mp4" type="video/mp4" />
</video>

### Voice Agent -- Real-Time Conversation

자연스럽게 말하여 검색, 분석, 도구 호출을 수행합니다. 저지연 스트리밍의 Amazon Nova Sonic으로 구동됩니다. 사용자가 음성으로 질문하면, 에이전트가 문서를 검색하고 실시간으로 응답합니다.

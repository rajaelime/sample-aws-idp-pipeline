---
title: "Vector Database"
description: "서버리스 벡터 스토리지와 다국어 하이브리드 검색"
---

## 개요

이 프로젝트는 Amazon OpenSearch Service 대신 [LanceDB](https://lancedb.com/)를 벡터 데이터베이스로 사용합니다. LanceDB는 오픈소스 서버리스 벡터 데이터베이스로, 데이터를 S3에 직접 저장하며 별도의 클러스터 인프라가 필요 없습니다. 여기에 다국어 토크나이저 Lambda인 [Toka](https://github.com/aws-samples/sample-aws-idp-pipeline/tree/main/packages/lambda/toka)를 결합하여 모든 지원 언어에 대한 하이브리드 검색(벡터 + 전문 검색)을 구현합니다.

### 다국어 검색 지원

| 언어 | 시멘틱 검색 (벡터) | 전문 검색 (FTS) | 토크나이저 |
|------|:---:|:---:|------|
| **한국어** | O | O | Lindera (KoDic) |
| **일본어** | O | O | Lindera (IPADIC) |
| **중국어** | O | O | Lindera (Jieba) |
| **영어 및 기타 언어** | O | O | ICU Word Segmenter |

Toka는 CJK 언어(한국어, 일본어, 중국어)에 대한 언어별 형태소 분석과, 그 외 언어에 대한 ICU 기반 단어 분할을 제공하는 다국어 토크나이저입니다. 이를 통해 모든 언어의 문서에서 하이브리드 검색(벡터 + FTS)이 가능합니다.

### PoC에 LanceDB를 선택한 이유

이 프로젝트는 **PoC/프로토타입**이며, 비용 효율성이 핵심 요소입니다.

| 항목 | OpenSearch Service | LanceDB (S3) |
|------|-------------------|---------------|
| 인프라 | 전용 클러스터 (최소 2~3 노드) | 클러스터 불필요 (서버리스) |
| 유휴 비용 | 미사용 시에도 과금 | S3 스토리지 비용만 발생 |
| 설정 복잡도 | 도메인 구성, VPC, 접근 정책 | S3 버킷 + DynamoDB 잠금 테이블 |
| 스케일링 | 노드 스케일링 필요 | S3와 함께 자동 확장 |
| 예상 월 비용 (PoC) | $200~500+ (t3.medium x2 최소) | $1~10 (S3 + DDB 온디맨드) |

:::note
OpenSearch는 대시보드, k-NN 플러그인, 세분화된 접근 제어 등 프로덕션 워크로드에 적합한 풍부한 기능을 제공합니다. 전환 가이드는 [OpenSearch 마이그레이션](#opensearch-마이그레이션)을 참고하세요.
:::

---

## 아키텍처

```
쓰기 경로:
  Analysis Finalizer → SQS (Write Queue) → LanceDB Writer Lambda
    → LanceDB Service Lambda (Rust)
        ├─ Toka Lambda: 키워드 추출 (다국어)
        ├─ Bedrock Nova: 벡터 임베딩 (1024d)
        └─ LanceDB: S3 Express One Zone에 저장

읽기 경로:
  MCP Search Tool Lambda
    → LanceDB Service Lambda (Rust): 하이브리드 검색 (벡터 + FTS)
    → Bedrock Claude Haiku: 검색 결과 요약

삭제 경로:
  Backend API (프로젝트 삭제)
    → LanceDB Service Lambda: drop_table
```

### 스토리지 구조

```
S3 Express One Zone (Directory Bucket)
  └─ idp-v2/
      ├─ {project_id_1}/     ← 프로젝트당 하나의 LanceDB 테이블
      │   ├─ data/
      │   └─ indices/
      └─ {project_id_2}/
          ├─ data/
          └─ indices/

DynamoDB (Lock Table)
  PK: base_uri  |  SK: version
  └─ LanceDB 테이블 동시 접근 관리
```

---

## 구성 요소

### 1. LanceDB Service Lambda (Rust)

벡터 DB 핵심 서비스로, Rust와 cargo-lambda로 빌드하여 높은 성능과 빠른 콜드 스타트를 제공합니다.

| 항목 | 값 |
|------|-----|
| 함수 이름 | `idp-v2-lance-service` |
| 런타임 | Rust (provided.al2023, ARM64) |
| 메모리 | 1024 MB |
| 타임아웃 | 5분 |
| 스택 | LanceServiceStack |
| 빌드 | cargo-lambda (Docker 기반) |

**지원 액션:**

| 액션 | 설명 |
|------|------|
| `add_record` | QA 레코드 추가 (Toka로 키워드 추출 + Bedrock으로 임베딩 + 저장) |
| `delete_record` | QA ID 또는 세그먼트 ID로 삭제 |
| `get_segments` | 워크플로우의 모든 세그먼트 조회 |
| `get_by_segment_ids` | 세그먼트 ID 목록으로 본문 조회 (Graph MCP에서 사용) |
| `hybrid_search` | 하이브리드 검색 (벡터 + FTS) |
| `list_tables` | 전체 프로젝트 테이블 목록 |
| `count` | 프로젝트 테이블의 레코드 수 조회 |
| `delete_by_workflow` | 워크플로우 ID로 전체 레코드 삭제 |
| `drop_table` | 프로젝트 테이블 전체 삭제 |

### 2. Toka Lambda (다국어 토크나이저)

Rust 기반 다국어 토크나이저 Lambda로, 언어별 형태소 분석을 통해 텍스트에서 키워드를 추출합니다.

| 항목 | 값 |
|------|-----|
| 함수 이름 | `idp-v2-toka` |
| 런타임 | Rust (provided.al2023, ARM64) |
| 메모리 | 1024 MB |
| 스택 | LanceServiceStack |

**언어 지원:**

| 언어 | 라이브러리 | 사전 | 방식 |
|------|-----------|------|------|
| 한국어 | Lindera | KoDic | 형태소 분석, 불용 태그 필터링 (조사, 어미) |
| 일본어 | Lindera | IPADIC | 형태소 분석, 불용 태그 필터링 (조사, 조동사) |
| 중국어 | Lindera | Jieba | 단어 분할, 불용어 필터링 (65개 일반 단어) |
| 기타 | ICU | - | 유니코드 단어 경계 분할 |

**인터페이스:**
- 입력: `{ text: string, lang: string }`
- 출력: `{ tokens: string[] }`

### 3. LanceDB Writer Lambda

분석 파이프라인에서 쓰기 요청을 받아 LanceDB Service에 위임하는 SQS 소비자입니다.

| 항목 | 값 |
|------|-----|
| 함수 이름 | `idp-v2-lancedb-writer` |
| 런타임 | Python 3.14 |
| 메모리 | 256 MB |
| 타임아웃 | 5분 |
| 트리거 | SQS (`idp-v2-lancedb-write-queue`) |
| 동시성 | 1 (순차 처리) |

동시성을 1로 설정하여 LanceDB 테이블에 대한 동시 쓰기 충돌을 방지합니다.

### 4. MCP Search Tool

AI 채팅 중 에이전트가 문서를 검색할 때 LanceDB Service Lambda를 직접 호출하는 MCP 도구입니다.

```
사용자 질의 → Bedrock Agent Core → MCP Gateway
  → Search Tool Lambda → LanceDB Service Lambda (hybrid_search)
    → Bedrock Claude Haiku: 검색 결과 요약 → 응답
```

| 항목 | 값 |
|------|-----|
| 스택 | McpStack |
| 런타임 | Node.js 22.x (ARM64) |
| 타임아웃 | 30초 |
| 환경변수 | `LANCEDB_FUNCTION_ARN` (SSM 경유) |

---

## 데이터 스키마

각 QA 분석 결과는 다음 스키마로 저장됩니다. 하나의 세그먼트(페이지)에 여러 QA가 존재할 수 있으므로, **QA 단위로 레코드**가 생성됩니다:

```rust
DocumentRecord {
    workflow_id: String,            // 워크플로우 ID
    document_id: String,            // 문서 ID
    segment_id: String,             // "{workflow_id}_{segment_index:04d}"
    qa_id: String,                  // "{workflow_id}_{segment_index:04d}_{qa_index:02d}"
    segment_index: i64,             // 세그먼트 페이지/챕터 번호
    qa_index: i64,                  // QA 번호 (0부터)
    question: String,               // AI가 생성한 질문
    content: String,                // content_combined (임베딩 소스)
    vector: FixedSizeList(f32, 1024), // Bedrock Nova 임베딩
    keywords: String,               // Toka 추출 키워드 (FTS 인덱싱)
    file_uri: String,               // 원본 파일 S3 URI
    file_type: String,              // MIME 타입
    image_uri: Option<String>,      // 세그먼트 이미지 S3 URI
    created_at: Timestamp,          // 생성 시각
}
```

- **프로젝트당 하나의 테이블**: 테이블 이름 = `project_id`
- **QA 단위 저장**: 세그먼트당 여러 QA가 각각 독립 레코드로 저장 (`qa_id`로 고유 식별)
- **`content`**: 모든 전처리 결과를 합친 텍스트 (OCR + BDA + PDF 텍스트 + AI 분석)
- **`vector`**: Bedrock Nova로 생성 (amazon.nova-2-multimodal-embeddings-v1:0, 1024차원)
- **`keywords`**: Toka로 추출한 키워드 (FTS 인덱스), 언어별 토큰화

---

## Toka: 다국어 토크나이저

[Toka](https://github.com/aws-samples/sample-aws-idp-pipeline/tree/main/packages/lambda/toka)는 기존 한국어 전용 Kiwi 토크나이저를 대체하는 Rust 기반 다국어 토크나이저 Lambda입니다.

### Toka를 사용하는 이유

LanceDB의 내장 FTS 토크나이저는 CJK 언어를 잘 처리하지 못합니다. CJK 언어는 정확한 키워드 추출을 위해 언어별 형태소 분석이 필요합니다:

```
한국어:   "인공지능 기반 문서 분석 시스템을 구축했습니다"
  Toka:   ["인공", "지능", "기반", "문서", "분석", "시스템", "구축"]

일본어:   "東京は日本の首都です"
  Toka:   ["東京", "日本", "首都"]

중국어:   "我喜欢学习中文"
  Toka:   ["喜欢", "学习", "中文"]

영어:     "Document analysis system"
  Toka:   ["Document", "analysis", "system"]
```

### CJK 토큰화 (Lindera)

한국어, 일본어, 중국어의 경우 Toka는 **Lindera**를 사용하여 언어별 사전과 불용 태그/불용어 필터를 적용합니다:

**한국어 (KoDic):** 조사(JK*), 어미(EP/EF/EC), 관형사(MM) 등을 필터링하여 내용어만 보존합니다.

**일본어 (IPADIC):** 조사, 조동사, 기호, 필러를 필터링하여 내용어만 보존합니다.

**중국어 (Jieba):** 단어 분할 후 65개 일반 불용어를 필터링합니다.

### 기타 언어 (ICU)

CJK 이외의 모든 언어에 대해 Toka는 **ICU Word Segmenter**를 사용하여 유니코드 표준 단어 경계 감지를 수행합니다. 영숫자 문자가 없는 세그먼트는 필터링됩니다.

---

## 하이브리드 검색 흐름

모든 검색은 LanceDB Service Lambda에서 처리됩니다. 언어 인식 키워드 추출을 통해 벡터 검색과 전문 검색을 결합합니다.

```
검색 쿼리: "문서 분석 결과 조회"
  │
  ├─ [1] Toka 키워드 추출 (Toka Lambda 경유)
  │     → "문서 분석 결과 조회"
  │
  ├─ [2] Bedrock Nova 임베딩 생성
  │     → 1024차원 벡터
  │
  ├─ [3] LanceDB 하이브리드 검색
  │     → FTS: keywords 컬럼에서 키워드 매칭
  │     → Vector: vector 컬럼에서 최근접 이웃 검색
  │     → 관련도 점수와 함께 결과 결합
  │
  └─ [4] 결과 요약 (MCP Search Tool Lambda)
        → Bedrock Claude Haiku로 검색 결과 기반 답변 생성
```

---

## 인프라 (CDK)

### LanceServiceStack

```typescript
// Toka Lambda (다국어 토크나이저)
const tokaFunction = new RustFunction(this, 'TokaFunction', {
  functionName: 'idp-v2-toka',
  manifestPath: '../lambda/toka',
  architecture: Architecture.ARM_64,
  memorySize: 1024,
});

// LanceDB Service Lambda (Rust)
const lanceDbServiceFunction = new RustFunction(this, 'LanceDbServiceFunction', {
  functionName: 'idp-v2-lance-service',
  manifestPath: '../lambda/lancedb-service',
  architecture: Architecture.ARM_64,
  memorySize: 1024,
  timeout: Duration.minutes(5),
  environment: {
    TOKA_FUNCTION_NAME: tokaFunction.functionName,
    LANCEDB_EXPRESS_BUCKET_NAME: '...',
    LANCEDB_LOCK_TABLE_NAME: '...',
  },
});
```

### S3 Express One Zone

```typescript
// StorageStack
const expressStorage = new CfnDirectoryBucket(this, 'LanceDbExpressStorage', {
  bucketName: `idp-v2-lancedb--use1-az4--x-s3`,
  dataRedundancy: 'SingleAvailabilityZone',
  locationName: 'use1-az4',
});
```

S3 Express One Zone은 한 자릿수 밀리초 지연 시간을 제공하며, 벡터 검색과 같은 빈번한 읽기/쓰기 패턴에 최적화되어 있습니다.

### DynamoDB Lock Table

```typescript
// StorageStack
const lockTable = new Table(this, 'LanceDbLockTable', {
  partitionKey: { name: 'base_uri', type: AttributeType.STRING },
  sortKey: { name: 'version', type: AttributeType.NUMBER },
  billingMode: BillingMode.PAY_PER_REQUEST,
});
```

여러 Lambda 함수가 동일한 데이터셋에 동시 접근할 때 분산 잠금을 관리합니다.

### SSM 파라미터

| 키 | 설명 |
|----|------|
| `/idp-v2/lancedb/lock/table-name` | DynamoDB 잠금 테이블 이름 |
| `/idp-v2/lancedb/express/bucket-name` | S3 Express 버킷 이름 |
| `/idp-v2/lancedb/express/az-id` | S3 Express 가용 영역 ID |
| `/idp-v2/lance-service/function-arn` | LanceDB Service Lambda 함수 ARN |
| `/idp-v2/toka/function-name` | Toka 토크나이저 Lambda 함수 이름 |

---

## 컴포넌트 의존성 맵

LanceDB에 의존하는 모든 컴포넌트를 나타낸 다이어그램입니다:

```mermaid
graph TB
    subgraph Write["Write Path"]
        Writer["LanceDB Writer"]
        QA["QA Regenerator"]
    end

    subgraph Read["Read Path"]
        MCP["MCP Search Tool<br/>(Agent)"]
    end

    subgraph Delete["Delete Path"]
        Backend["Backend API<br/>(프로젝트 삭제)"]
    end

    subgraph Core["Core Service (LanceServiceStack)"]
        Service["LanceDB Service<br/>(Rust Lambda)"]
        Toka["Toka<br/>(Tokenizer Lambda)"]
    end

    subgraph Storage["Storage Layer"]
        S3["S3 Express One Zone"]
        DDB["DynamoDB Lock Table"]
    end

    Writer -->|invoke| Service
    QA -->|invoke| Service
    MCP -->|invoke<br/>hybrid_search| Service
    Backend -->|invoke<br/>drop_table| Service

    Service -->|invoke<br/>키워드 추출| Toka
    Service --> S3 & DDB

    style Storage fill:#fff3e0,stroke:#ff9900
    style Core fill:#e8f5e9,stroke:#2ea043
    style Write fill:#fce4ec,stroke:#e91e63
    style Read fill:#e3f2fd,stroke:#1976d2
    style Delete fill:#f3e5f5,stroke:#7b1fa2
```

| 컴포넌트 | 스택 | 접근 유형 | 설명 |
|----------|------|-----------|------|
| **LanceDB Service** | LanceServiceStack | 읽기/쓰기 | 핵심 DB 서비스 (Rust Lambda) |
| **Toka** | LanceServiceStack | 읽기 | 다국어 토크나이저 (Rust Lambda) |
| **LanceDB Writer** | WorkflowStack | 쓰기 (Service 경유) | SQS 소비자, Service에 위임 |
| **Analysis Finalizer** | WorkflowStack | 쓰기 (SQS/Service 경유) | 세그먼트를 쓰기 큐로 전송, 재분석 시 삭제 |
| **QA Regenerator** | WorkflowStack | 쓰기 (Service 경유) | Q&A 세그먼트 업데이트 |
| **MCP Search Tool** | McpStack | 읽기 (Service 직접 호출) | 에이전트 문서 검색 도구 |
| **Backend API** | ApplicationStack | 삭제 (Service 경유) | 프로젝트 삭제 시 `drop_table` 호출 |

---

## OpenSearch 마이그레이션

프로덕션 환경에서 Amazon OpenSearch Service로 전환 시, 다음 컴포넌트를 수정해야 합니다.

### 교체 대상 컴포넌트

| 컴포넌트 | 현재 (LanceDB) | 변경 후 (OpenSearch) | 범위 |
|----------|----------------|---------------------|------|
| **LanceDB Service Lambda** | Rust Lambda + LanceDB | OpenSearch 클라이언트 (CRUD + 검색) | 전체 교체 |
| **Toka Lambda** | Rust 토크나이저 Lambda | 불필요 (Nori가 한국어 처리) | 제거 |
| **LanceDB Writer Lambda** | SQS → LanceDB Service 호출 | SQS → OpenSearch 인덱스 쓰기 | 호출 대상 교체 |
| **MCP Search Tool** | Lambda invoke → LanceDB Service | Lambda invoke → OpenSearch 검색 | 호출 대상 교체 |
| **StorageStack** | S3 Express + DDB 잠금 테이블 | OpenSearch 도메인 (VPC) | 리소스 교체 |

### 변경 불필요 컴포넌트

| 컴포넌트 | 이유 |
|----------|------|
| **Analysis Finalizer** | SQS에 메시지만 전송 (큐 인터페이스 불변) |
| **Frontend** | DB 직접 접근 없음 |
| **Step Functions Workflow** | LanceDB 직접 의존성 없음 |

### 마이그레이션 전략

```
Phase 1: 스토리지 계층 교체
  - VPC 내에 OpenSearch 도메인 생성
  - StorageStack 리소스 교체 (S3 Express + DDB 잠금 제거)
  - 한국어 토큰화를 위한 Nori 분석기 설정

Phase 2: 쓰기 경로 교체
  - LanceDB Service → OpenSearch 인덱싱 서비스로 변경
  - 문서 스키마 변경 (OpenSearch 인덱스 매핑)
  - 임베딩을 위한 OpenSearch neural ingest pipeline 추가

Phase 3: 읽기 경로 교체
  - MCP Search Tool의 Lambda invoke 대상을 OpenSearch 검색 서비스로 변경
  - Toka 의존성 제거 (Nori가 CJK 토큰화 처리)

Phase 4: LanceDB 의존성 제거
  - LanceServiceStack 제거 (Rust Lambda들)
  - S3 Express 버킷 및 DDB 잠금 테이블 제거
```

### 주요 고려 사항

| 항목 | 내용 |
|------|------|
| CJK 토큰화 | OpenSearch에는 [Nori 분석기](https://opensearch.org/docs/latest/analyzers/language-analyzers/#korean-nori)가 내장되어 있고 CJK 지원이 기본 제공되어 Toka 제거 가능 |
| 벡터 검색 | OpenSearch k-NN 플러그인 (HNSW/IVF)이 LanceDB 벡터 검색을 대체 |
| 임베딩 | OpenSearch neural search로 ingest pipeline에서 자동 임베딩 가능, 또는 사전 계산된 임베딩 사용 |
| 비용 | OpenSearch는 실행 중인 클러스터 필요. HA를 위한 최소 2노드 클러스터 |
| SQS 인터페이스 | SQS 쓰기 큐 패턴은 유지 가능, 소비자 로직만 변경 |

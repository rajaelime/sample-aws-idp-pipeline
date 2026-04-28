import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import {
  DynamoDBClient,
  QueryCommand,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import type { DocumentMeta, EntityInfo } from '../types.js';

const s3 = new S3Client({});
const ddb = new DynamoDBClient({});

const BUCKET = process.env.DOCUMENT_STORAGE_BUCKET ?? '';
const TABLE_NAME = process.env.BACKEND_TABLE_NAME ?? '';

async function getS3Json<T>(key: string): Promise<T | null> {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    const body = await res.Body?.transformToString();
    return body ? (JSON.parse(body) as T) : null;
  } catch {
    return null;
  }
}

export async function loadDocumentMeta(
  projectId: string,
  documentId: string,
): Promise<DocumentMeta | null> {
  const prefix = `projects/${projectId}/documents/${documentId}/`;

  const summaryJson = await getS3Json<{
    language: string;
    document_summary: string;
    total_pages: number;
  }>(`${prefix}analysis/summary.json`);

  if (!summaryJson) return null;

  const docName = await getDocumentName(projectId, documentId);

  const segmentKeys = await listSegmentKeys(projectId, documentId);
  const entities = await collectEntities(segmentKeys);

  return {
    document_id: documentId,
    name: docName,
    summary: summaryJson.document_summary,
    entities,
    language: summaryJson.language,
    total_pages: summaryJson.total_pages,
  };
}

async function getDocumentName(
  projectId: string,
  documentId: string,
): Promise<string> {
  try {
    const res = await ddb.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: `PROJ#${projectId}` },
          SK: { S: `DOC#${documentId}` },
        },
      }),
    );
    const data = res.Item?.data?.M;
    return data?.name?.S ?? documentId;
  } catch {
    return documentId;
  }
}

async function listSegmentKeys(
  projectId: string,
  documentId: string,
): Promise<string[]> {
  const prefix = `projects/${projectId}/documents/${documentId}/analysis/segments/`;
  const res = await s3.send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }),
  );
  return (
    res.Contents?.flatMap((obj) =>
      obj.Key?.endsWith('.json') ? [obj.Key] : [],
    ) ?? []
  );
}

async function collectEntities(segmentKeys: string[]): Promise<EntityInfo[]> {
  const entityMap = new Map<string, EntityInfo>();

  for (const key of segmentKeys) {
    const segment = await getS3Json<{
      graph_entities?: Array<{
        name: string;
        mentioned_in: Array<{
          segment_index: number;
          qa_index: number;
          context: string;
        }>;
      }>;
    }>(key);

    for (const entity of segment?.graph_entities ?? []) {
      const existing = entityMap.get(entity.name);
      if (existing) {
        existing.mentioned_in.push(...entity.mentioned_in);
      } else {
        entityMap.set(entity.name, {
          name: entity.name,
          mentioned_in: [...entity.mentioned_in],
        });
      }
    }
  }

  return Array.from(entityMap.values());
}

export async function getReferenceDocumentId(
  projectId: string,
): Promise<string | null> {
  try {
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': { S: `PROJ#${projectId}` },
          ':sk': { S: 'REF#DOCUMENT' },
        },
      }),
    );
    return res.Items?.[0]?.data?.M?.document_id?.S ?? null;
  } catch {
    return null;
  }
}

export async function setReferenceDocumentId(
  projectId: string,
  documentId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await ddb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: { S: `PROJ#${projectId}` },
        SK: { S: 'REF#DOCUMENT' },
      },
      UpdateExpression:
        'SET #data = :data, updated_at = :now, created_at = if_not_exists(created_at, :now)',
      ExpressionAttributeNames: { '#data': 'data' },
      ExpressionAttributeValues: {
        ':data': { M: { document_id: { S: documentId } } },
        ':now': { S: now },
      },
    }),
  );
}

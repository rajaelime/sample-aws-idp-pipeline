import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { DocumentMeta, FieldMismatch, CompareOutput } from '../types.js';

const bedrock = new BedrockRuntimeClient({});
const MODEL_ID =
  process.env.COMPARE_MODEL_ID ?? 'global.anthropic.claude-haiku-4-5-20251001-v1:0';

export async function compareDocuments(
  reference: DocumentMeta,
  target: DocumentMeta,
  fields?: string[],
): Promise<CompareOutput> {
  const refEntities = reference.entities.map((e) => e.name);
  const targetEntities = target.entities.map((e) => e.name);

  const prompt = buildComparePrompt(reference, target, fields);

  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
        system: SYSTEM_PROMPT,
      }),
    }),
  );

  const body = JSON.parse(new TextDecoder().decode(response.body));
  const text: string = body.content?.[0]?.text ?? '{}';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return buildFallbackResult(reference, target, refEntities, targetEntities);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      mismatches: FieldMismatch[];
      summary: string;
    };

    return {
      reference_document_id: reference.document_id,
      target_document_id: target.document_id,
      reference_name: reference.name,
      target_name: target.name,
      total_mismatches: parsed.mismatches.length,
      mismatches: parsed.mismatches,
      summary: parsed.summary,
    };
  } catch {
    return buildFallbackResult(reference, target, refEntities, targetEntities);
  }
}

const SYSTEM_PROMPT = `You are a document comparison analyst. Compare two documents and identify metadata mismatches.
Return ONLY a JSON object with this exact structure:
{
  "mismatches": [
    {
      "field": "field name",
      "reference_value": "value in reference document",
      "target_value": "value in target document",
      "severity": "high|medium|low",
      "explanation": "brief explanation of the mismatch"
    }
  ],
  "summary": "Overall comparison summary in 2-3 sentences"
}

Severity guidelines:
- high: Critical data discrepancies (amounts, dates, parties, key terms)
- medium: Notable differences in content or structure
- low: Minor differences in phrasing or formatting`;

function buildComparePrompt(
  reference: DocumentMeta,
  target: DocumentMeta,
  fields?: string[],
): string {
  const fieldInstruction = fields?.length
    ? `Focus on these fields: ${fields.join(', ')}`
    : 'Compare all available metadata fields including: entities (people, organizations, dates, amounts, locations), document structure, key terms, and content themes.';

  return `Compare the following two documents and identify mismatches.

${fieldInstruction}

## Reference Document: "${reference.name}"
- Pages: ${reference.total_pages}
- Language: ${reference.language}
- Summary: ${reference.summary}
- Entities: ${reference.entities.map((e) => `${e.name} (${e.mentioned_in[0]?.context ?? 'unknown'})`).join(', ')}

## Target Document: "${target.name}"
- Pages: ${target.total_pages}
- Language: ${target.language}
- Summary: ${target.summary}
- Entities: ${target.entities.map((e) => `${e.name} (${e.mentioned_in[0]?.context ?? 'unknown'})`).join(', ')}`;
}

function buildFallbackResult(
  reference: DocumentMeta,
  target: DocumentMeta,
  refEntities: string[],
  targetEntities: string[],
): CompareOutput {
  const missingInTarget = refEntities.filter((e) => !targetEntities.includes(e));
  const missingInRef = targetEntities.filter((e) => !refEntities.includes(e));

  const mismatches: FieldMismatch[] = [];

  if (missingInTarget.length > 0) {
    mismatches.push({
      field: 'entities',
      reference_value: missingInTarget.join(', '),
      target_value: '(missing)',
      severity: 'medium',
      explanation: `Entities present in reference but missing in target document`,
    });
  }

  if (missingInRef.length > 0) {
    mismatches.push({
      field: 'entities',
      reference_value: '(missing)',
      target_value: missingInRef.join(', '),
      severity: 'medium',
      explanation: `Entities present in target but missing in reference document`,
    });
  }

  return {
    reference_document_id: reference.document_id,
    target_document_id: target.document_id,
    reference_name: reference.name,
    target_name: target.name,
    total_mismatches: mismatches.length,
    mismatches,
    summary: `Entity-based comparison: ${missingInTarget.length} entities missing in target, ${missingInRef.length} new entities in target.`,
  };
}

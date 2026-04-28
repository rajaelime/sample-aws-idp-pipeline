import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type {
  DocumentMeta,
  FieldMismatch,
  CompareOutput,
  ChecklistItem,
  ChecklistResult,
} from '../types.js';

const bedrock = new BedrockRuntimeClient({});
const MODEL_ID =
  process.env.COMPARE_MODEL_ID ?? 'global.anthropic.claude-haiku-4-5-20251001-v1:0';

export async function compareDocuments(
  reference: DocumentMeta,
  target: DocumentMeta,
  fields?: string[],
  checklist?: ChecklistItem[],
): Promise<CompareOutput> {
  const refEntities = reference.entities.map((e) => e.name);
  const targetEntities = target.entities.map((e) => e.name);

  const prompt = buildComparePrompt(reference, target, fields, checklist);
  const systemPrompt = checklist?.length ? CHECKLIST_SYSTEM_PROMPT : SYSTEM_PROMPT;

  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
        system: systemPrompt,
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
      checklist_results?: ChecklistResult[];
      summary: string;
    };

    return {
      reference_document_id: reference.document_id,
      target_document_id: target.document_id,
      reference_name: reference.name,
      target_name: target.name,
      total_mismatches: parsed.mismatches.length,
      checklist_results: parsed.checklist_results,
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
      "status": "fail|warn|pass",
      "explanation": "brief explanation of the mismatch"
    }
  ],
  "summary": "Overall comparison summary in 2-3 sentences"
}

Severity guidelines:
- high: Critical data discrepancies (amounts, dates, parties, key terms)
- medium: Notable differences in content or structure
- low: Minor differences in phrasing or formatting

Status guidelines:
- fail: Values are clearly different
- warn: Values are ambiguous or partially matching
- pass: Values match (only include if explicitly requested)`;

const CHECKLIST_SYSTEM_PROMPT = `You are a document comparison analyst. Compare two documents against a checklist of required fields.
Return ONLY a JSON object with this exact structure:
{
  "checklist_results": [
    {
      "field": "checklist field name",
      "description": "what was being checked",
      "expected_severity": "high|medium|low",
      "status": "pass|fail|warn",
      "reference_value": "value found in reference document",
      "target_value": "value found in target document",
      "explanation": "brief explanation of the result"
    }
  ],
  "mismatches": [
    {
      "field": "field name",
      "reference_value": "value in reference",
      "target_value": "value in target",
      "severity": "high|medium|low",
      "status": "fail|warn",
      "explanation": "brief explanation"
    }
  ],
  "summary": "Overall comparison summary in 2-3 sentences including checklist pass rate (e.g., 3/5 passed)"
}

Rules:
- checklist_results MUST contain one entry per checklist item, in order
- mismatches should only contain items with status "fail" or "warn"
- If a checklist field cannot be found in either document, set status to "warn" with explanation
- Status: "pass" = values match, "fail" = values clearly differ, "warn" = ambiguous or not found`;

function buildComparePrompt(
  reference: DocumentMeta,
  target: DocumentMeta,
  fields?: string[],
  checklist?: ChecklistItem[],
): string {
  let instruction: string;

  if (checklist?.length) {
    const checklistText = checklist
      .map((c, i) => `${i + 1}. **${c.field}** (${c.severity}): ${c.description}`)
      .join('\n');
    instruction = `Evaluate EACH of the following checklist items:\n${checklistText}`;

    if (fields?.length) {
      const extraFields = fields.filter(
        (f) => !checklist.some((c) => c.field === f),
      );
      if (extraFields.length) {
        instruction += `\n\nAlso check these additional fields: ${extraFields.join(', ')}`;
      }
    }
  } else if (fields?.length) {
    instruction = `Focus on these fields: ${fields.join(', ')}`;
  } else {
    instruction =
      'Compare all available metadata fields including: entities (people, organizations, dates, amounts, locations), document structure, key terms, and content themes.';
  }

  return `Compare the following two documents and identify mismatches.

${instruction}

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
      status: 'fail',
      explanation: 'Entities present in reference but missing in target document',
    });
  }

  if (missingInRef.length > 0) {
    mismatches.push({
      field: 'entities',
      reference_value: '(missing)',
      target_value: missingInRef.join(', '),
      severity: 'medium',
      status: 'warn',
      explanation: 'Entities present in target but missing in reference document',
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

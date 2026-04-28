import {
  loadDocumentMeta,
  getReferenceDocumentId,
} from '../lib/document-loader.js';
import { compareDocuments } from '../lib/comparator.js';
import type { CompareInput, CompareOutput } from '../types.js';

export async function handler(event: CompareInput): Promise<CompareOutput> {
  const { project_id, target_document_id, fields } = event;

  const refDocId =
    event.reference_document_id ??
    (await getReferenceDocumentId(project_id));

  if (!refDocId) {
    throw new Error(
      `No reference document set for project ${project_id}. Use set_reference first.`,
    );
  }

  if (refDocId === target_document_id) {
    throw new Error('Reference and target documents must be different.');
  }

  const [reference, target] = await Promise.all([
    loadDocumentMeta(project_id, refDocId),
    loadDocumentMeta(project_id, target_document_id),
  ]);

  if (!reference) {
    throw new Error(
      `Reference document ${refDocId} not found or not yet analyzed.`,
    );
  }
  if (!target) {
    throw new Error(
      `Target document ${target_document_id} not found or not yet analyzed.`,
    );
  }

  return compareDocuments(reference, target, fields);
}

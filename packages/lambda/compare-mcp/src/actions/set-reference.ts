import {
  loadDocumentMeta,
  setReferenceDocumentId,
} from '../lib/document-loader.js';
import type { SetReferenceInput, SetReferenceOutput } from '../types.js';

export async function handler(
  event: SetReferenceInput,
): Promise<SetReferenceOutput> {
  const { project_id, document_id } = event;

  const meta = await loadDocumentMeta(project_id, document_id);
  if (!meta) {
    throw new Error(
      `Document ${document_id} not found or not yet analyzed in project ${project_id}`,
    );
  }

  await setReferenceDocumentId(project_id, document_id);

  return {
    message: `Document "${meta.name}" set as reference for project ${project_id}`,
    reference_document_id: document_id,
  };
}

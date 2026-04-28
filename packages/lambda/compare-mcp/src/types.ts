export interface SetReferenceInput {
  project_id: string;
  document_id: string;
}

export interface SetReferenceOutput {
  message: string;
  reference_document_id: string;
}

export interface CompareInput {
  project_id: string;
  target_document_id: string;
  reference_document_id?: string;
  fields?: string[];
}

export interface FieldMismatch {
  field: string;
  reference_value: string;
  target_value: string;
  severity: 'high' | 'medium' | 'low';
  explanation: string;
}

export interface CompareOutput {
  reference_document_id: string;
  target_document_id: string;
  reference_name: string;
  target_name: string;
  total_mismatches: number;
  mismatches: FieldMismatch[];
  summary: string;
}

export interface DocumentMeta {
  document_id: string;
  name: string;
  summary: string;
  entities: EntityInfo[];
  language: string;
  total_pages: number;
}

export interface EntityInfo {
  name: string;
  mentioned_in: Array<{
    segment_index: number;
    qa_index: number;
    context: string;
  }>;
}

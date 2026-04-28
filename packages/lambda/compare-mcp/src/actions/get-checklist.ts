import { getChecklist } from '../lib/document-loader.js';
import type { GetChecklistInput, GetChecklistOutput } from '../types.js';

export async function handler(
  event: GetChecklistInput,
): Promise<GetChecklistOutput> {
  const { project_id } = event;
  const items = await getChecklist(project_id);

  return {
    project_id,
    items,
  };
}

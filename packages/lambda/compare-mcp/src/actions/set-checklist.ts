import { setChecklist } from '../lib/document-loader.js';
import type { SetChecklistInput, SetChecklistOutput } from '../types.js';

export async function handler(
  event: SetChecklistInput,
): Promise<SetChecklistOutput> {
  const { project_id, items } = event;

  if (!items?.length) {
    throw new Error('At least one checklist item is required.');
  }

  const validSeverities = ['high', 'medium', 'low'];
  for (const item of items) {
    if (!item.field?.trim()) {
      throw new Error('Each checklist item must have a non-empty "field".');
    }
    if (!validSeverities.includes(item.severity)) {
      item.severity = 'medium';
    }
    if (!item.description?.trim()) {
      item.description = item.field;
    }
  }

  await setChecklist(project_id, items);

  return {
    message: `Checklist updated with ${items.length} items for project ${project_id}`,
    items,
  };
}

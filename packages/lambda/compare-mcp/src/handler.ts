import type {
  SetReferenceInput,
  CompareInput,
  SetChecklistInput,
  GetChecklistInput,
} from './types.js';

interface LambdaContext {
  clientContext?: {
    custom?: {
      bedrockAgentCoreToolName?: string;
    };
  };
}

export const handler = async (event: unknown, context: LambdaContext) => {
  const toolName =
    context.clientContext?.custom?.bedrockAgentCoreToolName ?? '';
  const mcpAction = toolName.includes('___')
    ? toolName.split('___').pop()
    : toolName;

  const eventObj = event as Record<string, unknown>;
  const action = mcpAction || (eventObj.action as string) || '';

  switch (action) {
    case 'set_reference': {
      const { handler: setRef } = await import('./actions/set-reference.js');
      return setRef(eventObj as unknown as SetReferenceInput);
    }
    case 'compare': {
      const { handler: compare } = await import('./actions/compare.js');
      return compare(eventObj as unknown as CompareInput);
    }
    case 'set_checklist': {
      const { handler: setCl } = await import('./actions/set-checklist.js');
      return setCl(eventObj as unknown as SetChecklistInput);
    }
    case 'get_checklist': {
      const { handler: getCl } = await import('./actions/get-checklist.js');
      return getCl(eventObj as unknown as GetChecklistInput);
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

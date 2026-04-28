import type { SetReferenceInput, CompareInput } from './types.js';

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
    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

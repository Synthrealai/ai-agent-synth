import { createChildLogger, type ToolResult, RiskLevel } from '@forgeclaw/shared';

const log = createChildLogger('tool-router');

export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean; [key: string]: unknown }>;
  riskLevel: RiskLevel;
  handler: ToolHandler;
}

export class ToolRouter {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
    log.info({ tool: tool.name }, 'Tool registered');
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getOpenAITools(): Array<{
    type: 'function';
    function: { name: string; description: string; parameters: Record<string, unknown> };
  }> {
    return this.list().map((tool) => {
      const properties = Object.fromEntries(
        Object.entries(tool.parameters).map(([name, schema]) => {
          const { required: _required, ...jsonSchema } = schema;
          return [name, jsonSchema];
        })
      );

      const required = Object.entries(tool.parameters)
        .filter(([, schema]) => schema.required === true)
        .map(([name]) => name);

      return {
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties,
            ...(required.length > 0 ? { required } : {}),
          },
        },
      };
    });
  }

  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, output: '', error: `Unknown tool: ${name}`, duration_ms: 0, truncated: false };
    }

    const start = Date.now();
    try {
      const result = await tool.handler(args);
      const duration_ms = Date.now() - start;
      if (result.success) {
        log.info({ tool: name, duration_ms, success: true }, 'Tool executed');
      } else {
        log.warn(
          { tool: name, duration_ms, success: false, error: result.error || 'Unknown tool error' },
          'Tool executed with failure'
        );
      }
      return { ...result, duration_ms };
    } catch (error: any) {
      const duration_ms = Date.now() - start;
      log.error({ tool: name, error: error.message, duration_ms }, 'Tool execution failed');
      return { success: false, output: '', error: error.message, duration_ms, truncated: false };
    }
  }
}

export { createFilesystemTool } from './filesystem.js';
export { createShellTool } from './shell.js';
export { createHttpTool } from './http.js';
export { createBrowserTool } from './browser.js';
export { createHumanTool } from './human.js';
export { createContentTool } from './content.js';
export { createSocialTool } from './social.js';
export { createVideoTool } from './video.js';

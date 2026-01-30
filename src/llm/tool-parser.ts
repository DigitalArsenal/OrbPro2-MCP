/**
 * Tool Parser - Extracts tool calls from LLM text responses
 *
 * Handles various output formats:
 * - Pure JSON: {"tool": "flyTo", "arguments": {...}}
 * - Embedded JSON in text
 * - Markdown code blocks with JSON
 */

export interface ParsedToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

/**
 * Parse a tool call from LLM response text
 */
export function parseToolCallFromResponse(content: string): ParsedToolCall | null {
  if (!content || content.trim().length === 0) {
    return null;
  }

  const trimmed = content.trim();

  // Try 1: Parse entire content as JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (isValidToolCall(parsed)) {
      return {
        tool: parsed.tool,
        arguments: parsed.arguments || {},
      };
    }
  } catch {
    // Not pure JSON, continue trying
  }

  // Try 2: Extract JSON from markdown code block
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (isValidToolCall(parsed)) {
        return {
          tool: parsed.tool,
          arguments: parsed.arguments || {},
        };
      }
    } catch {
      // Invalid JSON in code block
    }
  }

  // Try 3: Find JSON object in text
  const jsonMatches = trimmed.match(/\{[\s\S]*?\}/g);
  if (jsonMatches) {
    for (const match of jsonMatches) {
      try {
        const parsed = JSON.parse(match);
        if (isValidToolCall(parsed)) {
          return {
            tool: parsed.tool,
            arguments: parsed.arguments || {},
          };
        }
      } catch {
        // This match wasn't valid JSON
      }
    }
  }

  // Try 4: Find nested/complex JSON (handles multiple levels of braces)
  const complexJsonMatch = trimmed.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
  if (complexJsonMatch) {
    for (const match of complexJsonMatch) {
      try {
        const parsed = JSON.parse(match);
        if (isValidToolCall(parsed)) {
          return {
            tool: parsed.tool,
            arguments: parsed.arguments || {},
          };
        }
      } catch {
        // Continue trying
      }
    }
  }

  return null;
}

/**
 * Check if an object is a valid tool call
 */
function isValidToolCall(obj: unknown): obj is { tool: string; arguments?: Record<string, unknown> } {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  // Must have a 'tool' property that's a non-empty string
  if (typeof candidate.tool !== 'string' || candidate.tool.trim().length === 0) {
    return false;
  }

  // 'arguments' is optional but if present must be an object
  if (candidate.arguments !== undefined) {
    if (typeof candidate.arguments !== 'object' || candidate.arguments === null) {
      return false;
    }
  }

  return true;
}

/**
 * Parse multiple tool calls from a response (for compound commands)
 */
export function parseAllToolCalls(content: string): ParsedToolCall[] {
  const toolCalls: ParsedToolCall[] = [];

  if (!content || content.trim().length === 0) {
    return toolCalls;
  }

  const trimmed = content.trim();

  // Try to parse as array of tool calls
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (isValidToolCall(item)) {
          toolCalls.push({
            tool: item.tool,
            arguments: item.arguments || {},
          });
        }
      }
      if (toolCalls.length > 0) {
        return toolCalls;
      }
    }
  } catch {
    // Not an array
  }

  // Fall back to finding individual tool calls
  const jsonMatches = trimmed.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
  if (jsonMatches) {
    for (const match of jsonMatches) {
      try {
        const parsed = JSON.parse(match);
        if (isValidToolCall(parsed)) {
          toolCalls.push({
            tool: parsed.tool,
            arguments: parsed.arguments || {},
          });
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  return toolCalls;
}

/**
 * Normalize tool name (handle common variations)
 */
export function normalizeToolName(name: string): string {
  // Convert snake_case or kebab-case to camelCase
  return name
    .replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/^([A-Z])/, (_, c) => c.toLowerCase());
}

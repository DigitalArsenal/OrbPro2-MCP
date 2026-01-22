/**
 * LLM module exports
 */

export { WebLLMEngine, checkWebGPUSupport, RECOMMENDED_MODELS } from './web-llm-engine';
export type {
  LLMConfig,
  LLMResponse,
  ToolCall,
  ToolDefinition,
  InitProgressReport,
} from './web-llm-engine';

export { CommandParser } from './command-parser';
export type { ParseResult } from './command-parser';

// Prompt utilities
export {
  buildSystemPrompt,
  SYSTEM_PROMPT_BASE,
  FEW_SHOT_EXAMPLES,
  LOCATION_HEIGHTS,
  FLIGHT_DURATIONS,
  KNOWN_LOCATIONS,
  getRecommendedHeight,
  getRecommendedDuration,
  lookupLocation,
  inferLocationType,
} from './prompts';

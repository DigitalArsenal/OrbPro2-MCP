/**
 * Orchestrated LLM Engine - Wraps WebLLM with NLP decomposition
 *
 * This module provides an enhanced interface that:
 * 1. Accepts complex multi-step natural language commands
 * 2. Uses NLP to decompose them into atomic steps
 * 3. Executes each step through the small model
 * 4. Maintains context and handles dependencies
 *
 * Usage:
 *   const engine = new OrchestratedEngine(webLLMEngine, toolExecutor);
 *   const result = await engine.processCommand("fly to paris and add a red marker");
 */

import type { WebLLMEngine, ToolCall, LLMResponse } from './web-llm-engine';
import {
  CommandOrchestrator,
  type OrchestrationResult,
  type OrchestratorConfig,
  type StepResult,
} from './command-orchestrator';
import {
  decomposeCommand,
  formatDecomposition,
  type AtomicCommand,
} from './command-decomposer';
import { parseToolCallFromResponse } from './tool-parser';

// ============================================================================
// Types
// ============================================================================

export interface OrchestratedEngineConfig {
  debug?: boolean;
  maxSteps?: number;
  timeoutMs?: number;
  useOrchestration?: boolean;  // Can disable to use simple mode
  onDecomposition?: (commands: AtomicCommand[]) => void;
  onStepStart?: (step: number, command: AtomicCommand) => void;
  onStepComplete?: (step: number, result: StepResult) => void;
  onProgress?: (message: string) => void;
}

export interface ProcessResult {
  mode: 'simple' | 'orchestrated';
  success: boolean;
  toolCalls: ToolCall[];
  results: unknown[];
  errors: string[];
  decomposition?: AtomicCommand[];
  orchestration?: OrchestrationResult;
  totalDuration: number;
}

export type ToolExecutor = (toolCall: ToolCall) => Promise<unknown>;

// ============================================================================
// Orchestrated Engine
// ============================================================================

export class OrchestratedEngine {
  private webLLM: WebLLMEngine;
  private toolExecutor: ToolExecutor;
  private config: OrchestratedEngineConfig;
  private orchestrator: CommandOrchestrator;

  constructor(
    webLLM: WebLLMEngine,
    toolExecutor: ToolExecutor,
    config: OrchestratedEngineConfig = {}
  ) {
    this.webLLM = webLLM;
    this.toolExecutor = toolExecutor;
    this.config = {
      debug: false,
      maxSteps: 15,
      timeoutMs: 60000,
      useOrchestration: true,
      ...config,
    };

    // Create orchestrator with model inference function
    this.orchestrator = new CommandOrchestrator(
      this.modelInference.bind(this),
      this.toolExecutor,
      {
        debug: this.config.debug,
        maxSteps: this.config.maxSteps,
        timeoutMs: this.config.timeoutMs,
        onStepStart: this.config.onStepStart,
        onStepComplete: this.config.onStepComplete,
        onProgress: this.config.onProgress,
      }
    );
  }

  /**
   * Model inference function for the orchestrator
   */
  private async modelInference(prompt: string): Promise<ToolCall | null> {
    try {
      const response = await this.webLLM.generate(prompt);

      // Parse tool call from response
      const toolCall = this.parseToolCall(response);
      return toolCall;
    } catch (error) {
      this.log(`Model inference error: ${error}`);
      return null;
    }
  }

  /**
   * Parse tool call from LLM response
   */
  private parseToolCall(response: LLMResponse): ToolCall | null {
    // First check if response has explicit tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      const tc = response.toolCalls[0];
      return {
        name: tc.name,
        arguments: tc.arguments,
      };
    }

    // Otherwise, parse from content
    const parsed = parseToolCallFromResponse(response.content);
    if (parsed) {
      return {
        name: parsed.tool,
        arguments: parsed.arguments as Record<string, unknown>,
      };
    }

    return null;
  }

  /**
   * Process a natural language command
   *
   * Automatically decides whether to use simple mode (single command)
   * or orchestrated mode (complex multi-step command)
   */
  async processCommand(input: string): Promise<ProcessResult> {
    const startTime = Date.now();

    // First, decompose to see how complex the command is
    const commands = decomposeCommand(input);

    this.config.onDecomposition?.(commands);

    if (this.config.debug) {
      this.log(formatDecomposition(commands));
    }

    // If only one command or orchestration disabled, use simple mode
    if (commands.length <= 1 || !this.config.useOrchestration) {
      return this.processSimple(input, commands, startTime);
    }

    // Otherwise, use orchestrated mode
    return this.processOrchestrated(input, commands, startTime);
  }

  /**
   * Simple mode - single model call for atomic commands
   */
  private async processSimple(
    input: string,
    commands: AtomicCommand[],
    startTime: number
  ): Promise<ProcessResult> {
    this.log('Using simple mode (single command)');

    try {
      const response = await this.webLLM.generate(input);
      const toolCall = this.parseToolCall(response);

      if (!toolCall) {
        return {
          mode: 'simple',
          success: false,
          toolCalls: [],
          results: [],
          errors: ['No tool call parsed from response'],
          decomposition: commands,
          totalDuration: Date.now() - startTime,
        };
      }

      // Execute the tool
      const result = await this.toolExecutor(toolCall);

      return {
        mode: 'simple',
        success: true,
        toolCalls: [toolCall],
        results: [result],
        errors: [],
        decomposition: commands,
        totalDuration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        mode: 'simple',
        success: false,
        toolCalls: [],
        results: [],
        errors: [error instanceof Error ? error.message : String(error)],
        decomposition: commands,
        totalDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Orchestrated mode - NLP decomposition + step-by-step execution
   */
  private async processOrchestrated(
    input: string,
    commands: AtomicCommand[],
    startTime: number
  ): Promise<ProcessResult> {
    this.log(`Using orchestrated mode (${commands.length} steps)`);

    const orchestration = await this.orchestrator.execute(input);

    // Extract tool calls and results from orchestration
    const toolCalls: ToolCall[] = [];
    const results: unknown[] = [];
    const errors: string[] = [];

    for (const step of orchestration.steps) {
      if (step.toolCall) {
        toolCalls.push(step.toolCall);
      }
      if (step.result !== undefined) {
        results.push(step.result);
      }
      if (step.error) {
        errors.push(`Step ${step.commandId}: ${step.error}`);
      }
    }

    return {
      mode: 'orchestrated',
      success: orchestration.success,
      toolCalls,
      results,
      errors,
      decomposition: commands,
      orchestration,
      totalDuration: Date.now() - startTime,
    };
  }

  /**
   * Force simple mode (useful for testing or when you know it's a single command)
   */
  async processSingle(input: string): Promise<ProcessResult> {
    const startTime = Date.now();
    const commands = decomposeCommand(input);
    return this.processSimple(input, commands, startTime);
  }

  /**
   * Force orchestrated mode (useful for testing)
   */
  async processMulti(input: string): Promise<ProcessResult> {
    const startTime = Date.now();
    const commands = decomposeCommand(input);
    return this.processOrchestrated(input, commands, startTime);
  }

  /**
   * Preview decomposition without execution
   */
  previewDecomposition(input: string): AtomicCommand[] {
    return decomposeCommand(input);
  }

  /**
   * Get formatted decomposition for debugging
   */
  formatDecomposition(input: string): string {
    const commands = decomposeCommand(input);
    return formatDecomposition(commands);
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[OrchestratedEngine] ${message}`);
    }
    this.config.onProgress?.(message);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Quick check if a command likely needs orchestration
 */
export function needsOrchestration(input: string): boolean {
  const commands = decomposeCommand(input);
  return commands.length > 1;
}

/**
 * Get step count for a command without full processing
 */
export function getStepCount(input: string): number {
  const commands = decomposeCommand(input);
  return commands.length;
}

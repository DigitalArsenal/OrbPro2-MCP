/**
 * Command Orchestrator - Executes decomposed commands step by step
 *
 * This is the main agentic loop that:
 * 1. Takes a complex natural language command
 * 2. Decomposes it into atomic steps using NLP
 * 3. Executes each step through the small model → tool call → execute
 * 4. Maintains context between steps (created entities, search results, etc.)
 * 5. Handles dependencies and reference resolution
 */

import {
  decomposeCommand,
  generateAtomicPrompt,
  formatDecomposition,
  type AtomicCommand,
  type CommandContext,
  type CommandIntent,
} from './command-decomposer';
import type { ToolCall } from './web-llm-engine';

// ============================================================================
// Types
// ============================================================================

export interface OrchestratorConfig {
  maxSteps: number;
  timeoutMs: number;
  debug: boolean;
  onStepStart?: (step: number, command: AtomicCommand) => void;
  onStepComplete?: (step: number, result: StepResult) => void;
  onProgress?: (message: string) => void;
}

export interface StepResult {
  commandId: string;
  intent: CommandIntent;
  success: boolean;
  toolCall?: ToolCall;
  result?: unknown;
  error?: string;
  duration: number;
}

export interface OrchestrationResult {
  success: boolean;
  steps: StepResult[];
  totalDuration: number;
  decomposition: AtomicCommand[];
  context: CommandContext;
}

export type ModelInferenceFunction = (prompt: string) => Promise<ToolCall | null>;
export type ToolExecutionFunction = (toolCall: ToolCall) => Promise<unknown>;

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxSteps: 20,
  timeoutMs: 60000,
  debug: false,
};

// ============================================================================
// Orchestrator Class
// ============================================================================

export class CommandOrchestrator {
  private config: OrchestratorConfig;
  private context: CommandContext;
  private modelInference: ModelInferenceFunction;
  private toolExecution: ToolExecutionFunction;

  constructor(
    modelInference: ModelInferenceFunction,
    toolExecution: ToolExecutionFunction,
    config: Partial<OrchestratorConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.modelInference = modelInference;
    this.toolExecution = toolExecution;
    this.context = this.createEmptyContext();
  }

  private createEmptyContext(): CommandContext {
    return {
      previousResults: new Map(),
      createdEntities: new Map(),
      currentLocation: undefined,
      searchResults: undefined,
    };
  }

  /**
   * Execute a complex natural language command
   */
  async execute(input: string): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const steps: StepResult[] = [];

    // Reset context for new command
    this.context = this.createEmptyContext();

    // Step 1: Decompose the command using NLP
    this.log('Decomposing command...');
    const commands = decomposeCommand(input);

    if (this.config.debug) {
      this.log(formatDecomposition(commands));
    }

    if (commands.length === 0) {
      return {
        success: false,
        steps: [],
        totalDuration: Date.now() - startTime,
        decomposition: commands,
        context: this.context,
      };
    }

    this.log(`Decomposed into ${commands.length} atomic commands`);

    // Step 2: Execute each command in order
    for (let i = 0; i < commands.length && i < this.config.maxSteps; i++) {
      const command = commands[i];
      const stepStartTime = Date.now();

      // Check timeout
      if (Date.now() - startTime > this.config.timeoutMs) {
        this.log('Timeout reached, stopping execution');
        break;
      }

      // Notify step start
      this.config.onStepStart?.(i + 1, command);
      this.log(`\nStep ${i + 1}/${commands.length}: ${command.intent}`);
      this.log(`  "${command.rawText}"`);

      // Check dependencies are satisfied
      const depsOk = this.checkDependencies(command, steps);
      if (!depsOk) {
        const result: StepResult = {
          commandId: command.id,
          intent: command.intent,
          success: false,
          error: 'Dependencies not satisfied',
          duration: Date.now() - stepStartTime,
        };
        steps.push(result);
        this.config.onStepComplete?.(i + 1, result);
        continue;
      }

      // Generate simplified prompt for the model
      const atomicPrompt = generateAtomicPrompt(command, this.context);
      this.log(`  Atomic prompt: "${atomicPrompt}"`);

      try {
        // Get tool call from model
        const toolCall = await this.modelInference(atomicPrompt);

        if (!toolCall) {
          const result: StepResult = {
            commandId: command.id,
            intent: command.intent,
            success: false,
            error: 'Model did not produce a tool call',
            duration: Date.now() - stepStartTime,
          };
          steps.push(result);
          this.config.onStepComplete?.(i + 1, result);
          continue;
        }

        this.log(`  Tool: ${toolCall.tool}`);

        // Execute the tool
        const executionResult = await this.toolExecution(toolCall);

        // Update context based on result
        this.updateContext(command, toolCall, executionResult);

        const result: StepResult = {
          commandId: command.id,
          intent: command.intent,
          success: true,
          toolCall,
          result: executionResult,
          duration: Date.now() - stepStartTime,
        };
        steps.push(result);
        this.config.onStepComplete?.(i + 1, result);

        this.log(`  ✓ Completed in ${result.duration}ms`);

      } catch (error) {
        const result: StepResult = {
          commandId: command.id,
          intent: command.intent,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - stepStartTime,
        };
        steps.push(result);
        this.config.onStepComplete?.(i + 1, result);
        this.log(`  ✗ Error: ${result.error}`);
      }
    }

    // Calculate overall success
    const allSuccess = steps.length > 0 && steps.every(s => s.success);
    const someSuccess = steps.some(s => s.success);

    return {
      success: someSuccess,
      steps,
      totalDuration: Date.now() - startTime,
      decomposition: commands,
      context: this.context,
    };
  }

  /**
   * Check if all dependencies for a command are satisfied
   */
  private checkDependencies(command: AtomicCommand, completedSteps: StepResult[]): boolean {
    for (const depId of command.dependencies) {
      const depResult = completedSteps.find(s => s.commandId === depId);
      if (!depResult || !depResult.success) {
        return false;
      }
    }
    return true;
  }

  /**
   * Update context after a successful step
   */
  private updateContext(command: AtomicCommand, toolCall: ToolCall, result: unknown): void {
    // Store the result
    this.context.previousResults.set(command.id, result);

    // Track created entities
    if (toolCall.tool.startsWith('add') || toolCall.tool === 'createEntity') {
      const entityId = (result as { id?: string })?.id ||
                       (toolCall.arguments as { name?: string })?.name ||
                       `entity_${command.id}`;
      this.context.createdEntities.set(command.id, entityId);
    }

    // Update current location
    if (toolCall.tool === 'flyTo' || toolCall.tool === 'setView' || toolCall.tool === 'navigate') {
      const args = toolCall.arguments as { longitude?: number; latitude?: number };
      if (args.longitude !== undefined && args.latitude !== undefined) {
        this.context.currentLocation = {
          longitude: args.longitude,
          latitude: args.latitude,
        };
      }
    }

    // Store search results
    if (toolCall.tool === 'searchPOI' || toolCall.tool === 'findNearby') {
      if (Array.isArray(result)) {
        this.context.searchResults = result;
      }
    }
  }

  /**
   * Log helper
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[Orchestrator] ${message}`);
    }
    this.config.onProgress?.(message);
  }

  /**
   * Get current context (for debugging/inspection)
   */
  getContext(): CommandContext {
    return this.context;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick test of command decomposition without execution
 */
export function testDecomposition(input: string): void {
  const commands = decomposeCommand(input);
  console.log(formatDecomposition(commands));
}

/**
 * Create a simple orchestrator for testing
 */
export function createTestOrchestrator(
  modelFn: ModelInferenceFunction,
  execFn: ToolExecutionFunction
): CommandOrchestrator {
  return new CommandOrchestrator(modelFn, execFn, {
    debug: true,
    maxSteps: 10,
    timeoutMs: 30000,
  });
}

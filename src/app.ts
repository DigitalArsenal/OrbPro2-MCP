/**
 * OrbPro2 MCP - Main Application
 * Integrates WebLLM, MCP Server, and CesiumJS for natural language globe control
 */

import { WebLLMEngine, checkWebGPUSupport, RECOMMENDED_MODELS, CUSTOM_MODEL_REGISTRY } from './llm/web-llm-engine';
import { APILLMEngine } from './llm/api-llm-engine';
import { CommandParser } from './llm/command-parser';
import { CesiumCommandExecutor } from './cesium/command-executor';
import { WasmMCPServer } from './mcp/wasm-mcp-server';
import { ChatInterface } from './ui/chat-interface';
import { StatusDisplay } from './ui/status-display';
import { ModelSelector, ModelSelection } from './ui/model-selector';
import { initSettingsPanel, getApiKey } from './ui/settings-panel';
import type { CesiumCommand } from './cesium/types';
import { decomposeCommand } from './llm/command-decomposer';
import { parseToolCallFromResponse } from './llm/tool-parser';
import {
  correctFlyToCoordinates,
  correctPolylineCoordinates,
  SINGLE_POINT_TOOLS,
  MULTI_POINT_TOOLS,
} from './llm/geocoder';

// Union type for LLM engines
type LLMEngine = WebLLMEngine | APILLMEngine;

// Types for Cesium (loaded from CDN)
declare const Cesium: {
  Viewer: new (container: string | HTMLElement, options?: object) => CesiumViewer;
  Ion: { defaultAccessToken: string };
  SkyAtmosphere: new () => unknown;
  Cartographic: {
    fromCartesian: (cartesian: Cartesian3, ellipsoid?: unknown, result?: Cartographic) => Cartographic;
  };
  Math: {
    toDegrees: (radians: number) => number;
  };
  defined: (value: unknown) => boolean;
};

interface Cartesian3 {
  x: number;
  y: number;
  z: number;
}

interface Cartographic {
  longitude: number;
  latitude: number;
  height: number;
}

interface CesiumCamera {
  position: Cartesian3;
  positionCartographic: Cartographic;
  direction: Cartesian3;
  pickEllipsoid: (windowPosition: { x: number; y: number }, ellipsoid?: unknown, result?: Cartesian3) => Cartesian3 | undefined;
  moveEnd: { addEventListener: (callback: () => void) => () => void };
  changed: { addEventListener: (callback: () => void) => () => void };
}

interface CesiumScene {
  canvas: HTMLCanvasElement;
  globe: { ellipsoid: unknown };
}

interface CesiumViewer {
  camera: CesiumCamera;
  scene: CesiumScene;
  clock: unknown;
  dataSources: unknown;
  entities: unknown;
  imageryLayers: unknown;
  terrainProvider: unknown;
  destroy: () => void;
}

export class CesiumSLMApp {
  private llmEngine: LLMEngine | null = null;
  private commandParser: CommandParser;
  private commandExecutor: CesiumCommandExecutor | null = null;
  private mcpServer: WasmMCPServer | null = null;
  private viewer: CesiumViewer | null = null;

  private chatInterface: ChatInterface | null = null;
  private statusDisplay: StatusDisplay | null = null;
  private modelSelector: ModelSelector | null = null;

  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private currentModelSelection: ModelSelection | null = null;

  constructor() {
    this.commandParser = new CommandParser();
  }

  async initialize(config: {
    cesiumContainer: string;
    chatContainer: string;
    statusContainer: string;
    modelSelectorContainer: string;
    cesiumToken?: string;
  }): Promise<void> {
    // Initialize status display first
    try {
      this.statusDisplay = new StatusDisplay(config.statusContainer, {
        onModelReset: () => this.modelSelector?.reset(),
      });
    } catch (error) {
      throw new Error(`StatusDisplay init failed: ${error instanceof Error ? error.message : error}`);
    }

    // Check WebGPU support
    try {
      const webgpuSupport = await checkWebGPUSupport();
      this.statusDisplay.updateWebGPU({
        supported: webgpuSupport.supported,
        error: webgpuSupport.error,
      });

      if (!webgpuSupport.supported) {
        throw new Error(webgpuSupport.error || 'WebGPU not supported');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('WebGPU')) {
        throw error;
      }
      throw new Error(`WebGPU check failed: ${error instanceof Error ? error.message : error}`);
    }

    // Initialize model selector
    try {
      this.modelSelector = new ModelSelector({
        containerId: config.modelSelectorContainer,
        onSelect: (selection: ModelSelection) => this.loadModel(selection),
        onReset: () => this.resetModel(),
      });
    } catch (error) {
      throw new Error(`ModelSelector init failed: ${error instanceof Error ? error.message : error}`);
    }

    // Initialize settings panel (gear icon in header)
    try {
      initSettingsPanel();
    } catch (error) {
      console.warn('Settings panel init failed:', error);
    }

    // Initialize CesiumJS
    try {
      await this.initializeCesium(config.cesiumContainer, config.cesiumToken);
      this.statusDisplay.updateCesium({ ready: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize CesiumJS';
      this.statusDisplay.updateCesium({ ready: false, error: message });
      throw new Error(`CesiumJS init failed: ${message}`);
    }

    // Initialize chat interface
    try {
      this.chatInterface = new ChatInterface({
        containerId: config.chatContainer,
        onSubmit: (message) => this.handleUserMessage(message),
        placeholder: 'Type a command (e.g., "Show me Paris" or "Add a red marker at the Eiffel Tower")',
      });
    } catch (error) {
      throw new Error(`ChatInterface init failed: ${error instanceof Error ? error.message : error}`);
    }

    // Try to auto-load last used model
    const autoLoaded = await this.modelSelector.autoLoadLastModel();

    // Add welcome message only if NOT auto-loading (auto-load shows its own messages)
    if (!autoLoaded) {
      this.chatInterface.addMessage({
        role: 'system',
        content: 'Select a language model to get started. API models (Ollama, OpenAI) are recommended for best results.',
        timestamp: new Date(),
      });
    }
  }

  private async initializeCesium(containerId: string, token?: string): Promise<void> {
    // Check if Cesium is loaded
    if (typeof Cesium === 'undefined') {
      throw new Error('Cesium is not defined. The CesiumJS library failed to load.');
    }

    // Set Cesium Ion token if provided
    if (token) {
      Cesium.Ion.defaultAccessToken = token;
    }

    // Simple viewer setup (no Ion token required)
    this.viewer = new Cesium.Viewer(containerId, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: true,
      infoBox: true,
      sceneModePicker: false,
      selectionIndicator: true,
      navigationHelpButton: false,
      creditContainer: document.createElement('div'),
      skyBox: false,
      skyAtmosphere: new Cesium.SkyAtmosphere(),
    });

    // Create command executor
    this.commandExecutor = new CesiumCommandExecutor(this.viewer as never);

    // Create WASM MCP server
    this.mcpServer = new WasmMCPServer(
      (command: CesiumCommand) => this.commandExecutor!.execute(command)
    );
    await this.mcpServer.initialize();
    console.log('[CesiumSLMApp] WASM MCP server initialized');

    // Set up camera tracking to update MCP server with current camera state
    // This enables "addSphereHere" and similar tools that place objects at camera target
    this.setupCameraTracking();
  }

  /**
   * Set up camera tracking to keep MCP server aware of current camera position
   * This enables "Here" tools that place objects where the camera is looking
   */
  private setupCameraTracking(): void {
    if (!this.viewer || !this.mcpServer) return;

    const updateCameraState = () => {
      if (!this.viewer || !this.mcpServer) return;

      try {
        const camera = this.viewer.camera;
        const scene = this.viewer.scene;

        // Get camera position in degrees
        const camPos = camera.positionCartographic;
        const camLon = Cesium.Math.toDegrees(camPos.longitude);
        const camLat = Cesium.Math.toDegrees(camPos.latitude);
        const camHeight = camPos.height;

        // Calculate camera target (where camera is looking on the ground)
        // Use center of screen as the target point
        const canvas = scene.canvas;
        const centerX = canvas.clientWidth / 2;
        const centerY = canvas.clientHeight / 2;

        let targetLon = camLon;
        let targetLat = camLat;

        // Pick ellipsoid at screen center to get where camera is pointing
        const targetCartesian = camera.pickEllipsoid(
          { x: centerX, y: centerY },
          scene.globe?.ellipsoid
        );

        if (targetCartesian && Cesium.defined(targetCartesian)) {
          const targetCarto = Cesium.Cartographic.fromCartesian(targetCartesian);
          if (targetCarto) {
            targetLon = Cesium.Math.toDegrees(targetCarto.longitude);
            targetLat = Cesium.Math.toDegrees(targetCarto.latitude);
          }
        }

        // Update MCP server with camera state
        this.mcpServer!.updateCameraState(camLon, camLat, camHeight, targetLon, targetLat);

      } catch (error) {
        // Ignore errors during camera tracking
        console.debug('[CameraTracking] Error updating camera state:', error);
      }
    };

    // Update on camera move end (when user stops panning/zooming)
    this.viewer.camera.moveEnd.addEventListener(updateCameraState);

    // Also update on camera changed (for smoother tracking)
    this.viewer.camera.changed.addEventListener(updateCameraState);

    // Initial update
    updateCameraState();

    console.log('[CesiumSLMApp] Camera tracking enabled for "Here" tools');
  }

  private async loadModel(selection: ModelSelection): Promise<void> {
    if (!this.statusDisplay || !this.modelSelector || !this.chatInterface) {
      return;
    }

    this.currentModelSelection = selection;
    const displayName = selection.type === 'api'
      ? `${selection.provider}/${selection.modelId}`
      : selection.modelId;

    // Hide model selector during loading
    this.modelSelector.hide();

    this.statusDisplay.updateModel({
      loading: true,
      loaded: false,
      progress: 0,
      name: displayName,
    });

    try {
      if (selection.type === 'api') {
        // API-based model (Ollama, OpenAI, etc.)
        this.llmEngine = new APILLMEngine({
          provider: selection.provider!,
          model: selection.modelId,
          apiKey: selection.apiKey,
          baseUrl: selection.baseUrl,
          temperature: 0.7,
          maxTokens: 512,
        });

        await this.llmEngine.initialize();

        // Set up tools from MCP server
        if (this.mcpServer) {
          this.llmEngine.setTools(this.mcpServer.getToolDefinitions());
        }

        this.statusDisplay.updateModel({
          loaded: true,
          loading: false,
          progress: 1,
          name: displayName,
        });

      } else {
        // Browser-based WebLLM model
        // Custom fine-tuned models need low temperature for deterministic structured output
        // and must use the exact system prompt they were trained with
        const isCustomModel = selection.modelId in CUSTOM_MODEL_REGISTRY;
        this.llmEngine = new WebLLMEngine({
          modelId: selection.modelId,
          temperature: isCustomModel ? 0.1 : 0.7,
          topP: isCustomModel ? 0.9 : 0.9,
          maxTokens: 512,
          frequencyPenalty: isCustomModel ? 0 : 0.5,
          presencePenalty: isCustomModel ? 0 : 0.5,
          useCompactPrompt: !isCustomModel,
          customSystemPrompt: isCustomModel
            ? 'You are a CesiumJS controller assistant. Convert natural language commands to tool calls.'
            : undefined,
          onProgress: (progress) => {
            this.statusDisplay?.updateModel({
              loading: true,
              progress: progress.progress,
              name: displayName,
            });
          },
        });

        await this.llmEngine.initialize();

        // Set up tools from MCP server
        if (this.mcpServer) {
          this.llmEngine.setTools(this.mcpServer.getToolDefinitions());
        }

        this.statusDisplay.updateModel({
          loaded: true,
          loading: false,
          progress: 1,
          name: displayName,
        });
      }

      this.chatInterface.addMessage({
        role: 'system',
        content: `Model loaded: ${displayName}. You can now control the globe using natural language. Try saying "Show me Tokyo" or "Add a blue marker at the Statue of Liberty".`,
        timestamp: new Date(),
      });

      this.chatInterface.focus();

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load model';
      this.statusDisplay.updateModel({
        loaded: false,
        loading: false,
        error: message,
      });
      this.modelSelector.show();

      this.chatInterface.addMessage({
        role: 'system',
        content: `Failed to load model: ${message}. Please try a different model.`,
        timestamp: new Date(),
        isError: true,
      });
    }
  }

  /**
   * Reset (unload) the current model
   */
  private async resetModel(): Promise<void> {
    if (this.llmEngine) {
      try {
        await this.llmEngine.unload();
      } catch {
        // Ignore unload errors
      }
      this.llmEngine = null;
    }

    this.currentModelSelection = null;

    this.statusDisplay?.updateModel({
      loaded: false,
      loading: false,
      name: undefined,
    });

    // Show model selector for new selection
    this.modelSelector?.show();

    this.chatInterface?.addMessage({
      role: 'system',
      content: 'Model unloaded. Please select a new model to continue.',
      timestamp: new Date(),
    });
  }

  private async handleUserMessage(message: string): Promise<void> {
    if (!this.chatInterface) return;

    // Add user message to chat
    this.chatInterface.addMessage({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: message });

    // Check if LLM is loaded
    if (!this.llmEngine?.isReady()) {
      // Fall back to rule-based parsing
      const parseResult = this.commandParser.parseNaturalLanguage(message);

      if (parseResult.success && parseResult.commands.length > 0) {
        await this.executeCommands(parseResult.commands);
        this.chatInterface.addMessage({
          role: 'assistant',
          content: `Executed ${parseResult.commands.length} command(s)`,
          timestamp: new Date(),
          toolCalls: parseResult.commands.map(c => ({ name: c.type, arguments: c })),
        });
      } else {
        this.chatInterface.addMessage({
          role: 'system',
          content: 'Model not loaded. Please select and load a model to use natural language commands, or use simple commands like "fly to Paris".',
          timestamp: new Date(),
        });
      }
      return;
    }

    try {
      // Allow browser to repaint and show thinking indicator before LLM inference
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // Decompose command to check if it needs multi-step orchestration
      const commands = decomposeCommand(message);
      const isMultiStep = commands.length > 1;

      if (isMultiStep) {
        // Multi-step orchestrated mode
        this.chatInterface.addMessage({
          role: 'system',
          content: `Decomposed into ${commands.length} steps: ${commands.map((c, i) => `\n${i + 1}. ${c.rawText}`).join('')}`,
          timestamp: new Date(),
        });

        const allToolCalls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
        let lastLocation: string | null = null;
        let lastCoords: { longitude: number; latitude: number } | null = null;

        for (let i = 0; i < commands.length; i++) {
          const cmd = commands[i]!;
          let atomicPrompt = cmd.rawText;

          // Resolve references like "there", "it" using context from previous steps
          if (lastLocation && /\b(there|here|it|that location)\b/i.test(atomicPrompt)) {
            atomicPrompt = atomicPrompt.replace(/\b(there|here|it|that location)\b/gi, lastLocation);
          }

          try {
            const response = await this.llmEngine!.generate(atomicPrompt);
            const toolCall = this.extractToolCall(response);

            if (toolCall && this.mcpServer) {
              let args = await this.geocodeToolArgs(atomicPrompt, toolCall.name, toolCall.arguments);

              // If geocoding didn't resolve and we have coords from a previous step, inject them
              if (lastCoords && SINGLE_POINT_TOOLS.includes(toolCall.name)) {
                if (args.longitude === undefined || args.latitude === undefined ||
                    args.longitude === toolCall.arguments.longitude) {
                  args = { ...args, longitude: lastCoords.longitude, latitude: lastCoords.latitude };
                }
              }

              args = this.injectApiKeys(toolCall.name, args) as Record<string, unknown>;
              const result = await this.mcpServer.executeToolDirect(toolCall.name, args);
              allToolCalls.push({ name: toolCall.name, arguments: args });
              console.log(`Step ${i + 1} - Tool ${toolCall.name} result:`, result);

              // Track location context for subsequent steps
              if (typeof args.longitude === 'number' && typeof args.latitude === 'number') {
                lastCoords = { longitude: args.longitude, latitude: args.latitude };
              }
            }

            // Extract location name from this step for reference resolution
            const locEntity = cmd.entities.locations[0];
            if (locEntity) {
              lastLocation = locEntity.text;
            }
          } catch (stepError) {
            console.warn(`Step ${i + 1} failed:`, stepError);
          }
        }

        this.chatInterface.addMessage({
          role: 'assistant',
          content: `Executed ${allToolCalls.length}/${commands.length} steps.`,
          timestamp: new Date(),
          toolCalls: allToolCalls,
        });
      } else {
        // Simple single-command mode
        const response = await this.llmEngine.generate(message);
        const toolCall = this.extractToolCall(response);

        if (toolCall && this.mcpServer) {
          let args = await this.geocodeToolArgs(message, toolCall.name, toolCall.arguments);
          args = this.injectApiKeys(toolCall.name, args) as Record<string, unknown>;
          const result = await this.mcpServer.executeToolDirect(toolCall.name, args);
          console.log(`Tool ${toolCall.name} result:`, result);

          this.chatInterface.addMessage({
            role: 'assistant',
            content: response.content,
            timestamp: new Date(),
            toolCalls: [{ name: toolCall.name, arguments: args }],
          });
        } else {
          this.chatInterface.addMessage({
            role: 'assistant',
            content: response.content,
            timestamp: new Date(),
          });
        }
      }

      // Keep conversation history manageable
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-16);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      this.chatInterface.addMessage({
        role: 'system',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
        isError: true,
      });
    }
  }

  /**
   * Extract a tool call from an LLM response (structured or text-parsed)
   */
  private extractToolCall(response: { content: string; toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }> }): { name: string; arguments: Record<string, unknown> } | null {
    if (response.toolCalls && response.toolCalls.length > 0) {
      return response.toolCalls[0] ?? null;
    }
    const parsed = parseToolCallFromResponse(response.content);
    if (parsed) {
      return { name: parsed.tool, arguments: parsed.arguments };
    }
    return null;
  }

  /**
   * Apply geocoding corrections based on tool type
   */
  private async geocodeToolArgs(
    userInput: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (SINGLE_POINT_TOOLS.includes(toolName)) {
      return correctFlyToCoordinates(userInput, args);
    }
    if (MULTI_POINT_TOOLS.includes(toolName)) {
      return correctPolylineCoordinates(userInput, args);
    }
    return args;
  }

  /**
   * Inject API keys from settings into tool arguments for tools that need them
   */
  private injectApiKeys(toolName: string, args: unknown): unknown {
    // Tools that require OpenRouteService API key
    const orsTools = ['getRoute', 'getIsochrone', 'walkTo', 'driveTo', 'bikeTo'];

    if (orsTools.includes(toolName)) {
      const orsKey = getApiKey('openRouteService');
      if (orsKey) {
        // Add API key to arguments if not already provided
        const argsObj = (args && typeof args === 'object') ? args as Record<string, unknown> : {};
        if (!argsObj.apiKey) {
          return { ...argsObj, apiKey: orsKey };
        }
      }
    }

    return args;
  }

  private async executeCommands(commands: CesiumCommand[]): Promise<void> {
    if (!this.commandExecutor) return;

    for (const command of commands) {
      try {
        const result = await this.commandExecutor.execute(command);
        console.log(`Command ${command.type} result:`, result);
      } catch (error) {
        console.error(`Failed to execute command ${command.type}:`, error);
      }
    }
  }

  async destroy(): Promise<void> {
    if (this.llmEngine) {
      await this.llmEngine.unload();
    }
    if (this.viewer) {
      this.viewer.destroy();
    }
  }
}

// Export for use
export { RECOMMENDED_MODELS };

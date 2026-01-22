/**
 * Cesium SLM - Main Application
 * Integrates WebLLM, MCP Server, and CesiumJS for natural language globe control
 */

import { WebLLMEngine, checkWebGPUSupport, RECOMMENDED_MODELS } from './llm/web-llm-engine';
import { CommandParser } from './llm/command-parser';
import { CesiumCommandExecutor } from './cesium/command-executor';
import { CesiumMCPServer } from './mcp/cesium-mcp-server';
import { BrowserTransport } from './mcp/browser-transport';
import { ChatInterface } from './ui/chat-interface';
import { StatusDisplay } from './ui/status-display';
import { ModelSelector } from './ui/model-selector';
import type { CesiumCommand } from './cesium/types';

// Types for Cesium (loaded from CDN)
declare const Cesium: {
  Viewer: new (container: string | HTMLElement, options?: object) => CesiumViewer;
  Ion: { defaultAccessToken: string };
  createWorldTerrainAsync: () => Promise<unknown>;
};

interface CesiumViewer {
  camera: unknown;
  scene: unknown;
  clock: unknown;
  dataSources: unknown;
  entities: unknown;
  imageryLayers: unknown;
  terrainProvider: unknown;
  destroy: () => void;
}

export class CesiumSLMApp {
  private llmEngine: WebLLMEngine | null = null;
  private commandParser: CommandParser;
  private commandExecutor: CesiumCommandExecutor | null = null;
  private mcpServer: CesiumMCPServer | null = null;
  private viewer: CesiumViewer | null = null;

  private chatInterface: ChatInterface | null = null;
  private statusDisplay: StatusDisplay | null = null;
  private modelSelector: ModelSelector | null = null;

  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

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
    this.statusDisplay = new StatusDisplay(config.statusContainer);

    // Check WebGPU support
    const webgpuSupport = await checkWebGPUSupport();
    this.statusDisplay.updateWebGPU({
      supported: webgpuSupport.supported,
      error: webgpuSupport.error,
    });

    if (!webgpuSupport.supported) {
      throw new Error(webgpuSupport.error || 'WebGPU not supported');
    }

    // Initialize model selector
    this.modelSelector = new ModelSelector({
      containerId: config.modelSelectorContainer,
      onSelect: (modelId) => this.loadModel(modelId),
      defaultModel: RECOMMENDED_MODELS.small[1], // Qwen2.5-1.5B by default
    });

    // Initialize CesiumJS
    try {
      await this.initializeCesium(config.cesiumContainer, config.cesiumToken);
      this.statusDisplay.updateCesium({ ready: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize CesiumJS';
      this.statusDisplay.updateCesium({ ready: false, error: message });
      throw error;
    }

    // Initialize chat interface
    this.chatInterface = new ChatInterface({
      containerId: config.chatContainer,
      onSubmit: (message) => this.handleUserMessage(message),
      placeholder: 'Type a command (e.g., "Show me Paris" or "Add a red marker at the Eiffel Tower")',
    });

    // Add welcome message
    this.chatInterface.addMessage({
      role: 'system',
      content: 'Welcome! Select a language model above to get started. Once loaded, you can control the globe using natural language.',
      timestamp: new Date(),
    });
  }

  private async initializeCesium(containerId: string, token?: string): Promise<void> {
    // Set Cesium Ion token if provided
    if (token) {
      Cesium.Ion.defaultAccessToken = token;
    }

    // Create the viewer
    this.viewer = new Cesium.Viewer(containerId, {
      terrain: await Cesium.createWorldTerrainAsync(),
      animation: true,
      timeline: true,
      fullscreenButton: true,
      vrButton: false,
      geocoder: true,
      homeButton: true,
      infoBox: true,
      sceneModePicker: true,
      selectionIndicator: true,
      navigationHelpButton: true,
      baseLayerPicker: true,
    });

    // Create command executor
    this.commandExecutor = new CesiumCommandExecutor(this.viewer as never);

    // Create MCP server
    const transport = new BrowserTransport();
    await transport.connect();

    this.mcpServer = new CesiumMCPServer(
      transport,
      (command: CesiumCommand) => this.commandExecutor!.execute(command)
    );
  }

  private async loadModel(modelId: string): Promise<void> {
    if (!this.statusDisplay || !this.modelSelector || !this.chatInterface) {
      return;
    }

    // Hide model selector during loading
    this.modelSelector.hide();

    this.statusDisplay.updateModel({
      loading: true,
      loaded: false,
      progress: 0,
      name: modelId,
    });

    try {
      this.llmEngine = new WebLLMEngine({
        modelId,
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 512,
        onProgress: (progress) => {
          this.statusDisplay?.updateModel({
            loading: true,
            progress: progress.progress,
            name: modelId,
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
        name: modelId,
      });

      this.chatInterface.addMessage({
        role: 'system',
        content: `Model loaded successfully! You can now control the globe using natural language. Try saying "Show me Tokyo" or "Add a blue marker at the Statue of Liberty".`,
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
      // Generate response from LLM
      const response = await this.llmEngine.generate(message, this.conversationHistory as never);

      // Add response to conversation history
      this.conversationHistory.push({ role: 'assistant', content: response.content });

      // Check for tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        const parseResult = this.commandParser.parseToolCalls(response.toolCalls);

        if (parseResult.success) {
          await this.executeCommands(parseResult.commands);
        }

        this.chatInterface.addMessage({
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          toolCalls: response.toolCalls.map(tc => ({ name: tc.name, arguments: tc.arguments })),
        });
      } else {
        // No tool calls - just a text response
        this.chatInterface.addMessage({
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
        });
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

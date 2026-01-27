/**
 * Chat Interface Component
 * Provides the UI for natural language input and response display
 */

import { VoiceInput, VoiceInputButton } from './voice-input';
import { KNOWN_LOCATIONS } from '../llm/prompts';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{ name: string; arguments: unknown }>;
  isError?: boolean;
}

export interface ChatInterfaceConfig {
  containerId: string;
  onSubmit: (message: string) => Promise<void>;
  placeholder?: string;
  enableVoiceInput?: boolean;
  voiceAutoSubmit?: boolean;
  voiceLanguage?: string;
  maxHistorySize?: number;
}

export interface AutocompleteSuggestion {
  text: string;
  type: 'history' | 'location' | 'template';
  description?: string;
}

/**
 * Command history manager with localStorage persistence
 */
export class CommandHistory {
  private history: string[] = [];
  private currentIndex: number = -1;
  private tempInput: string = '';
  private readonly storageKey = 'cesium-slm-command-history';
  private readonly maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.history = JSON.parse(stored);
        // Ensure we don't exceed max size
        if (this.history.length > this.maxSize) {
          this.history = this.history.slice(-this.maxSize);
          this.saveToStorage();
        }
      }
    } catch {
      this.history = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    } catch {
      // Storage might be full or unavailable
    }
  }

  add(command: string): void {
    const trimmed = command.trim();
    if (!trimmed) return;

    // Remove duplicate if exists
    const existingIndex = this.history.indexOf(trimmed);
    if (existingIndex !== -1) {
      this.history.splice(existingIndex, 1);
    }

    // Add to end
    this.history.push(trimmed);

    // Enforce max size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }

    this.saveToStorage();
    this.resetNavigation();
  }

  resetNavigation(): void {
    this.currentIndex = -1;
    this.tempInput = '';
  }

  startNavigation(currentInput: string): void {
    if (this.currentIndex === -1) {
      this.tempInput = currentInput;
    }
  }

  navigateUp(currentInput: string): string | null {
    if (this.history.length === 0) return null;

    this.startNavigation(currentInput);

    if (this.currentIndex === -1) {
      // Start from the most recent
      this.currentIndex = this.history.length - 1;
    } else if (this.currentIndex > 0) {
      // Go to older command
      this.currentIndex--;
    }
    // If at oldest, stay there (wrap behavior: keep at oldest)

    return this.history[this.currentIndex] ?? null;
  }

  navigateDown(): string | null {
    if (this.currentIndex === -1) return null;

    if (this.currentIndex < this.history.length - 1) {
      // Go to newer command
      this.currentIndex++;
      return this.history[this.currentIndex] ?? null;
    } else {
      // At newest, return to temp input
      this.currentIndex = -1;
      return this.tempInput;
    }
  }

  getRecent(count: number = 10): string[] {
    return this.history.slice(-count).reverse();
  }

  getMatching(prefix: string, limit: number = 5): string[] {
    if (!prefix) return [];
    const lowerPrefix = prefix.toLowerCase();
    return this.history
      .filter(cmd => cmd.toLowerCase().startsWith(lowerPrefix))
      .slice(-limit)
      .reverse();
  }

  clear(): void {
    this.history = [];
    this.saveToStorage();
    this.resetNavigation();
  }
}

/**
 * Common command templates for autocomplete
 */
const COMMAND_TEMPLATES = [
  { text: 'Show me ', description: 'Navigate to a location' },
  { text: 'Fly to ', description: 'Fly camera to a location' },
  { text: 'Add marker at ', description: 'Add a point marker' },
  { text: 'Add a red marker at ', description: 'Add a colored marker' },
  { text: 'Draw a line from ', description: 'Draw a polyline' },
  { text: 'Draw a circle around ', description: 'Draw a circle' },
  { text: 'Add label ', description: 'Add a text label' },
  { text: 'Zoom in', description: 'Zoom the camera in' },
  { text: 'Zoom out', description: 'Zoom the camera out' },
  { text: 'Switch to 2D view', description: 'Change to 2D map mode' },
  { text: 'Switch to 3D view', description: 'Change to 3D globe mode' },
  { text: 'Clear all', description: 'Remove all markers' },
  { text: 'Look at ', description: 'Orient camera toward a location' },
];

/**
 * Get all location names from KNOWN_LOCATIONS
 */
function getAllLocationNames(): Array<{ name: string; category: string }> {
  const locations: Array<{ name: string; category: string }> = [];

  for (const [name] of Object.entries(KNOWN_LOCATIONS.cities)) {
    locations.push({ name, category: 'city' });
  }
  for (const [name] of Object.entries(KNOWN_LOCATIONS.landmarks)) {
    locations.push({ name, category: 'landmark' });
  }
  for (const [name] of Object.entries(KNOWN_LOCATIONS.natural)) {
    locations.push({ name, category: 'natural' });
  }

  return locations;
}

export class ChatInterface {
  private container: HTMLElement;
  private messagesContainer: HTMLElement;
  private inputContainer: HTMLElement;
  private inputWrapper: HTMLElement;
  private input: HTMLTextAreaElement;
  private submitButton: HTMLButtonElement;
  private voiceInputButton: VoiceInputButton | null = null;
  private onSubmit: (message: string) => Promise<void>;
  private isProcessing: boolean = false;
  private messages: ChatMessage[] = [];
  private voiceAutoSubmit: boolean;

  // Command history
  private commandHistory: CommandHistory;

  // Autocomplete
  private autocompleteDropdown: HTMLElement | null = null;
  private suggestions: AutocompleteSuggestion[] = [];
  private selectedSuggestionIndex: number = -1;
  private isAutocompleteVisible: boolean = false;
  private allLocations: Array<{ name: string; category: string }>;

  constructor(config: ChatInterfaceConfig) {
    const container = document.getElementById(config.containerId);
    if (!container) {
      throw new Error(`Container element '${config.containerId}' not found`);
    }

    this.container = container;
    this.onSubmit = config.onSubmit;
    this.voiceAutoSubmit = config.voiceAutoSubmit ?? true;
    this.commandHistory = new CommandHistory(config.maxHistorySize ?? 50);
    this.allLocations = getAllLocationNames();

    // Create UI elements
    this.container.innerHTML = '';
    this.container.className = 'chat-interface';

    // Messages area
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'chat-messages';
    this.container.appendChild(this.messagesContainer);

    // Input area
    this.inputContainer = document.createElement('div');
    this.inputContainer.className = 'chat-input-container';

    // Input wrapper for positioning autocomplete
    this.inputWrapper = document.createElement('div');
    this.inputWrapper.className = 'chat-input-wrapper';

    this.input = document.createElement('textarea');
    this.input.className = 'chat-input';
    this.input.placeholder = config.placeholder || 'Type a command (e.g., "Show me Paris" or "Add a marker at the Eiffel Tower")';
    this.input.rows = 4;

    this.inputWrapper.appendChild(this.input);
    this.createAutocompleteDropdown();

    this.submitButton = document.createElement('button');
    this.submitButton.className = 'chat-submit';
    this.submitButton.textContent = 'Send';
    this.submitButton.type = 'button';

    this.inputContainer.appendChild(this.inputWrapper);

    // Add voice input button if enabled (default: true if supported)
    const enableVoice = config.enableVoiceInput ?? true;
    if (enableVoice && VoiceInput.isSupported()) {
      this.setupVoiceInput(config.voiceLanguage, config.voiceAutoSubmit);
    }

    this.inputContainer.appendChild(this.submitButton);
    this.container.appendChild(this.inputContainer);

    // Event listeners
    this.setupEventListeners();

    // Add styles
    this.injectStyles();
  }

  private createAutocompleteDropdown(): void {
    this.autocompleteDropdown = document.createElement('div');
    this.autocompleteDropdown.className = 'chat-autocomplete-dropdown';
    this.autocompleteDropdown.style.display = 'none';
    this.inputWrapper.appendChild(this.autocompleteDropdown);
  }

  private updateSuggestions(): void {
    const inputValue = this.input.value;
    this.suggestions = [];
    this.selectedSuggestionIndex = -1;

    if (!inputValue.trim()) {
      this.hideAutocomplete();
      return;
    }

    const lowerInput = inputValue.toLowerCase();

    // 1. Recent commands that match
    const matchingHistory = this.commandHistory.getMatching(inputValue, 3);
    for (const cmd of matchingHistory) {
      this.suggestions.push({
        text: cmd,
        type: 'history',
        description: 'Recent command',
      });
    }

    // 2. Location names that match
    const matchingLocations = this.allLocations
      .filter(loc => loc.name.toLowerCase().includes(lowerInput))
      .slice(0, 3);
    for (const loc of matchingLocations) {
      this.suggestions.push({
        text: `Show me ${loc.name}`,
        type: 'location',
        description: `${loc.category}`,
      });
    }

    // 3. Command templates that match
    const matchingTemplates = COMMAND_TEMPLATES
      .filter(t => t.text.toLowerCase().startsWith(lowerInput))
      .slice(0, 2);
    for (const template of matchingTemplates) {
      this.suggestions.push({
        text: template.text,
        type: 'template',
        description: template.description,
      });
    }

    // Limit total suggestions
    this.suggestions = this.suggestions.slice(0, 8);

    if (this.suggestions.length > 0) {
      this.showAutocomplete();
    } else {
      this.hideAutocomplete();
    }
  }

  private showAutocomplete(): void {
    if (!this.autocompleteDropdown) return;

    this.autocompleteDropdown.innerHTML = '';

    for (let i = 0; i < this.suggestions.length; i++) {
      const suggestion = this.suggestions[i];
      if (!suggestion) continue;

      const item = document.createElement('div');
      item.className = 'chat-autocomplete-item';
      item.dataset.index = i.toString();

      const textSpan = document.createElement('span');
      textSpan.className = 'chat-autocomplete-text';
      textSpan.textContent = suggestion.text;

      const typeSpan = document.createElement('span');
      typeSpan.className = `chat-autocomplete-type chat-autocomplete-type-${suggestion.type}`;
      typeSpan.textContent = suggestion.description || suggestion.type;

      item.appendChild(textSpan);
      item.appendChild(typeSpan);

      item.addEventListener('click', () => this.selectSuggestion(i));
      item.addEventListener('mouseenter', () => this.highlightSuggestion(i));

      this.autocompleteDropdown.appendChild(item);
    }

    this.autocompleteDropdown.style.display = 'block';
    this.isAutocompleteVisible = true;
  }

  private hideAutocomplete(): void {
    if (!this.autocompleteDropdown) return;
    this.autocompleteDropdown.style.display = 'none';
    this.isAutocompleteVisible = false;
    this.selectedSuggestionIndex = -1;
  }

  private highlightSuggestion(index: number): void {
    if (!this.autocompleteDropdown) return;

    // Remove previous highlight
    const items = this.autocompleteDropdown.querySelectorAll('.chat-autocomplete-item');
    items.forEach(item => item.classList.remove('chat-autocomplete-item-selected'));

    // Add new highlight
    if (index >= 0 && index < items.length) {
      const item = items[index];
      if (item) {
        item.classList.add('chat-autocomplete-item-selected');
      }
      this.selectedSuggestionIndex = index;
    }
  }

  private selectSuggestion(index: number): void {
    if (index < 0 || index >= this.suggestions.length) return;

    const suggestion = this.suggestions[index];
    if (!suggestion) return;

    this.input.value = suggestion.text;
    this.input.focus();

    // Move cursor to end
    this.input.setSelectionRange(suggestion.text.length, suggestion.text.length);

    this.hideAutocomplete();

    // Resize input
    this.input.style.height = 'auto';
    this.input.style.height = Math.min(this.input.scrollHeight, 150) + 'px';
  }

  private navigateAutocomplete(direction: 'up' | 'down'): void {
    if (!this.isAutocompleteVisible || this.suggestions.length === 0) return;

    let newIndex = this.selectedSuggestionIndex;

    if (direction === 'down') {
      newIndex = newIndex < this.suggestions.length - 1 ? newIndex + 1 : 0;
    } else {
      newIndex = newIndex > 0 ? newIndex - 1 : this.suggestions.length - 1;
    }

    this.highlightSuggestion(newIndex);
  }

  private setupVoiceInput(language?: string, autoSubmit?: boolean): void {
    // Create a container for the voice button
    const voiceButtonContainer = document.createElement('div');
    voiceButtonContainer.className = 'voice-button-container';

    this.voiceInputButton = new VoiceInputButton({
      container: voiceButtonContainer,
      language: language ?? 'en-US',
      autoSubmit: autoSubmit ?? true,
      onTranscript: (transcript: string, isFinal: boolean) => {
        // Update the input field with the transcript
        this.input.value = transcript;
        this.input.style.height = 'auto';
        this.input.style.height = Math.min(this.input.scrollHeight, 150) + 'px';

        // Auto-submit if enabled and this is the final result
        if (isFinal && this.voiceAutoSubmit && transcript.trim()) {
          this.handleSubmit();
        }
      },
      onError: (error: string) => {
        this.addMessage({
          role: 'system',
          content: error,
          timestamp: new Date(),
          isError: true,
        });
      },
      onStateChange: (isListening: boolean) => {
        // Update input placeholder based on voice state
        if (isListening) {
          this.input.placeholder = 'Listening... speak now';
        } else {
          this.input.placeholder = 'Type a command (e.g., "Show me Paris" or "Add a marker at the Eiffel Tower")';
        }
      },
    });

    this.inputContainer.appendChild(voiceButtonContainer);
  }

  private setupEventListeners(): void {
    this.submitButton.addEventListener('click', () => this.handleSubmit());

    this.input.addEventListener('keydown', (e) => {
      // Handle autocomplete navigation when dropdown is visible
      if (this.isAutocompleteVisible) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.navigateAutocomplete('down');
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.navigateAutocomplete('up');
          return;
        }
        if (e.key === 'Enter' && this.selectedSuggestionIndex >= 0) {
          e.preventDefault();
          this.selectSuggestion(this.selectedSuggestionIndex);
          return;
        }
        if (e.key === 'Tab' && this.suggestions.length > 0) {
          e.preventDefault();
          // Select first suggestion if none selected, otherwise selected one
          const index = this.selectedSuggestionIndex >= 0 ? this.selectedSuggestionIndex : 0;
          this.selectSuggestion(index);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          this.hideAutocomplete();
          return;
        }
      }

      // Handle command history navigation (only when autocomplete is not active)
      if (e.key === 'ArrowUp' && !this.isAutocompleteVisible) {
        // Only navigate history when cursor is at start or input is single line
        const isAtStart = this.input.selectionStart === 0 && this.input.selectionEnd === 0;
        const isSingleLine = !this.input.value.includes('\n');

        if (isAtStart || isSingleLine) {
          e.preventDefault();
          const prev = this.commandHistory.navigateUp(this.input.value);
          if (prev !== null) {
            this.input.value = prev;
            // Move cursor to end
            this.input.setSelectionRange(prev.length, prev.length);
          }
          return;
        }
      }

      if (e.key === 'ArrowDown' && !this.isAutocompleteVisible) {
        // Only navigate history when cursor is at end or input is single line
        const isAtEnd = this.input.selectionStart === this.input.value.length;
        const isSingleLine = !this.input.value.includes('\n');

        if (isAtEnd || isSingleLine) {
          e.preventDefault();
          const next = this.commandHistory.navigateDown();
          if (next !== null) {
            this.input.value = next;
            // Move cursor to end
            this.input.setSelectionRange(next.length, next.length);
          }
          return;
        }
      }

      // Handle submit
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSubmit();
      }
    });

    // Auto-resize textarea and update suggestions
    this.input.addEventListener('input', () => {
      this.input.style.height = 'auto';
      this.input.style.height = Math.min(this.input.scrollHeight, 150) + 'px';

      // Update autocomplete suggestions
      this.updateSuggestions();

      // Reset history navigation when user types
      this.commandHistory.resetNavigation();
    });

    // Hide autocomplete on blur (with delay to allow click)
    this.input.addEventListener('blur', () => {
      setTimeout(() => this.hideAutocomplete(), 150);
    });

    // Show autocomplete on focus if there's input
    this.input.addEventListener('focus', () => {
      if (this.input.value.trim()) {
        this.updateSuggestions();
      }
    });

    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.inputWrapper.contains(e.target as Node)) {
        this.hideAutocomplete();
      }
    });
  }

  private async handleSubmit(): Promise<void> {
    const message = this.input.value.trim();
    if (!message || this.isProcessing) {
      return;
    }

    // Hide autocomplete and add to history
    this.hideAutocomplete();
    this.commandHistory.add(message);

    this.input.value = '';
    this.input.style.height = 'auto';
    this.setProcessing(true);

    try {
      await this.onSubmit(message);
    } catch (error) {
      this.addMessage({
        role: 'system',
        content: error instanceof Error ? error.message : 'An error occurred',
        timestamp: new Date(),
        isError: true,
      });
    } finally {
      this.setProcessing(false);
    }
  }

  addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
  }

  private renderMessage(message: ChatMessage): void {
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message chat-message-${message.role}${message.isError ? ' chat-message-error' : ''}`;

    const roleEl = document.createElement('div');
    roleEl.className = 'chat-message-role';
    roleEl.textContent = message.role === 'user' ? 'You' : message.role === 'assistant' ? 'Assistant' : 'System';

    const contentEl = document.createElement('div');
    contentEl.className = 'chat-message-content';

    // Check if the content is a JSON tool call and format it nicely
    if (message.role === 'assistant' && message.content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(message.content);
        if (parsed.tool) {
          contentEl.innerHTML = `<code class="tool-call">Tool: ${this.escapeHtml(parsed.tool)}<br>Args: ${this.escapeHtml(JSON.stringify(parsed.arguments, null, 2))}</code>`;
        } else {
          contentEl.textContent = message.content;
        }
      } catch {
        contentEl.textContent = message.content;
      }
    } else {
      contentEl.textContent = message.content;
    }

    const timeEl = document.createElement('div');
    timeEl.className = 'chat-message-time';
    timeEl.textContent = message.timestamp.toLocaleTimeString();

    messageEl.appendChild(roleEl);
    messageEl.appendChild(contentEl);
    if (message.toolCalls && message.toolCalls.length > 0) {
      const toolsEl = document.createElement('div');
      toolsEl.className = 'chat-message-tools';
      toolsEl.innerHTML = `<strong>Actions:</strong> ${message.toolCalls.map(t => `<code>${this.escapeHtml(t.name)}</code>`).join(', ')}`;
      messageEl.appendChild(toolsEl);
    }
    messageEl.appendChild(timeEl);

    this.messagesContainer.appendChild(messageEl);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private scrollToBottom(): void {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private thinkingIndicator: HTMLElement | null = null;

  setProcessing(processing: boolean): void {
    this.isProcessing = processing;
    this.submitButton.disabled = processing;
    this.input.disabled = processing;
    this.submitButton.textContent = processing ? 'Processing...' : 'Send';

    // Show/hide thinking indicator
    if (processing) {
      this.showThinkingIndicator();
    } else {
      this.hideThinkingIndicator();
    }

    // Also disable/enable voice input
    if (this.voiceInputButton) {
      if (processing) {
        this.voiceInputButton.disable();
      } else {
        this.voiceInputButton.enable();
      }
    }
  }

  private showThinkingIndicator(): void {
    if (this.thinkingIndicator) return;

    this.thinkingIndicator = document.createElement('div');
    this.thinkingIndicator.className = 'chat-message chat-message-assistant chat-thinking';
    this.thinkingIndicator.innerHTML = `
      <div class="chat-message-role">ASSISTANT</div>
      <div class="chat-thinking-dots">
        <span></span><span></span><span></span>
      </div>
    `;
    this.messagesContainer.appendChild(this.thinkingIndicator);
    this.scrollToBottom();
  }

  private hideThinkingIndicator(): void {
    if (this.thinkingIndicator) {
      this.thinkingIndicator.remove();
      this.thinkingIndicator = null;
    }
  }

  clear(): void {
    this.messages = [];
    this.messagesContainer.innerHTML = '';
  }

  focus(): void {
    this.input.focus();
  }

  private injectStyles(): void {
    if (document.getElementById('chat-interface-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'chat-interface-styles';
    style.textContent = `
      .chat-interface {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1a1a2e;
        border-radius: 8px;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .chat-messages {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .chat-message {
        padding: 12px;
        border-radius: 8px;
        max-width: 85%;
      }

      .chat-message-user {
        background: #4a4a8a;
        color: white;
        align-self: flex-end;
      }

      .chat-message-assistant {
        background: #2d2d4a;
        color: #e0e0e0;
        align-self: flex-start;
      }

      .chat-message-system {
        background: #3d3d3d;
        color: #aaa;
        align-self: center;
        font-size: 0.9em;
      }

      .chat-message-error {
        background: #4a2a2a !important;
        color: #ff8888 !important;
      }

      .chat-message-role {
        font-weight: 600;
        font-size: 0.8em;
        margin-bottom: 4px;
        text-transform: uppercase;
        opacity: 0.7;
      }

      .chat-message-content {
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .chat-message-content code.tool-call {
        display: block;
        background: #1a1a2e;
        padding: 8px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.85em;
        white-space: pre-wrap;
      }

      .chat-message-tools {
        margin-top: 8px;
        font-size: 0.85em;
        opacity: 0.8;
      }

      .chat-message-tools code {
        background: #1a1a2e;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Monaco', 'Menlo', monospace;
      }

      .chat-message-time {
        font-size: 0.75em;
        opacity: 0.5;
        margin-top: 4px;
      }

      .chat-input-container {
        flex-shrink: 0;
        display: flex;
        gap: 8px;
        padding: 12px;
        background: #16162a;
        border-top: 1px solid #2d2d4a;
      }

      .chat-input-wrapper {
        flex: 1;
        position: relative;
      }

      .chat-input {
        width: 100%;
        padding: 12px;
        border: 1px solid #3d3d5a;
        border-radius: 8px;
        background: #1a1a2e;
        color: white;
        font-size: 14px;
        resize: none;
        font-family: inherit;
        line-height: 1.4;
        box-sizing: border-box;
      }

      .chat-input:focus {
        outline: none;
        border-color: #6a6aaa;
      }

      .chat-input::placeholder {
        color: #666;
      }

      /* Autocomplete Dropdown Styles */
      .chat-autocomplete-dropdown {
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        background: #252540;
        border: 1px solid #3d3d5a;
        border-radius: 8px;
        margin-bottom: 4px;
        max-height: 280px;
        overflow-y: auto;
        z-index: 1000;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
        animation: autocomplete-fade-in 0.15s ease-out;
      }

      @keyframes autocomplete-fade-in {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .chat-autocomplete-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        cursor: pointer;
        transition: background 0.1s ease;
        border-bottom: 1px solid #2d2d4a;
      }

      .chat-autocomplete-item:last-child {
        border-bottom: none;
      }

      .chat-autocomplete-item:hover,
      .chat-autocomplete-item-selected {
        background: #3a3a5a;
      }

      .chat-autocomplete-text {
        color: #e0e0e0;
        font-size: 14px;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-right: 12px;
      }

      .chat-autocomplete-type {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 4px;
        text-transform: uppercase;
        font-weight: 500;
        flex-shrink: 0;
      }

      .chat-autocomplete-type-history {
        background: #4a4a6a;
        color: #aaa;
      }

      .chat-autocomplete-type-location {
        background: #2a4a5a;
        color: #7ac;
      }

      .chat-autocomplete-type-template {
        background: #4a3a5a;
        color: #a7c;
      }

      /* Scrollbar styling for autocomplete */
      .chat-autocomplete-dropdown::-webkit-scrollbar {
        width: 6px;
      }

      .chat-autocomplete-dropdown::-webkit-scrollbar-track {
        background: #1a1a2e;
      }

      .chat-autocomplete-dropdown::-webkit-scrollbar-thumb {
        background: #4a4a6a;
        border-radius: 3px;
      }

      .chat-autocomplete-dropdown::-webkit-scrollbar-thumb:hover {
        background: #5a5a7a;
      }

      .chat-submit {
        padding: 12px 24px;
        background: #5a5a9a;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.2s;
      }

      .chat-submit:hover:not(:disabled) {
        background: #6a6aaa;
      }

      .chat-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .voice-button-container {
        display: flex;
        align-items: center;
      }

      /* Thinking indicator */
      .chat-thinking {
        animation: thinking-pulse 1.5s ease-in-out infinite;
      }

      .chat-thinking-dots {
        display: flex;
        gap: 4px;
        padding: 8px 0;
      }

      .chat-thinking-dots span {
        width: 8px;
        height: 8px;
        background: #6a6aaa;
        border-radius: 50%;
        animation: thinking-bounce 1.4s ease-in-out infinite;
      }

      .chat-thinking-dots span:nth-child(1) {
        animation-delay: 0s;
      }

      .chat-thinking-dots span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .chat-thinking-dots span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes thinking-bounce {
        0%, 80%, 100% {
          transform: scale(0.6);
          opacity: 0.5;
        }
        40% {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes thinking-pulse {
        0%, 100% {
          opacity: 0.8;
        }
        50% {
          opacity: 1;
        }
      }

      .chat-input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: #151525;
      }
    `;

    document.head.appendChild(style);
  }
}

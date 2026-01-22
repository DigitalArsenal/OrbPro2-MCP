/**
 * Voice Input Component
 * Provides speech-to-text functionality using the Web Speech API
 */

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onspeechend: ((event: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface VoiceInputConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  autoSubmit?: boolean;
}

export interface VoiceInputEvents {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onInterim?: (transcript: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * VoiceInput class for handling speech recognition
 */
export class VoiceInput {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private config: Required<VoiceInputConfig>;
  private events: VoiceInputEvents = {};

  constructor(config: VoiceInputConfig = {}) {
    this.config = {
      language: config.language ?? 'en-US',
      continuous: config.continuous ?? false,
      interimResults: config.interimResults ?? true,
      maxAlternatives: config.maxAlternatives ?? 1,
      autoSubmit: config.autoSubmit ?? true,
    };

    this.initRecognition();
  }

  /**
   * Check if the Web Speech API is supported in the current browser
   */
  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Initialize the SpeechRecognition instance
   */
  private initRecognition(): void {
    if (!VoiceInput.isSupported()) {
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || !result[0]) {
          continue;
        }
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && this.events.onInterim) {
        this.events.onInterim(interimTranscript);
      }

      if (finalTranscript && this.events.onResult) {
        this.events.onResult(finalTranscript, true);
      } else if (interimTranscript && this.events.onResult) {
        this.events.onResult(interimTranscript, false);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'Speech recognition error';

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'aborted':
          errorMessage = 'Speech recognition aborted.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your audio settings.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone permissions.';
          break;
        case 'network':
          errorMessage = 'Network error occurred during speech recognition.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not allowed.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }

      if (this.events.onError) {
        this.events.onError(errorMessage);
      }

      this.isListening = false;
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.events.onStart) {
        this.events.onStart();
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.events.onEnd) {
        this.events.onEnd();
      }
    };
  }

  /**
   * Set event handlers
   */
  setEvents(events: VoiceInputEvents): void {
    this.events = { ...this.events, ...events };
  }

  /**
   * Start listening for speech
   */
  start(): boolean {
    if (!this.recognition) {
      if (this.events.onError) {
        this.events.onError('Speech recognition is not supported in this browser.');
      }
      return false;
    }

    if (this.isListening) {
      return true;
    }

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      if (this.events.onError) {
        this.events.onError('Failed to start speech recognition.');
      }
      return false;
    }
  }

  /**
   * Stop listening for speech
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Toggle listening state
   */
  toggle(): boolean {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }

  /**
   * Abort listening immediately
   */
  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  /**
   * Get current listening state
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Set language for recognition
   */
  setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  /**
   * Set continuous listening mode
   */
  setContinuous(continuous: boolean): void {
    this.config.continuous = continuous;
    if (this.recognition) {
      this.recognition.continuous = continuous;
    }
  }

  /**
   * Get the auto-submit setting
   */
  getAutoSubmit(): boolean {
    return this.config.autoSubmit;
  }

  /**
   * Set auto-submit setting
   */
  setAutoSubmit(autoSubmit: boolean): void {
    this.config.autoSubmit = autoSubmit;
  }
}

/**
 * Voice Input Button Configuration
 */
export interface VoiceInputButtonConfig {
  container: HTMLElement;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStateChange?: (isListening: boolean) => void;
  language?: string;
  continuous?: boolean;
  autoSubmit?: boolean;
}

/**
 * VoiceInputButton component
 * Renders a microphone button with visual feedback
 */
export class VoiceInputButton {
  private container: HTMLElement;
  private button: HTMLButtonElement;
  private voiceInput: VoiceInput;
  private interimDisplay: HTMLDivElement | null = null;
  private onTranscript?: (transcript: string, isFinal: boolean) => void;
  private onError?: (error: string) => void;
  private onStateChange?: (isListening: boolean) => void;
  private isSupported: boolean;

  constructor(config: VoiceInputButtonConfig) {
    this.container = config.container;
    this.onTranscript = config.onTranscript;
    this.onError = config.onError;
    this.onStateChange = config.onStateChange;
    this.isSupported = VoiceInput.isSupported();

    this.voiceInput = new VoiceInput({
      language: config.language ?? 'en-US',
      continuous: config.continuous ?? false,
      interimResults: true,
      autoSubmit: config.autoSubmit ?? true,
    });

    this.button = this.createButton();
    this.container.appendChild(this.button);

    this.setupVoiceInputEvents();
    this.injectStyles();
  }

  /**
   * Create the microphone button element
   */
  private createButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'voice-input-button';
    button.title = this.isSupported ? 'Click to speak' : 'Voice input not supported in this browser';
    button.disabled = !this.isSupported;

    // Microphone SVG icon
    button.innerHTML = `
      <svg class="voice-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
      <span class="voice-input-pulse"></span>
    `;

    button.addEventListener('click', () => this.handleClick());

    return button;
  }

  /**
   * Handle button click
   */
  private handleClick(): void {
    if (!this.isSupported) {
      return;
    }

    this.voiceInput.toggle();
  }

  /**
   * Setup voice input event handlers
   */
  private setupVoiceInputEvents(): void {
    this.voiceInput.setEvents({
      onResult: (transcript: string, isFinal: boolean) => {
        this.updateInterimDisplay(isFinal ? '' : transcript);

        if (this.onTranscript) {
          this.onTranscript(transcript, isFinal);
        }

        if (isFinal) {
          this.hideInterimDisplay();
        }
      },
      onInterim: (transcript: string) => {
        this.updateInterimDisplay(transcript);
      },
      onError: (error: string) => {
        this.setRecordingState(false);
        this.hideInterimDisplay();

        if (this.onError) {
          this.onError(error);
        }
      },
      onStart: () => {
        this.setRecordingState(true);
        this.showInterimDisplay();

        if (this.onStateChange) {
          this.onStateChange(true);
        }
      },
      onEnd: () => {
        this.setRecordingState(false);
        this.hideInterimDisplay();

        if (this.onStateChange) {
          this.onStateChange(false);
        }
      },
    });
  }

  /**
   * Set the visual recording state
   */
  private setRecordingState(isRecording: boolean): void {
    if (isRecording) {
      this.button.classList.add('voice-input-recording');
      this.button.title = 'Click to stop';
    } else {
      this.button.classList.remove('voice-input-recording');
      this.button.title = 'Click to speak';
    }
  }

  /**
   * Show the interim display for transcription preview
   */
  private showInterimDisplay(): void {
    if (this.interimDisplay) {
      return;
    }

    this.interimDisplay = document.createElement('div');
    this.interimDisplay.className = 'voice-input-interim';
    this.interimDisplay.textContent = 'Listening...';

    // Position above the button
    document.body.appendChild(this.interimDisplay);
    this.positionInterimDisplay();
  }

  /**
   * Update the interim display text
   */
  private updateInterimDisplay(text: string): void {
    if (this.interimDisplay) {
      this.interimDisplay.textContent = text || 'Listening...';
      this.positionInterimDisplay();
    }
  }

  /**
   * Position the interim display relative to the button
   */
  private positionInterimDisplay(): void {
    if (!this.interimDisplay) {
      return;
    }

    const buttonRect = this.button.getBoundingClientRect();
    const displayRect = this.interimDisplay.getBoundingClientRect();

    // Position above the button, centered
    const left = buttonRect.left + (buttonRect.width / 2) - (displayRect.width / 2);
    const top = buttonRect.top - displayRect.height - 8;

    this.interimDisplay.style.left = `${Math.max(8, left)}px`;
    this.interimDisplay.style.top = `${Math.max(8, top)}px`;
  }

  /**
   * Hide and remove the interim display
   */
  private hideInterimDisplay(): void {
    if (this.interimDisplay) {
      this.interimDisplay.remove();
      this.interimDisplay = null;
    }
  }

  /**
   * Start voice recognition
   */
  start(): boolean {
    return this.voiceInput.start();
  }

  /**
   * Stop voice recognition
   */
  stop(): void {
    this.voiceInput.stop();
  }

  /**
   * Toggle voice recognition
   */
  toggle(): boolean {
    return this.voiceInput.toggle();
  }

  /**
   * Check if currently listening
   */
  isListening(): boolean {
    return this.voiceInput.getIsListening();
  }

  /**
   * Enable the button
   */
  enable(): void {
    if (this.isSupported) {
      this.button.disabled = false;
    }
  }

  /**
   * Disable the button
   */
  disable(): void {
    this.button.disabled = true;
    this.voiceInput.stop();
  }

  /**
   * Get the underlying VoiceInput instance
   */
  getVoiceInput(): VoiceInput {
    return this.voiceInput;
  }

  /**
   * Inject CSS styles for the voice input button
   */
  private injectStyles(): void {
    if (document.getElementById('voice-input-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'voice-input-styles';
    style.textContent = `
      .voice-input-button {
        position: relative;
        width: 44px;
        height: 44px;
        padding: 0;
        background: #3d3d5a;
        border: 1px solid #4d4d7a;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        color: #a0a0c0;
        flex-shrink: 0;
      }

      .voice-input-button:hover:not(:disabled) {
        background: #4d4d6a;
        border-color: #6a6aaa;
        color: #c0c0e0;
      }

      .voice-input-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .voice-input-button.voice-input-recording {
        background: #6a3a3a;
        border-color: #aa5a5a;
        color: #ff8888;
        animation: voice-input-glow 1.5s ease-in-out infinite;
      }

      .voice-input-icon {
        width: 20px;
        height: 20px;
        z-index: 1;
      }

      .voice-input-pulse {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 8px;
        background: transparent;
        pointer-events: none;
      }

      .voice-input-recording .voice-input-pulse {
        animation: voice-input-pulse 1.5s ease-out infinite;
        background: rgba(255, 100, 100, 0.3);
      }

      @keyframes voice-input-pulse {
        0% {
          transform: scale(1);
          opacity: 0.5;
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
        }
      }

      @keyframes voice-input-glow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(255, 100, 100, 0.3);
        }
        50% {
          box-shadow: 0 0 15px rgba(255, 100, 100, 0.5);
        }
      }

      .voice-input-interim {
        position: fixed;
        background: #2d2d4a;
        color: #e0e0e0;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        max-width: 300px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border: 1px solid #4d4d7a;
        z-index: 10000;
        pointer-events: none;
        animation: voice-input-interim-fade-in 0.2s ease;
      }

      @keyframes voice-input-interim-fade-in {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Not supported state */
      .voice-input-button[disabled] .voice-input-icon {
        opacity: 0.5;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Remove the button and clean up
   */
  destroy(): void {
    this.voiceInput.abort();
    this.hideInterimDisplay();
    this.button.remove();

    // Remove styles if no other voice input buttons exist
    const otherButtons = document.querySelectorAll('.voice-input-button');
    if (otherButtons.length === 0) {
      const styles = document.getElementById('voice-input-styles');
      if (styles) {
        styles.remove();
      }
    }
  }
}

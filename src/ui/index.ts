/**
 * UI module exports
 */

export { ChatInterface, CommandHistory } from './chat-interface';
export type { ChatMessage, ChatInterfaceConfig, AutocompleteSuggestion } from './chat-interface';

export { StatusDisplay } from './status-display';
export type { StatusInfo } from './status-display';

export { ModelSelector } from './model-selector';
export type { ModelSelectorConfig } from './model-selector';

export { VoiceInput, VoiceInputButton } from './voice-input';
export type { VoiceInputConfig, VoiceInputEvents, VoiceInputButtonConfig } from './voice-input';

export { Autocomplete, LOCATIONS as AutocompleteLocations, COMMANDS as AutocompleteCommands } from './autocomplete';
export type { AutocompleteOption, AutocompleteConfig } from './autocomplete';

export { SettingsPanel, initSettingsPanel, getSettingsPanel, getApiKey } from './settings-panel';
export type { APIKeyConfig, SettingsPanelConfig } from './settings-panel';

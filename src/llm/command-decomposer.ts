/**
 * Command Decomposer - NLP-based preprocessing for complex multi-step commands
 *
 * Uses traditional NLP techniques (tokenization, NER, dependency parsing) to break
 * complex natural language commands into atomic steps that a small model can handle.
 *
 * Architecture:
 * 1. Pre-process: Split on conjunctions, identify clauses
 * 2. Extract: NER for locations, entities, attributes
 * 3. Classify: Intent classification per clause
 * 4. Queue: Create ordered list of atomic commands
 * 5. Execute: Feed each to small model → tool call → execute → next
 */

import nlp from 'compromise';

// ============================================================================
// Types
// ============================================================================

export interface AtomicCommand {
  id: string;
  intent: CommandIntent;
  rawText: string;
  entities: ExtractedEntities;
  dependencies: string[];  // IDs of commands this depends on
  context?: CommandContext;
}

export interface ExtractedEntities {
  locations: LocationEntity[];
  objects: ObjectEntity[];
  attributes: AttributeEntity[];
  quantities: QuantityEntity[];
  references: ReferenceEntity[];  // "it", "there", "that"
}

export interface LocationEntity {
  text: string;
  normalized: string;
  type: 'city' | 'landmark' | 'coordinate' | 'relative' | 'route';
  confidence: number;
}

export interface ObjectEntity {
  text: string;
  type: 'sphere' | 'marker' | 'label' | 'line' | 'polygon' | 'model' | 'generic';
  attributes: string[];
}

export interface AttributeEntity {
  text: string;
  type: 'color' | 'size' | 'animation' | 'style' | 'numeric';
  value: string | number;
}

export interface QuantityEntity {
  text: string;
  value: number;
  unit?: string;
}

export interface ReferenceEntity {
  text: string;
  type: 'pronoun' | 'demonstrative' | 'relative';
  resolvesTo?: string;  // ID of referenced command/entity
}

export interface CommandContext {
  previousResults: Map<string, unknown>;
  createdEntities: Map<string, string>;  // name -> entityId
  currentLocation?: { longitude: number; latitude: number };
  searchResults?: unknown[];
}

export type CommandIntent =
  | 'navigate'
  | 'search_poi'
  | 'add_entity'
  | 'modify_entity'
  | 'remove_entity'
  | 'calculate_route'
  | 'add_label'
  | 'add_visualization'
  | 'camera_control'
  | 'scene_setting'
  | 'query'
  | 'unknown';

// ============================================================================
// Intent Classification
// ============================================================================

const INTENT_PATTERNS: Record<CommandIntent, RegExp[]> = {
  navigate: [
    /\b(fly|go|navigate|take me|zoom|head|travel|move)\s+(to|towards?|over)/i,
    /\b(show|display|view|look at|see)\s+(me\s+)?/i,
    /\bwhere\s+is\b/i,
  ],
  search_poi: [
    /\b(find|search|look for|locate|discover|get)\s+(me\s+)?(a|the|some)?\s*(best|nearest|closest|top|good)?\s*/i,
    /\b(pizza|restaurant|hotel|cafe|coffee|gas|parking|hospital|pharmacy|atm|bank)/i,
    /\bpoints?\s+of\s+interest\b/i,
    /\bPOI\b/i,
  ],
  add_entity: [
    /\b(add|create|put|place|drop|insert|draw|make)\s+(a|an|the)?\s*(sphere|marker|point|label|line|path|polyline|polygon|circle|box|cylinder|model|arrow)/i,
    /\b(sphere|marker|point|label|line|path|polyline|polygon|circle|box|cylinder|model|arrow)\s+(at|on|there|here)/i,
  ],
  modify_entity: [
    /\b(change|modify|update|edit|set|make)\s+(the|it|that)?\s*(color|size|position|height|rotation)/i,
    /\b(rotate|spin|animate|pulse|glow|highlight)\b/i,
  ],
  remove_entity: [
    /\b(remove|delete|clear|hide|destroy|erase)\b/i,
  ],
  calculate_route: [
    /\b(route|path|direction|way|journey|trip|drive|walk|distance)\b/i,
    /\b(from|between)\s+.+\s+(to|and)\s+/i,
    /\bhow\s+(long|far|do I get)\b/i,
  ],
  add_label: [
    /\b(label|text|title|caption|annotation|note|tooltip)\b/i,
    /\b(floating|hovering)\s+(number|text|label)/i,
    /\bshow(ing)?\s+(the\s+)?(rating|time|distance|name|info)/i,
  ],
  add_visualization: [
    /\b(visualization|chart|graph|heatmap|overlay|layer)\b/i,
    /\b(time|travel|duration|segment)\b.*(above|over|on)/i,
  ],
  camera_control: [
    /\b(zoom|pan|tilt|rotate|orbit|spin)\s+(in|out|left|right|up|down|around)?\b/i,
    /\b(camera|view|perspective|angle)\b/i,
  ],
  scene_setting: [
    /\b(lighting|shadow|atmosphere|fog|time of day|weather|terrain|imagery)\b/i,
    /\b(enable|disable|toggle|turn)\s+(on|off)?\s*(shadows|lighting|fog|atmosphere)/i,
  ],
  query: [
    /\b(what|where|how|when|which|tell me|show me)\b/i,
    /\?\s*$/,
  ],
  unknown: [],
};

function classifyIntent(text: string): CommandIntent {
  const scores: Record<CommandIntent, number> = {
    navigate: 0, search_poi: 0, add_entity: 0, modify_entity: 0,
    remove_entity: 0, calculate_route: 0, add_label: 0, add_visualization: 0,
    camera_control: 0, scene_setting: 0, query: 0, unknown: 0,
  };

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[intent as CommandIntent] += 1;
      }
    }
  }

  // Priority overrides before scoring:

  // "zoom into/to X" is navigation, not camera_control
  if (/\bzoom\s+(in\s+)?(to|into)\s+/i.test(text)) {
    scores.navigate += 2;
    scores.camera_control = 0;
  }

  // "draw/add/create a line/path/polyline from X to Y" is add_entity, not calculate_route
  if (/\b(draw|add|create|make)\b/i.test(text) && /\b(line|path|polyline|dashed\s+line)\b/i.test(text)) {
    scores.add_entity += 3;
    scores.calculate_route = 0;
  }

  // Find highest scoring intent
  let maxIntent: CommandIntent = 'unknown';
  let maxScore = 0;
  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxIntent = intent as CommandIntent;
    }
  }

  return maxIntent;
}

// ============================================================================
// Clause Splitting
// ============================================================================

// Action verbs that typically start a new command
const ACTION_VERBS = [
  'fly', 'go', 'navigate', 'take', 'zoom', 'head', 'travel', 'move', 'show', 'display',
  'find', 'search', 'look', 'locate', 'discover', 'get',
  'add', 'create', 'put', 'place', 'drop', 'insert', 'draw', 'make',
  'change', 'modify', 'update', 'edit', 'set',
  'remove', 'delete', 'clear', 'hide', 'destroy', 'erase',
  'calculate', 'compute', 'measure',
  'have', 'include', 'with',  // "have a floating label"
  'rotate', 'spin', 'animate', 'pulse', 'glow', 'highlight',
  'enable', 'disable', 'toggle', 'turn',
];

// Words that indicate continuation, not a new clause
const CONTINUATION_WORDS = [
  'on', 'at', 'in', 'to', 'from', 'with', 'for', 'of', 'by', 'about',
  'that', 'which', 'who', 'where', 'when',
  'the', 'a', 'an', 'some', 'any', 'each', 'every',
  'it', 'them', 'there', 'here',
];

function splitIntoClauses(text: string): string[] {
  const clauses: string[] = [];
  let current = '';

  // Normalize the text
  let normalized = text
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  // Build a regex that matches clause boundaries
  // A clause boundary is: comma/and/then followed by an action verb
  const actionVerbPattern = ACTION_VERBS.join('|');
  const boundaryPattern = new RegExp(
    `(,\\s*(?:and\\s+)?(?:then\\s+)?|\\s+and\\s+then\\s+|\\s+then\\s+|;\\s*|\\s+as\\s+well\\s+as\\s+)(${actionVerbPattern})\\b`,
    'gi'
  );

  // Find all boundary positions
  const boundaries: number[] = [];
  let match;
  while ((match = boundaryPattern.exec(normalized)) !== null) {
    // The boundary is at the start of the separator
    boundaries.push(match.index);
  }

  // Also split on ", " followed by an action verb (common pattern)
  const commaVerbPattern = new RegExp(
    `,\\s+(${actionVerbPattern})\\b`,
    'gi'
  );
  while ((match = commaVerbPattern.exec(normalized)) !== null) {
    if (!boundaries.includes(match.index)) {
      boundaries.push(match.index);
    }
  }

  // Sort boundaries
  boundaries.sort((a, b) => a - b);

  // If no comma/semicolon boundaries, still try splitting on "and" between actions
  if (boundaries.length === 0) {
    return splitOnAndBetweenActions(normalized, actionVerbPattern);
  }

  let lastEnd = 0;
  for (const boundary of boundaries) {
    const segment = normalized.slice(lastEnd, boundary).trim();
    if (segment.length > 0) {
      clauses.push(segment);
    }
    lastEnd = boundary;
  }

  // Add the last segment
  const lastSegment = normalized.slice(lastEnd).trim();
  if (lastSegment.length > 0) {
    clauses.push(lastSegment);
  }

  // Clean up clauses
  const cleaned = clauses.map(c => {
    // Remove leading separators and conjunctions
    return c
      .replace(/^[,;]\s*/g, '')
      .replace(/^(and\s+then\s+|then\s+|and\s+|as\s+well\s+as\s+)/gi, '')
      .trim();
  }).filter(c => c.length > 2);

  // Now handle "as well as" and "with" clauses that should stay with previous
  const merged: string[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const clause = cleaned[i];

    // Check if this clause starts with words that make it dependent
    const startsWithDependent = /^(as\s+well\s+as|with\s+a|with\s+the|showing|that\s+show)/i.test(clause);
    const startsWithAction = new RegExp(`^(${actionVerbPattern})\\b`, 'i').test(clause);

    if (startsWithDependent && !startsWithAction && merged.length > 0) {
      // Merge with previous
      merged[merged.length - 1] += ', ' + clause;
    } else {
      merged.push(clause);
    }
  }

  // Final pass: split on " and " between two action verbs within a single clause
  const finalClauses: string[] = [];
  for (const clause of merged) {
    const andSplit = splitOnAndBetweenActions(clause, actionVerbPattern);
    finalClauses.push(...andSplit);
  }

  return finalClauses;
}

/**
 * Split a clause on " and " when it separates two action verbs
 * E.g., "go to paris and add a marker" -> ["go to paris", "add a marker"]
 * But NOT "find the best and nearest restaurant" (adjectives, not verbs)
 */
function splitOnAndBetweenActions(clause: string, actionVerbPattern: string): string[] {
  // Look for " and " followed by an action verb
  const andActionPattern = new RegExp(
    `^(.+?)\\s+and\\s+(${actionVerbPattern})\\b(.*)$`,
    'i'
  );

  const match = andActionPattern.exec(clause);
  if (match) {
    const before = match[1].trim();
    const verb = match[2];
    const after = match[3].trim();

    // Check if "before" ends with something that makes this a compound (best and nearest)
    // vs two separate actions (go to paris and add a marker)
    const endsWithAdjective = /\b(best|nearest|closest|biggest|smallest|highest|lowest|top|good|bad)\s*$/i.test(before);

    if (!endsWithAdjective) {
      // This is two separate actions
      const secondClause = verb + (after ? ' ' + after : '');
      // Recursively split the second part in case there are more "and"s
      return [before, ...splitOnAndBetweenActions(secondClause, actionVerbPattern)];
    }
  }

  return [clause];
}

// ============================================================================
// Entity Extraction
// ============================================================================

// Common location keywords and prepositions
const LOCATION_PREPOSITIONS = ['to', 'at', 'in', 'near', 'from', 'between', 'towards', 'around', 'by', 'on the way to'];

// Object types we can create
const OBJECT_TYPES = ['sphere', 'marker', 'point', 'label', 'line', 'path', 'route', 'polygon', 'circle', 'box', 'cylinder', 'model', 'arrow', 'corridor', 'wall'];

// Attributes
const COLOR_WORDS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'white', 'black', 'magenta', 'lime', 'navy', 'teal', 'gold', 'silver', 'coral'];
const ANIMATION_WORDS = ['spinning', 'rotating', 'pulsing', 'glowing', 'blinking', 'floating', 'animated', 'moving'];
const SIZE_WORDS = ['big', 'large', 'small', 'tiny', 'huge', 'massive', 'giant'];

function extractEntities(text: string): ExtractedEntities {
  const doc = nlp(text);
  const entities: ExtractedEntities = {
    locations: [],
    objects: [],
    attributes: [],
    quantities: [],
    references: [],
  };

  // Extract places using compromise
  const places = doc.places().out('array');
  for (const place of places) {
    entities.locations.push({
      text: place,
      normalized: place.toLowerCase().trim(),
      type: 'city',
      confidence: 0.8,
    });
  }

  // Extract locations after prepositions
  for (const prep of LOCATION_PREPOSITIONS) {
    const regex = new RegExp(`\\b${prep}\\s+(?:the\\s+)?([A-Z][a-zA-Z\\s]+?)(?:\\s*[,.]|\\s+(?:and|then|to|from|with)|$)`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      const locText = match[1].trim();
      // Don't add if it's an object type
      if (!OBJECT_TYPES.some(t => locText.toLowerCase().includes(t))) {
        const existing = entities.locations.find(l => l.normalized === locText.toLowerCase());
        if (!existing) {
          entities.locations.push({
            text: locText,
            normalized: locText.toLowerCase().trim(),
            type: detectLocationType(locText),
            confidence: 0.7,
          });
        }
      }
    }
  }

  // Extract coordinate patterns
  const coordPattern = /(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)/g;
  let coordMatch;
  while ((coordMatch = coordPattern.exec(text)) !== null) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      entities.locations.push({
        text: coordMatch[0],
        normalized: `${lat},${lon}`,
        type: 'coordinate',
        confidence: 0.95,
      });
    }
  }

  // Extract object types
  for (const objType of OBJECT_TYPES) {
    const regex = new RegExp(`\\b(${ANIMATION_WORDS.join('|')})?\\s*(${COLOR_WORDS.join('|')})?\\s*(${SIZE_WORDS.join('|')})?\\s*${objType}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      const attrs: string[] = [];
      if (match[1]) attrs.push(match[1].toLowerCase());
      if (match[2]) attrs.push(match[2].toLowerCase());
      if (match[3]) attrs.push(match[3].toLowerCase());

      entities.objects.push({
        text: match[0].trim(),
        type: objType as ObjectEntity['type'],
        attributes: attrs,
      });
    }
  }

  // Extract standalone attributes
  for (const color of COLOR_WORDS) {
    if (new RegExp(`\\b${color}\\b`, 'i').test(text)) {
      entities.attributes.push({
        text: color,
        type: 'color',
        value: color.toLowerCase(),
      });
    }
  }

  for (const anim of ANIMATION_WORDS) {
    if (new RegExp(`\\b${anim}\\b`, 'i').test(text)) {
      entities.attributes.push({
        text: anim,
        type: 'animation',
        value: anim.toLowerCase(),
      });
    }
  }

  // Extract quantities/numbers
  const numbers = doc.numbers().out('array');
  for (const num of numbers) {
    const value = parseFloat(num.replace(/[^0-9.-]/g, ''));
    if (!isNaN(value)) {
      entities.quantities.push({
        text: num,
        value,
        unit: extractUnit(text, num),
      });
    }
  }

  // Extract references (pronouns, demonstratives)
  const references = ['it', 'that', 'there', 'here', 'this', 'those', 'these', 'the result', 'the location', 'each'];
  for (const ref of references) {
    const regex = new RegExp(`\\b(on|at|to|from|with)\\s+${ref}\\b`, 'gi');
    if (regex.test(text)) {
      entities.references.push({
        text: ref,
        type: ref === 'it' || ref === 'that' ? 'pronoun' : 'demonstrative',
      });
    }
  }

  return entities;
}

function detectLocationType(text: string): LocationEntity['type'] {
  const lower = text.toLowerCase();

  // Check for route indicators
  if (/\b(between|from.*to|way to|route)\b/.test(lower)) {
    return 'route';
  }

  // Check for relative location
  if (/\b(here|there|nearby|current|this location)\b/.test(lower)) {
    return 'relative';
  }

  // Check for landmarks
  const landmarks = ['tower', 'bridge', 'monument', 'palace', 'castle', 'cathedral', 'museum', 'stadium', 'airport', 'station'];
  if (landmarks.some(l => lower.includes(l))) {
    return 'landmark';
  }

  return 'city';
}

function extractUnit(text: string, numText: string): string | undefined {
  const units = ['meters', 'meter', 'm', 'km', 'kilometers', 'miles', 'feet', 'ft', 'seconds', 'sec', 's', 'minutes', 'min', 'hours', 'hr', 'h', 'degrees', 'deg', '%', 'percent'];
  const afterNum = text.slice(text.indexOf(numText) + numText.length, text.indexOf(numText) + numText.length + 15);

  for (const unit of units) {
    if (new RegExp(`^\\s*${unit}\\b`, 'i').test(afterNum)) {
      return unit;
    }
  }
  return undefined;
}

// ============================================================================
// Main Decomposition
// ============================================================================

let commandIdCounter = 0;

export function decomposeCommand(input: string): AtomicCommand[] {
  const clauses = splitIntoClauses(input);
  const commands: AtomicCommand[] = [];

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const entities = extractEntities(clause);
    const intent = classifyIntent(clause);

    // Determine dependencies
    const dependencies: string[] = [];

    // If this clause has references (it, there, that), it depends on previous
    if (entities.references.length > 0 && commands.length > 0) {
      dependencies.push(commands[commands.length - 1].id);
    }

    // If this is a route calculation mentioning multiple places from different clauses
    if (intent === 'calculate_route' && commands.length > 0) {
      // Check if any previous command was a search that we'd use results from
      const searchCommands = commands.filter(c => c.intent === 'search_poi');
      for (const sc of searchCommands) {
        dependencies.push(sc.id);
      }
    }

    const command: AtomicCommand = {
      id: `cmd_${++commandIdCounter}`,
      intent,
      rawText: clause,
      entities,
      dependencies,
    };

    commands.push(command);
  }

  // Second pass: resolve reference chains
  resolveReferences(commands);

  return commands;
}

function resolveReferences(commands: AtomicCommand[]): void {
  for (let i = 1; i < commands.length; i++) {
    const cmd = commands[i];

    for (const ref of cmd.entities.references) {
      // "it" typically refers to the result/entity from the previous command
      if (ref.type === 'pronoun' && i > 0) {
        ref.resolvesTo = commands[i - 1].id;
      }
      // "there" refers to the last location
      if (ref.text === 'there' || ref.text === 'the location') {
        // Find last command with a location
        for (let j = i - 1; j >= 0; j--) {
          if (commands[j].entities.locations.length > 0 ||
              commands[j].intent === 'navigate' ||
              commands[j].intent === 'search_poi') {
            ref.resolvesTo = commands[j].id;
            break;
          }
        }
      }
    }
  }
}

// ============================================================================
// Debug / Visualization
// ============================================================================

export function formatDecomposition(commands: AtomicCommand[]): string {
  let output = '=== Command Decomposition ===\n\n';

  for (const cmd of commands) {
    output += `[${cmd.id}] Intent: ${cmd.intent}\n`;
    output += `  Raw: "${cmd.rawText}"\n`;

    if (cmd.entities.locations.length > 0) {
      output += `  Locations: ${cmd.entities.locations.map(l => `${l.text} (${l.type})`).join(', ')}\n`;
    }
    if (cmd.entities.objects.length > 0) {
      output += `  Objects: ${cmd.entities.objects.map(o => `${o.type}[${o.attributes.join(',')}]`).join(', ')}\n`;
    }
    if (cmd.entities.attributes.length > 0) {
      output += `  Attributes: ${cmd.entities.attributes.map(a => `${a.type}=${a.value}`).join(', ')}\n`;
    }
    if (cmd.entities.references.length > 0) {
      output += `  References: ${cmd.entities.references.map(r => `${r.text}→${r.resolvesTo || '?'}`).join(', ')}\n`;
    }
    if (cmd.dependencies.length > 0) {
      output += `  Depends on: ${cmd.dependencies.join(', ')}\n`;
    }
    output += '\n';
  }

  return output;
}

// ============================================================================
// Simplified Prompt Generator
// ============================================================================

/**
 * Generates a simplified prompt for the small model based on the atomic command.
 * The small model only needs to handle one simple task at a time.
 */
export function generateAtomicPrompt(command: AtomicCommand, context?: CommandContext): string {
  let prompt = command.rawText;

  // Resolve references to concrete values from context
  if (context && command.entities.references.length > 0) {
    for (const ref of command.entities.references) {
      if (ref.resolvesTo && context.createdEntities.has(ref.resolvesTo)) {
        // Replace "it" with the actual entity name
        const entityName = context.createdEntities.get(ref.resolvesTo);
        prompt = prompt.replace(new RegExp(`\\b${ref.text}\\b`, 'gi'), entityName || ref.text);
      }
      if (ref.resolvesTo && context.currentLocation && (ref.text === 'there' || ref.text === 'here')) {
        // Replace "there" with coordinates
        prompt = prompt.replace(
          new RegExp(`\\b${ref.text}\\b`, 'gi'),
          `${context.currentLocation.latitude}, ${context.currentLocation.longitude}`
        );
      }
    }
  }

  return prompt;
}

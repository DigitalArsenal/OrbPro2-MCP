/**
 * Web Worker for WebLLM inference
 * Runs LLM inference off the main thread to prevent UI freezing
 */

import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// Create the handler that processes messages from the main thread
const handler = new WebWorkerMLCEngineHandler();

// Listen for messages and forward to handler
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};

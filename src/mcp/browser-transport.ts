/**
 * Browser Transport Layer for MCP
 * Enables MCP communication within a browser environment
 */

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type MessageHandler = (message: MCPMessage) => void;

export class BrowserTransport {
  private messageQueue: MCPMessage[] = [];
  private onMessageCallback: MessageHandler | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    this.isConnected = true;
    // Process any queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.onMessageCallback) {
        this.onMessageCallback(message);
      }
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.messageQueue = [];
  }

  send(message: MCPMessage): void {
    if (!this.isConnected) {
      throw new Error('Transport not connected');
    }
    // In browser context, messages are handled synchronously
    // This will be overridden by the server to process requests
    this.messageQueue.push(message);
  }

  onMessage(callback: MessageHandler): void {
    this.onMessageCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  // Method for server to send responses back
  receiveMessage(message: MCPMessage): void {
    if (this.onMessageCallback) {
      this.onMessageCallback(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  emitError(error: Error): void {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }
}

// Bidirectional transport for client-server communication within browser
export class BidirectionalBrowserTransport {
  private clientTransport: BrowserTransport;
  private serverTransport: BrowserTransport;

  constructor() {
    this.clientTransport = new BrowserTransport();
    this.serverTransport = new BrowserTransport();

    // Wire them together
    const originalClientSend = this.clientTransport.send.bind(this.clientTransport);
    const originalServerSend = this.serverTransport.send.bind(this.serverTransport);

    this.clientTransport.send = (message: MCPMessage) => {
      originalClientSend(message);
      this.serverTransport.receiveMessage(message);
    };

    this.serverTransport.send = (message: MCPMessage) => {
      originalServerSend(message);
      this.clientTransport.receiveMessage(message);
    };
  }

  async connect(): Promise<void> {
    await this.clientTransport.connect();
    await this.serverTransport.connect();
  }

  async disconnect(): Promise<void> {
    await this.clientTransport.disconnect();
    await this.serverTransport.disconnect();
  }

  getClientTransport(): BrowserTransport {
    return this.clientTransport;
  }

  getServerTransport(): BrowserTransport {
    return this.serverTransport;
  }
}

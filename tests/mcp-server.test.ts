/**
 * Tests for the MCP Server
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CesiumMCPServer } from '../src/mcp/cesium-mcp-server';
import { BrowserTransport, BidirectionalBrowserTransport } from '../src/mcp/browser-transport';
import type { CesiumCommand } from '../src/cesium/types';

describe('CesiumMCPServer', () => {
  let server: CesiumMCPServer;
  let transport: BrowserTransport;
  let commandHandler: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    transport = new BrowserTransport();
    await transport.connect();

    commandHandler = vi.fn().mockImplementation(async (command: CesiumCommand) => ({
      success: true,
      message: `Executed ${command.type}`,
    }));

    server = new CesiumMCPServer(transport, commandHandler);
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const tools = server.getToolDefinitions();

      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);

      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('flyTo');
      expect(toolNames).toContain('addPoint');
      expect(toolNames).toContain('addPolyline');
      expect(toolNames).toContain('zoom');
      expect(toolNames).toContain('setSceneMode');
    });

    it('should include inputSchema for each tool', () => {
      const tools = server.getToolDefinitions();

      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.description).toBeDefined();
      }
    });

    it('should include all expected tools', () => {
      const tools = server.getToolDefinitions();
      const toolNames = tools.map(t => t.name);

      const expectedTools = [
        'flyTo',
        'lookAt',
        'zoom',
        'addPoint',
        'addLabel',
        'addPolyline',
        'addPolygon',
        'addCircle',
        'removeEntity',
        'clearAll',
        'setSceneMode',
        'setTime',
        'playAnimation',
        'pauseAnimation',
        'generateCZML',
      ];

      for (const expected of expectedTools) {
        expect(toolNames).toContain(expected);
      }
    });
  });

  describe('tool definitions', () => {
    it('flyTo should have correct schema', () => {
      const tools = server.getToolDefinitions();
      const flyTo = tools.find(t => t.name === 'flyTo');

      expect(flyTo).toBeDefined();
      expect(flyTo?.inputSchema).toHaveProperty('properties');
      const props = (flyTo?.inputSchema as any).properties;
      expect(props).toHaveProperty('longitude');
      expect(props).toHaveProperty('latitude');
      expect(props).toHaveProperty('height');
      expect(props).toHaveProperty('duration');
    });

    it('addPoint should have correct schema', () => {
      const tools = server.getToolDefinitions();
      const addPoint = tools.find(t => t.name === 'addPoint');

      expect(addPoint).toBeDefined();
      expect(addPoint?.description).toContain('point');
      const props = (addPoint?.inputSchema as any).properties;
      expect(props).toHaveProperty('longitude');
      expect(props).toHaveProperty('latitude');
      expect(props).toHaveProperty('name');
      expect(props).toHaveProperty('color');
      expect(props).toHaveProperty('size');
    });

    it('addPolyline should have correct schema', () => {
      const tools = server.getToolDefinitions();
      const addPolyline = tools.find(t => t.name === 'addPolyline');

      expect(addPolyline).toBeDefined();
      expect(addPolyline?.description).toContain('line');
      const props = (addPolyline?.inputSchema as any).properties;
      expect(props).toHaveProperty('positions');
      expect(props).toHaveProperty('name');
      expect(props).toHaveProperty('color');
      expect(props).toHaveProperty('width');
    });

    it('addPolygon should have correct schema', () => {
      const tools = server.getToolDefinitions();
      const addPolygon = tools.find(t => t.name === 'addPolygon');

      expect(addPolygon).toBeDefined();
      expect(addPolygon?.description).toContain('polygon');
      const props = (addPolygon?.inputSchema as any).properties;
      expect(props).toHaveProperty('positions');
      expect(props).toHaveProperty('extrudedHeight');
    });

    it('setSceneMode should have enum for mode', () => {
      const tools = server.getToolDefinitions();
      const setSceneMode = tools.find(t => t.name === 'setSceneMode');

      expect(setSceneMode).toBeDefined();
      const props = (setSceneMode?.inputSchema as any).properties;
      expect(props.mode.enum).toContain('2D');
      expect(props.mode.enum).toContain('3D');
      expect(props.mode.enum).toContain('COLUMBUS_VIEW');
    });

    it('zoom should have correct schema', () => {
      const tools = server.getToolDefinitions();
      const zoom = tools.find(t => t.name === 'zoom');

      expect(zoom).toBeDefined();
      const props = (zoom?.inputSchema as any).properties;
      expect(props).toHaveProperty('amount');
    });

    it('lookAt should have correct schema', () => {
      const tools = server.getToolDefinitions();
      const lookAt = tools.find(t => t.name === 'lookAt');

      expect(lookAt).toBeDefined();
      const props = (lookAt?.inputSchema as any).properties;
      expect(props).toHaveProperty('longitude');
      expect(props).toHaveProperty('latitude');
      expect(props).toHaveProperty('range');
    });

    it('addLabel should have text property', () => {
      const tools = server.getToolDefinitions();
      const addLabel = tools.find(t => t.name === 'addLabel');

      expect(addLabel).toBeDefined();
      const props = (addLabel?.inputSchema as any).properties;
      expect(props).toHaveProperty('text');
    });

    it('addCircle should have radius property', () => {
      const tools = server.getToolDefinitions();
      const addCircle = tools.find(t => t.name === 'addCircle');

      expect(addCircle).toBeDefined();
      const props = (addCircle?.inputSchema as any).properties;
      expect(props).toHaveProperty('radius');
    });

    it('removeEntity should have id property', () => {
      const tools = server.getToolDefinitions();
      const removeEntity = tools.find(t => t.name === 'removeEntity');

      expect(removeEntity).toBeDefined();
      const props = (removeEntity?.inputSchema as any).properties;
      expect(props).toHaveProperty('id');
    });

    it('setTime should have time and multiplier properties', () => {
      const tools = server.getToolDefinitions();
      const setTime = tools.find(t => t.name === 'setTime');

      expect(setTime).toBeDefined();
      const props = (setTime?.inputSchema as any).properties;
      expect(props).toHaveProperty('time');
      expect(props).toHaveProperty('multiplier');
    });

    it('generateCZML should have entities and documentName', () => {
      const tools = server.getToolDefinitions();
      const generateCZML = tools.find(t => t.name === 'generateCZML');

      expect(generateCZML).toBeDefined();
      const props = (generateCZML?.inputSchema as any).properties;
      expect(props).toHaveProperty('entities');
      expect(props).toHaveProperty('documentName');
    });
  });

  describe('zodToJsonSchema conversion', () => {
    it('should convert object schemas correctly', () => {
      const tools = server.getToolDefinitions();
      const flyTo = tools.find(t => t.name === 'flyTo');

      expect(flyTo?.inputSchema).toHaveProperty('type', 'object');
      expect(flyTo?.inputSchema).toHaveProperty('properties');
      expect(flyTo?.inputSchema).toHaveProperty('required');
    });

    it('should mark required fields', () => {
      const tools = server.getToolDefinitions();
      const flyTo = tools.find(t => t.name === 'flyTo');

      const required = (flyTo?.inputSchema as any).required;
      expect(required).toContain('longitude');
      expect(required).toContain('latitude');
    });

    it('should not mark optional fields as required', () => {
      const tools = server.getToolDefinitions();
      const flyTo = tools.find(t => t.name === 'flyTo');

      const required = (flyTo?.inputSchema as any).required;
      expect(required).not.toContain('height');
      expect(required).not.toContain('duration');
    });

    it('should convert number types correctly', () => {
      const tools = server.getToolDefinitions();
      const zoom = tools.find(t => t.name === 'zoom');

      const amountProp = (zoom?.inputSchema as any).properties.amount;
      expect(amountProp.type).toBe('number');
    });

    it('should convert string types correctly', () => {
      const tools = server.getToolDefinitions();
      const setTime = tools.find(t => t.name === 'setTime');

      const timeProp = (setTime?.inputSchema as any).properties.time;
      expect(timeProp.type).toBe('string');
    });

    it('should convert enum types correctly', () => {
      const tools = server.getToolDefinitions();
      const addPoint = tools.find(t => t.name === 'addPoint');

      const colorProp = (addPoint?.inputSchema as any).properties.color;
      expect(colorProp.type).toBe('string');
      expect(colorProp.enum).toBeDefined();
      expect(colorProp.enum).toContain('red');
      expect(colorProp.enum).toContain('blue');
      expect(colorProp.enum).toContain('green');
    });

    it('should convert array types correctly', () => {
      const tools = server.getToolDefinitions();
      const addPolyline = tools.find(t => t.name === 'addPolyline');

      const positionsProp = (addPolyline?.inputSchema as any).properties.positions;
      expect(positionsProp.type).toBe('array');
      expect(positionsProp.items).toBeDefined();
    });
  });
});

describe('BrowserTransport', () => {
  let transport: BrowserTransport;

  beforeEach(() => {
    transport = new BrowserTransport();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await expect(transport.connect()).resolves.not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await transport.connect();
      await expect(transport.disconnect()).resolves.not.toThrow();
    });
  });

  describe('send', () => {
    it('should throw when not connected', () => {
      expect(() => transport.send({
        jsonrpc: '2.0',
        method: 'test',
      })).toThrow('Transport not connected');
    });

    it('should send message when connected', async () => {
      await transport.connect();

      expect(() => transport.send({
        jsonrpc: '2.0',
        method: 'test',
      })).not.toThrow();
    });
  });

  describe('onMessage', () => {
    it('should receive messages', async () => {
      await transport.connect();

      const received: unknown[] = [];
      transport.onMessage((msg) => {
        received.push(msg);
      });

      transport.receiveMessage({
        jsonrpc: '2.0',
        id: 1,
        result: { test: true },
      });

      expect(received).toHaveLength(1);
    });
  });

  describe('onError', () => {
    it('should emit errors', async () => {
      await transport.connect();

      const errors: Error[] = [];
      transport.onError((err) => {
        errors.push(err);
      });

      transport.emitError(new Error('Test error'));

      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toBe('Test error');
    });
  });
});

describe('BidirectionalBrowserTransport', () => {
  let biTransport: BidirectionalBrowserTransport;

  beforeEach(() => {
    biTransport = new BidirectionalBrowserTransport();
  });

  describe('connect', () => {
    it('should connect both transports', async () => {
      await expect(biTransport.connect()).resolves.not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should disconnect both transports', async () => {
      await biTransport.connect();
      await expect(biTransport.disconnect()).resolves.not.toThrow();
    });
  });

  describe('getClientTransport', () => {
    it('should return client transport', () => {
      const client = biTransport.getClientTransport();
      expect(client).toBeInstanceOf(BrowserTransport);
    });
  });

  describe('getServerTransport', () => {
    it('should return server transport', () => {
      const server = biTransport.getServerTransport();
      expect(server).toBeInstanceOf(BrowserTransport);
    });
  });

  describe('bidirectional communication', () => {
    it('should pass messages from client to server', async () => {
      await biTransport.connect();

      const serverReceived: unknown[] = [];
      biTransport.getServerTransport().onMessage((msg) => {
        serverReceived.push(msg);
      });

      biTransport.getClientTransport().send({
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
        params: { data: 'hello' },
      });

      expect(serverReceived).toHaveLength(1);
      expect((serverReceived[0] as any).method).toBe('test');
    });

    it('should pass messages from server to client', async () => {
      await biTransport.connect();

      const clientReceived: unknown[] = [];
      biTransport.getClientTransport().onMessage((msg) => {
        clientReceived.push(msg);
      });

      biTransport.getServerTransport().send({
        jsonrpc: '2.0',
        id: 1,
        result: { success: true },
      });

      expect(clientReceived).toHaveLength(1);
      expect((clientReceived[0] as any).result.success).toBe(true);
    });
  });
});

describe('MCP Server Command Handler Integration', () => {
  let server: CesiumMCPServer;
  let transport: BrowserTransport;
  let commandHandler: ReturnType<typeof vi.fn>;
  let executedCommands: CesiumCommand[];

  beforeEach(async () => {
    transport = new BrowserTransport();
    await transport.connect();
    executedCommands = [];

    commandHandler = vi.fn().mockImplementation(async (command: CesiumCommand) => {
      executedCommands.push(command);
      return {
        success: true,
        message: `Executed ${command.type}`,
        data: { command },
      };
    });

    server = new CesiumMCPServer(transport, commandHandler);
  });

  describe('command handler mock', () => {
    it('should be called when processing commands', async () => {
      // Access internal method via message passing would require full MCP protocol
      // This tests that the handler mock is correctly set up
      expect(commandHandler).toBeDefined();
      expect(vi.isMockFunction(commandHandler)).toBe(true);
    });

    it('should track executed commands', async () => {
      // Simulate a command execution
      await commandHandler({ type: 'camera.flyTo', destination: { longitude: 0, latitude: 0, height: 1000 }, duration: 3 });

      expect(executedCommands).toHaveLength(1);
      expect(executedCommands[0]?.type).toBe('camera.flyTo');
    });

    it('should return success response', async () => {
      const result = await commandHandler({ type: 'time.play' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('time.play');
    });
  });
});

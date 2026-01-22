/**
 * Tests for the Command Parser
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandParser } from '../src/llm/command-parser';
import type { ToolCall } from '../src/llm/web-llm-engine';

describe('CommandParser', () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  describe('parseToolCall', () => {
    it('should parse flyTo tool call', () => {
      const toolCall: ToolCall = {
        name: 'flyTo',
        arguments: {
          longitude: 2.3522,
          latitude: 48.8566,
          height: 500000,
        },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]).toEqual({
        type: 'camera.flyTo',
        destination: {
          longitude: 2.3522,
          latitude: 48.8566,
          height: 500000,
        },
        duration: 3,
      });
    });

    it('should parse flyTo with custom duration', () => {
      const toolCall: ToolCall = {
        name: 'flyTo',
        arguments: {
          longitude: 0,
          latitude: 0,
          duration: 5,
        },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands[0]).toMatchObject({
        type: 'camera.flyTo',
        duration: 5,
      });
    });

    it('should parse flyTo with default height when not provided', () => {
      const toolCall: ToolCall = {
        name: 'flyTo',
        arguments: {
          longitude: 10,
          latitude: 20,
        },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands[0]).toMatchObject({
        type: 'camera.flyTo',
        destination: {
          longitude: 10,
          latitude: 20,
          height: 1000000,
        },
      });
    });

    it('should parse lookAt tool call', () => {
      const toolCall: ToolCall = {
        name: 'lookAt',
        arguments: {
          longitude: 139.6917,
          latitude: 35.6895,
          range: 500000,
        },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands[0]).toMatchObject({
        type: 'camera.lookAt',
        target: {
          longitude: 139.6917,
          latitude: 35.6895,
        },
        offset: {
          heading: 0,
          pitch: -Math.PI / 4,
          range: 500000,
        },
      });
    });

    it('should parse lookAt without range', () => {
      const toolCall: ToolCall = {
        name: 'lookAt',
        arguments: {
          longitude: 0,
          latitude: 0,
        },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands[0]).toMatchObject({
        type: 'camera.lookAt',
        target: { longitude: 0, latitude: 0 },
      });
      expect((result.commands[0] as any).offset).toBeUndefined();
    });

    it('should parse addPoint tool call', () => {
      const toolCall: ToolCall = {
        name: 'addPoint',
        arguments: {
          longitude: -74.006,
          latitude: 40.7128,
          name: 'New York',
          color: 'red',
        },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]?.type).toBe('entity.add');
    });

    it('should parse addPoint with size', () => {
      const toolCall: ToolCall = {
        name: 'addPoint',
        arguments: {
          longitude: 0,
          latitude: 0,
          size: 20,
        },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      const entity = (result.commands[0] as any).entity;
      expect(entity.point.pixelSize).toBe(20);
    });

    it('should parse addLabel tool call', () => {
      const toolCall: ToolCall = {
        name: 'addLabel',
        arguments: {
          longitude: 2.3522,
          latitude: 48.8566,
          text: 'Paris',
          color: 'white',
        },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      const entity = (result.commands[0] as any).entity;
      expect(entity.label.text).toBe('Paris');
    });

    it('should parse addPolyline tool call', () => {
      const toolCall: ToolCall = {
        name: 'addPolyline',
        arguments: {
          positions: [
            { longitude: 0, latitude: 0 },
            { longitude: 10, latitude: 10 },
          ],
          name: 'Test Line',
          color: 'blue',
          width: 5,
        },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      const entity = (result.commands[0] as any).entity;
      expect(entity.polyline).toBeDefined();
      expect(entity.polyline.width).toBe(5);
    });

    it('should parse addPolygon tool call', () => {
      const toolCall: ToolCall = {
        name: 'addPolygon',
        arguments: {
          positions: [
            { longitude: 0, latitude: 0 },
            { longitude: 1, latitude: 0 },
            { longitude: 1, latitude: 1 },
          ],
          name: 'Triangle',
          color: 'green',
          extrudedHeight: 1000,
        },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      const entity = (result.commands[0] as any).entity;
      expect(entity.polygon).toBeDefined();
      expect(entity.polygon.extrudedHeight).toBe(1000);
    });

    it('should parse addCircle tool call', () => {
      const toolCall: ToolCall = {
        name: 'addCircle',
        arguments: {
          longitude: 0,
          latitude: 0,
          radius: 50000,
          name: 'Circle',
          color: 'orange',
        },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      const entity = (result.commands[0] as any).entity;
      expect(entity.ellipse).toBeDefined();
      expect(entity.ellipse.semiMajorAxis).toBe(50000);
      expect(entity.ellipse.semiMinorAxis).toBe(50000);
    });

    it('should parse removeEntity tool call', () => {
      const toolCall: ToolCall = {
        name: 'removeEntity',
        arguments: { id: 'entity_123' },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({
        type: 'entity.remove',
        id: 'entity_123',
      });
    });

    it('should parse zoom tool call', () => {
      const toolCall: ToolCall = {
        name: 'zoom',
        arguments: { amount: 500000 },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({
        type: 'camera.zoom',
        amount: 500000,
      });
    });

    it('should parse setSceneMode tool call', () => {
      const toolCall: ToolCall = {
        name: 'setSceneMode',
        arguments: { mode: '2D' },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({
        type: 'scene.mode',
        mode: '2D',
      });
    });

    it('should parse setSceneMode for 3D', () => {
      const toolCall: ToolCall = {
        name: 'setSceneMode',
        arguments: { mode: '3D' },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({
        type: 'scene.mode',
        mode: '3D',
      });
    });

    it('should parse setSceneMode for COLUMBUS_VIEW', () => {
      const toolCall: ToolCall = {
        name: 'setSceneMode',
        arguments: { mode: 'COLUMBUS_VIEW' },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({
        type: 'scene.mode',
        mode: 'COLUMBUS_VIEW',
      });
    });

    it('should parse setTime tool call', () => {
      const toolCall: ToolCall = {
        name: 'setTime',
        arguments: {
          time: '2024-01-01T00:00:00Z',
          multiplier: 60,
        },
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({
        type: 'time.set',
        currentTime: '2024-01-01T00:00:00Z',
        multiplier: 60,
      });
    });

    it('should parse playAnimation tool call', () => {
      const toolCall: ToolCall = {
        name: 'playAnimation',
        arguments: {},
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({ type: 'time.play' });
    });

    it('should parse pauseAnimation tool call', () => {
      const toolCall: ToolCall = {
        name: 'pauseAnimation',
        arguments: {},
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({ type: 'time.pause' });
    });

    it('should return failure for unknown tool', () => {
      const toolCall: ToolCall = {
        name: 'unknownTool',
        arguments: {},
      };

      const result = parser.parseToolCall(toolCall);

      expect(result.success).toBe(false);
      expect(result.commands).toHaveLength(0);
      expect(result.message).toContain('Unknown tool');
    });
  });

  describe('parseToolCalls', () => {
    it('should parse multiple tool calls', () => {
      const toolCalls: ToolCall[] = [
        {
          name: 'flyTo',
          arguments: { longitude: 2.3522, latitude: 48.8566, height: 500000 },
        },
        {
          name: 'addPoint',
          arguments: { longitude: 2.3522, latitude: 48.8566, name: 'Paris', color: 'blue' },
        },
      ];

      const result = parser.parseToolCalls(toolCalls);

      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(2);
    });

    it('should handle mixed valid/invalid tool calls', () => {
      const toolCalls: ToolCall[] = [
        {
          name: 'flyTo',
          arguments: { longitude: 2.3522, latitude: 48.8566, height: 500000 },
        },
        {
          name: 'invalidTool',
          arguments: {},
        },
      ];

      const result = parser.parseToolCalls(toolCalls);

      expect(result.success).toBe(true); // At least one command succeeded
      expect(result.commands).toHaveLength(1);
      expect(result.message).toBeDefined();
    });
  });

  describe('parseNaturalLanguage', () => {
    it('should parse fly to commands', () => {
      const result = parser.parseNaturalLanguage('fly to Paris');

      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]?.type).toBe('camera.flyTo');
    });

    it('should parse go to commands', () => {
      const result = parser.parseNaturalLanguage('go to New York');

      expect(result.success).toBe(true);
      expect(result.commands[0]?.type).toBe('camera.flyTo');
    });

    it('should parse show me commands', () => {
      const result = parser.parseNaturalLanguage('show me London');

      expect(result.success).toBe(true);
      expect(result.commands[0]?.type).toBe('camera.flyTo');
    });

    it('should parse zoom in commands', () => {
      const result = parser.parseNaturalLanguage('zoom in');

      expect(result.success).toBe(true);
      expect(result.commands[0]?.type).toBe('camera.zoom');
    });

    it('should parse zoom out commands', () => {
      const result = parser.parseNaturalLanguage('zoom out');

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({
        type: 'camera.zoom',
        amount: -1000000,
      });
    });

    it('should parse 2D mode commands', () => {
      const result = parser.parseNaturalLanguage('switch to 2d mode');

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({
        type: 'scene.mode',
        mode: '2D',
      });
    });

    it('should parse 3D mode commands', () => {
      const result = parser.parseNaturalLanguage('show the globe');

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({
        type: 'scene.mode',
        mode: '3D',
      });
    });

    it('should return failure for unrecognized input', () => {
      const result = parser.parseNaturalLanguage('what is the weather like');

      expect(result.success).toBe(false);
      expect(result.commands).toHaveLength(0);
    });
  });

  describe('lookupLocation', () => {
    it('should find known cities', () => {
      const paris = parser.lookupLocation('paris');
      expect(paris).toEqual({ longitude: 2.3522, latitude: 48.8566 });

      const tokyo = parser.lookupLocation('Tokyo');
      expect(tokyo).toEqual({ longitude: 139.6917, latitude: 35.6895 });
    });

    it('should find landmarks', () => {
      const eiffelTower = parser.lookupLocation('eiffel tower');
      expect(eiffelTower).toEqual({ longitude: 2.2945, latitude: 48.8584 });

      const statueOfLiberty = parser.lookupLocation('statue of liberty');
      expect(statueOfLiberty).toEqual({ longitude: -74.0445, latitude: 40.6892 });
    });

    it('should return null for unknown locations', () => {
      const unknown = parser.lookupLocation('unknown place xyz');
      expect(unknown).toBeNull();
    });
  });

  describe('getKnownLocations', () => {
    it('should return list of known locations', () => {
      const locations = parser.getKnownLocations();

      expect(locations).toContain('paris');
      expect(locations).toContain('new york');
      expect(locations).toContain('tokyo');
      expect(locations).toContain('eiffel tower');
      expect(locations.length).toBeGreaterThan(50);
    });
  });

  describe('color parsing', () => {
    it('should handle red color in addPoint', () => {
      const toolCall: ToolCall = {
        name: 'addPoint',
        arguments: { longitude: 0, latitude: 0, color: 'red' },
      };

      const result = parser.parseToolCall(toolCall);
      const entity = (result.commands[0] as any).entity;
      expect(entity.point.color.rgba).toEqual([255, 0, 0, 255]);
    });

    it('should handle blue color in addPoint', () => {
      const toolCall: ToolCall = {
        name: 'addPoint',
        arguments: { longitude: 0, latitude: 0, color: 'blue' },
      };

      const result = parser.parseToolCall(toolCall);
      const entity = (result.commands[0] as any).entity;
      expect(entity.point.color.rgba).toEqual([0, 0, 255, 255]);
    });

    it('should handle green color in addPolyline', () => {
      const toolCall: ToolCall = {
        name: 'addPolyline',
        arguments: {
          positions: [
            { longitude: 0, latitude: 0 },
            { longitude: 1, latitude: 1 },
          ],
          color: 'green',
        },
      };

      const result = parser.parseToolCall(toolCall);
      const entity = (result.commands[0] as any).entity;
      expect(entity.polyline.material.solidColor.color.rgba).toEqual([0, 255, 0, 255]);
    });

    it('should handle yellow color', () => {
      const toolCall: ToolCall = {
        name: 'addPoint',
        arguments: { longitude: 0, latitude: 0, color: 'yellow' },
      };

      const result = parser.parseToolCall(toolCall);
      const entity = (result.commands[0] as any).entity;
      expect(entity.point.color.rgba).toEqual([255, 255, 0, 255]);
    });

    it('should handle cyan color', () => {
      const toolCall: ToolCall = {
        name: 'addPoint',
        arguments: { longitude: 0, latitude: 0, color: 'cyan' },
      };

      const result = parser.parseToolCall(toolCall);
      const entity = (result.commands[0] as any).entity;
      expect(entity.point.color.rgba).toEqual([0, 255, 255, 255]);
    });

    it('should default to red for unknown colors', () => {
      const toolCall: ToolCall = {
        name: 'addPoint',
        arguments: { longitude: 0, latitude: 0, color: 'unknowncolor' },
      };

      const result = parser.parseToolCall(toolCall);
      const entity = (result.commands[0] as any).entity;
      expect(entity.point.color.rgba).toEqual([255, 0, 0, 255]);
    });

    it('should handle white color in addLabel', () => {
      const toolCall: ToolCall = {
        name: 'addLabel',
        arguments: { longitude: 0, latitude: 0, text: 'Test', color: 'white' },
      };

      const result = parser.parseToolCall(toolCall);
      const entity = (result.commands[0] as any).entity;
      expect(entity.label.fillColor.rgba).toEqual([255, 255, 255, 255]);
    });
  });

  describe('parseNaturalLanguage - additional tests', () => {
    it('should parse navigate to commands', () => {
      const result = parser.parseNaturalLanguage('navigate to Tokyo');

      expect(result.success).toBe(true);
      expect(result.commands[0]?.type).toBe('camera.flyTo');
    });

    it('should parse take me to commands', () => {
      const result = parser.parseNaturalLanguage('take me to Sydney');

      expect(result.success).toBe(true);
      expect(result.commands[0]?.type).toBe('camera.flyTo');
    });

    it('should parse zoom to commands', () => {
      const result = parser.parseNaturalLanguage('zoom to Berlin');

      expect(result.success).toBe(true);
      expect(result.commands[0]?.type).toBe('camera.flyTo');
    });

    it('should parse flat mode commands', () => {
      const result = parser.parseNaturalLanguage('flat mode');

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({
        type: 'scene.mode',
        mode: '2D',
      });
    });

    it('should parse map view commands', () => {
      const result = parser.parseNaturalLanguage('map view');

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({
        type: 'scene.mode',
        mode: '2D',
      });
    });

    it('should parse globe mode commands', () => {
      const result = parser.parseNaturalLanguage('globe mode');

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({
        type: 'scene.mode',
        mode: '3D',
      });
    });

    it('should parse columbus view commands', () => {
      const result = parser.parseNaturalLanguage('columbus view');

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({
        type: 'scene.mode',
        mode: 'COLUMBUS_VIEW',
      });
    });

    it('should parse play commands', () => {
      const result = parser.parseNaturalLanguage('play');

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({ type: 'time.play' });
    });

    it('should parse start animation commands', () => {
      const result = parser.parseNaturalLanguage('start animation');

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({ type: 'time.play' });
    });

    it('should parse pause commands', () => {
      const result = parser.parseNaturalLanguage('pause');

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({ type: 'time.pause' });
    });

    it('should parse stop commands', () => {
      const result = parser.parseNaturalLanguage('stop');

      expect(result.success).toBe(true);
      expect(result.commands[0]).toEqual({ type: 'time.pause' });
    });

    it('should handle coordinates in natural language', () => {
      const result = parser.parseNaturalLanguage('fly to 40.7128, -74.006');

      expect(result.success).toBe(true);
      expect(result.commands[0]?.type).toBe('camera.flyTo');
    });

    it('should be case insensitive', () => {
      const result1 = parser.parseNaturalLanguage('FLY TO PARIS');
      expect(result1.success).toBe(true);

      const result2 = parser.parseNaturalLanguage('Fly To London');
      expect(result2.success).toBe(true);
    });
  });

  describe('lookupLocation - additional cities', () => {
    it('should find NYC alias', () => {
      const location = parser.lookupLocation('nyc');
      expect(location).toEqual({ longitude: -74.006, latitude: 40.7128 });
    });

    it('should find SF alias', () => {
      const location = parser.lookupLocation('sf');
      expect(location).toEqual({ longitude: -122.4194, latitude: 37.7749 });
    });

    it('should find DC alias', () => {
      const location = parser.lookupLocation('dc');
      expect(location).toEqual({ longitude: -77.0369, latitude: 38.9072 });
    });

    it('should find international cities', () => {
      expect(parser.lookupLocation('beijing')).toBeDefined();
      expect(parser.lookupLocation('mumbai')).toBeDefined();
      expect(parser.lookupLocation('singapore')).toBeDefined();
      expect(parser.lookupLocation('dubai')).toBeDefined();
    });

    it('should find famous landmarks', () => {
      expect(parser.lookupLocation('grand canyon')).toBeDefined();
      expect(parser.lookupLocation('mount fuji')).toBeDefined();
      expect(parser.lookupLocation('golden gate bridge')).toBeDefined();
      expect(parser.lookupLocation('burj khalifa')).toBeDefined();
    });
  });
});

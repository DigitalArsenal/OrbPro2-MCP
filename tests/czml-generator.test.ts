/**
 * Tests for the CZML Generator
 */

import { describe, it, expect } from 'vitest';
import {
  createCZMLDocument,
  createPoint,
  createLabel,
  createPolyline,
  createPolygon,
  createCircle,
  createBox,
  createEllipse,
  createBillboard,
  createModel,
  createPath,
  buildCZMLDocument,
  createColor,
  createColorFromName,
  createSolidColorMaterial,
  positionToCartographicDegrees,
} from '../src/cesium/czml-generator';

describe('CZML Generator', () => {
  describe('createCZMLDocument', () => {
    it('should create a basic CZML document', () => {
      const doc = createCZMLDocument('Test Document');

      expect(doc.id).toBe('document');
      expect(doc.name).toBe('Test Document');
      expect(doc.version).toBe('1.0');
    });

    it('should use default name when not provided', () => {
      const doc = createCZMLDocument();

      expect(doc.name).toBe('Generated CZML');
    });

    it('should include clock settings when provided', () => {
      const doc = createCZMLDocument('Test', {
        startTime: '2024-01-01T00:00:00Z',
        stopTime: '2024-12-31T23:59:59Z',
        multiplier: 60,
      });

      expect(doc.clock).toBeDefined();
      expect(doc.clock?.interval).toBe('2024-01-01T00:00:00Z/2024-12-31T23:59:59Z');
      expect(doc.clock?.multiplier).toBe(60);
    });

    it('should include currentTime when provided', () => {
      const doc = createCZMLDocument('Test', {
        startTime: '2024-01-01T00:00:00Z',
        stopTime: '2024-12-31T23:59:59Z',
        currentTime: '2024-06-01T12:00:00Z',
      });

      expect(doc.clock?.currentTime).toBe('2024-06-01T12:00:00Z');
    });

    it('should default multiplier to 1', () => {
      const doc = createCZMLDocument('Test', {
        startTime: '2024-01-01T00:00:00Z',
        stopTime: '2024-12-31T23:59:59Z',
      });

      expect(doc.clock?.multiplier).toBe(1);
    });

    it('should set clock range and step', () => {
      const doc = createCZMLDocument('Test', {
        startTime: '2024-01-01T00:00:00Z',
        stopTime: '2024-12-31T23:59:59Z',
      });

      expect(doc.clock?.range).toBe('LOOP_STOP');
      expect(doc.clock?.step).toBe('SYSTEM_CLOCK_MULTIPLIER');
    });

    it('should not include clock when no time options provided', () => {
      const doc = createCZMLDocument('Test', {});

      expect(doc.clock).toBeUndefined();
    });
  });

  describe('createPoint', () => {
    it('should create a point entity', () => {
      const point = createPoint(
        { longitude: 2.3522, latitude: 48.8566 },
        { name: 'Paris', color: 'red', pixelSize: 15 }
      );

      expect(point.id).toBeDefined();
      expect(point.name).toBe('Paris');
      expect(point.position).toBeDefined();
      expect(point.point).toBeDefined();
      expect(point.point?.pixelSize).toBe(15);
    });

    it('should use default values when not provided', () => {
      const point = createPoint({ longitude: 0, latitude: 0 });

      expect(point.point?.pixelSize).toBe(10);
      expect(point.point?.outlineWidth).toBe(2);
    });
  });

  describe('createLabel', () => {
    it('should create a label entity', () => {
      const label = createLabel(
        { longitude: -74.006, latitude: 40.7128 },
        'New York City',
        { fillColor: 'white' }
      );

      expect(label.label?.text).toBe('New York City');
      expect(label.position).toBeDefined();
    });
  });

  describe('createPolyline', () => {
    it('should create a polyline entity', () => {
      const positions = [
        { longitude: -0.1276, latitude: 51.5074 },
        { longitude: 2.3522, latitude: 48.8566 },
      ];

      const polyline = createPolyline(positions, {
        name: 'London to Paris',
        color: 'blue',
        width: 5,
      });

      expect(polyline.polyline).toBeDefined();
      expect(polyline.polyline?.width).toBe(5);
      expect(polyline.polyline?.clampToGround).toBe(true);
    });
  });

  describe('createPolygon', () => {
    it('should create a polygon entity', () => {
      const positions = [
        { longitude: 0, latitude: 0 },
        { longitude: 1, latitude: 0 },
        { longitude: 1, latitude: 1 },
        { longitude: 0, latitude: 1 },
      ];

      const polygon = createPolygon(positions, {
        name: 'Test Area',
        color: 'green',
        extrudedHeight: 1000,
      });

      expect(polygon.polygon).toBeDefined();
      expect(polygon.polygon?.extrudedHeight).toBe(1000);
      expect(polygon.polygon?.outline).toBe(true);
    });
  });

  describe('createCircle', () => {
    it('should create a circle (ellipse) entity', () => {
      const circle = createCircle(
        { longitude: 139.6917, latitude: 35.6895 },
        50000,
        { name: 'Tokyo Area', color: 'orange' }
      );

      expect(circle.ellipse).toBeDefined();
      expect(circle.ellipse?.semiMajorAxis).toBe(50000);
      expect(circle.ellipse?.semiMinorAxis).toBe(50000);
    });
  });

  describe('createBox', () => {
    it('should create a box entity', () => {
      const box = createBox(
        { longitude: 0, latitude: 0, height: 0 },
        { x: 100, y: 100, z: 200 },
        { name: 'Test Box', color: 'purple' }
      );

      expect(box.box).toBeDefined();
      expect(box.box?.dimensions.cartesian).toEqual([100, 100, 200]);
    });
  });

  describe('buildCZMLDocument', () => {
    it('should build a complete CZML document array', () => {
      const point1 = createPoint({ longitude: 0, latitude: 0 }, { name: 'Point 1' });
      const point2 = createPoint({ longitude: 1, latitude: 1 }, { name: 'Point 2' });

      const czml = buildCZMLDocument([point1, point2], { name: 'Test Document' });

      expect(czml).toHaveLength(3);
      expect(czml[0].id).toBe('document');
      expect(czml[1].name).toBe('Point 1');
      expect(czml[2].name).toBe('Point 2');
    });
  });

  describe('createColorFromName', () => {
    it('should convert color names to RGBA', () => {
      expect(createColorFromName('red')).toEqual({ rgba: [255, 0, 0, 255] });
      expect(createColorFromName('green')).toEqual({ rgba: [0, 255, 0, 255] });
      expect(createColorFromName('blue')).toEqual({ rgba: [0, 0, 255, 255] });
    });

    it('should be case insensitive', () => {
      expect(createColorFromName('RED')).toEqual({ rgba: [255, 0, 0, 255] });
      expect(createColorFromName('Red')).toEqual({ rgba: [255, 0, 0, 255] });
    });

    it('should return red for unknown colors', () => {
      expect(createColorFromName('unknowncolor')).toEqual({ rgba: [255, 0, 0, 255] });
    });
  });

  describe('positionToCartographicDegrees', () => {
    it('should convert position to array', () => {
      const result = positionToCartographicDegrees({
        longitude: 2.3522,
        latitude: 48.8566,
        height: 100,
      });

      expect(result).toEqual([2.3522, 48.8566, 100]);
    });

    it('should default height to 0', () => {
      const result = positionToCartographicDegrees({
        longitude: 0,
        latitude: 0,
      });

      expect(result).toEqual([0, 0, 0]);
    });

    it('should handle negative coordinates', () => {
      const result = positionToCartographicDegrees({
        longitude: -122.4194,
        latitude: -33.8688,
        height: 500,
      });

      expect(result).toEqual([-122.4194, -33.8688, 500]);
    });
  });

  describe('createColor', () => {
    it('should create color with RGBA values', () => {
      const color = createColor(255, 128, 64, 200);

      expect(color).toEqual({ rgba: [255, 128, 64, 200] });
    });

    it('should default alpha to 255', () => {
      const color = createColor(100, 150, 200);

      expect(color).toEqual({ rgba: [100, 150, 200, 255] });
    });
  });

  describe('createSolidColorMaterial', () => {
    it('should create solid color material', () => {
      const color = { rgba: [255, 0, 0, 255] as [number, number, number, number] };
      const material = createSolidColorMaterial(color);

      expect(material).toEqual({
        solidColor: { color: { rgba: [255, 0, 0, 255] } },
      });
    });
  });

  describe('createEllipse', () => {
    it('should create an ellipse entity', () => {
      const ellipse = createEllipse(
        { longitude: 0, latitude: 0 },
        100000,
        50000,
        { name: 'Oval', color: 'purple' }
      );

      expect(ellipse.ellipse).toBeDefined();
      expect(ellipse.ellipse?.semiMajorAxis).toBe(100000);
      expect(ellipse.ellipse?.semiMinorAxis).toBe(50000);
    });

    it('should support extruded height', () => {
      const ellipse = createEllipse(
        { longitude: 0, latitude: 0 },
        50000,
        30000,
        { extrudedHeight: 5000 }
      );

      expect(ellipse.ellipse?.extrudedHeight).toBe(5000);
    });

    it('should support rotation', () => {
      const ellipse = createEllipse(
        { longitude: 0, latitude: 0 },
        50000,
        30000,
        { rotation: Math.PI / 4 }
      );

      expect(ellipse.ellipse?.rotation).toBe(Math.PI / 4);
    });
  });

  describe('createBillboard', () => {
    it('should create a billboard entity', () => {
      const billboard = createBillboard(
        { longitude: 0, latitude: 0 },
        'https://example.com/image.png',
        { name: 'Marker', scale: 2 }
      );

      expect(billboard.billboard).toBeDefined();
      expect(billboard.billboard?.image).toEqual({ uri: 'https://example.com/image.png' });
      expect(billboard.billboard?.scale).toBe(2);
    });

    it('should use default scale when not provided', () => {
      const billboard = createBillboard(
        { longitude: 0, latitude: 0 },
        'https://example.com/image.png'
      );

      expect(billboard.billboard?.scale).toBe(1);
    });
  });

  describe('createModel', () => {
    it('should create a model entity', () => {
      const model = createModel(
        { longitude: 0, latitude: 0 },
        'https://example.com/model.glb',
        { name: 'Aircraft', scale: 1000, minimumPixelSize: 128 }
      );

      expect(model.model).toBeDefined();
      expect(model.model?.gltf).toBe('https://example.com/model.glb');
      expect(model.model?.scale).toBe(1000);
      expect(model.model?.minimumPixelSize).toBe(128);
    });

    it('should use default values', () => {
      const model = createModel(
        { longitude: 0, latitude: 0 },
        'https://example.com/model.glb'
      );

      expect(model.model?.scale).toBe(1);
      expect(model.model?.minimumPixelSize).toBe(64);
    });
  });

  describe('createPath', () => {
    it('should create a path entity with time-dynamic positions', () => {
      const positions = [
        { longitude: 0, latitude: 0 },
        { longitude: 10, latitude: 10 },
        { longitude: 20, latitude: 20 },
      ];
      const times = [
        '2024-01-01T00:00:00Z',
        '2024-01-01T01:00:00Z',
        '2024-01-01T02:00:00Z',
      ];

      const path = createPath(positions, times, {
        name: 'Flight Path',
        color: 'yellow',
        width: 3,
      });

      expect(path.path).toBeDefined();
      expect(path.availability).toBe('2024-01-01T00:00:00Z/2024-01-01T02:00:00Z');
      expect(path.position?.epoch).toBe('2024-01-01T00:00:00Z');
    });

    it('should throw error when positions and times length mismatch', () => {
      const positions = [
        { longitude: 0, latitude: 0 },
        { longitude: 10, latitude: 10 },
      ];
      const times = ['2024-01-01T00:00:00Z'];

      expect(() => createPath(positions, times)).toThrow(
        'Positions and times arrays must have the same length'
      );
    });

    it('should allow hiding the path trail', () => {
      const positions = [
        { longitude: 0, latitude: 0 },
        { longitude: 10, latitude: 10 },
      ];
      const times = ['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z'];

      const path = createPath(positions, times, { showPath: false });

      expect(path.path).toBeUndefined();
    });

    it('should support lead and trail time', () => {
      const positions = [
        { longitude: 0, latitude: 0 },
        { longitude: 10, latitude: 10 },
      ];
      const times = ['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z'];

      const path = createPath(positions, times, {
        leadTime: 300,
        trailTime: 600,
      });

      expect(path.path?.leadTime).toBe(300);
      expect(path.path?.trailTime).toBe(600);
    });
  });

  describe('createPoint - additional tests', () => {
    it('should include heightReference', () => {
      const point = createPoint({ longitude: 0, latitude: 0 });

      expect(point.point?.heightReference).toBe('CLAMP_TO_GROUND');
    });

    it('should allow custom outline color', () => {
      const point = createPoint(
        { longitude: 0, latitude: 0 },
        { outlineColor: 'blue' }
      );

      expect(point.point?.outlineColor).toEqual({ rgba: [0, 0, 255, 255] });
    });

    it('should allow custom outline width', () => {
      const point = createPoint(
        { longitude: 0, latitude: 0 },
        { outlineWidth: 5 }
      );

      expect(point.point?.outlineWidth).toBe(5);
    });
  });

  describe('createLabel - additional tests', () => {
    it('should include horizontal and vertical origin', () => {
      const label = createLabel({ longitude: 0, latitude: 0 }, 'Test');

      expect(label.label?.horizontalOrigin).toBe('CENTER');
      expect(label.label?.verticalOrigin).toBe('BOTTOM');
    });

    it('should include default pixel offset', () => {
      const label = createLabel({ longitude: 0, latitude: 0 }, 'Test');

      expect(label.label?.pixelOffset).toEqual({ cartesian2: [0, -20] });
    });

    it('should allow custom font', () => {
      const label = createLabel(
        { longitude: 0, latitude: 0 },
        'Test',
        { font: '20pt Arial' }
      );

      expect(label.label?.font).toBe('20pt Arial');
    });

    it('should allow custom scale', () => {
      const label = createLabel(
        { longitude: 0, latitude: 0 },
        'Test',
        { scale: 2 }
      );

      expect(label.label?.scale).toBe(2);
    });

    it('should allow custom pixel offset', () => {
      const label = createLabel(
        { longitude: 0, latitude: 0 },
        'Test',
        { pixelOffset: [10, -30] }
      );

      expect(label.label?.pixelOffset).toEqual({ cartesian2: [10, -30] });
    });
  });

  describe('createPolyline - additional tests', () => {
    it('should handle positions with height', () => {
      const positions = [
        { longitude: 0, latitude: 0, height: 1000 },
        { longitude: 10, latitude: 10, height: 2000 },
      ];

      const polyline = createPolyline(positions);

      expect(polyline.polyline?.positions.cartographicDegrees).toEqual([
        0, 0, 1000, 10, 10, 2000,
      ]);
    });

    it('should allow disabling clampToGround', () => {
      const positions = [
        { longitude: 0, latitude: 0 },
        { longitude: 10, latitude: 10 },
      ];

      const polyline = createPolyline(positions, { clampToGround: false });

      expect(polyline.polyline?.clampToGround).toBe(false);
    });
  });

  describe('createPolygon - additional tests', () => {
    it('should allow custom outline color', () => {
      const positions = [
        { longitude: 0, latitude: 0 },
        { longitude: 1, latitude: 0 },
        { longitude: 1, latitude: 1 },
      ];

      const polygon = createPolygon(positions, { outlineColor: 'red' });

      expect(polygon.polygon?.outlineColor).toEqual({ rgba: [255, 0, 0, 255] });
    });

    it('should allow custom height', () => {
      const positions = [
        { longitude: 0, latitude: 0 },
        { longitude: 1, latitude: 0 },
        { longitude: 1, latitude: 1 },
      ];

      const polygon = createPolygon(positions, { height: 500 });

      expect(polygon.polygon?.height).toBe(500);
    });

    it('should allow disabling outline', () => {
      const positions = [
        { longitude: 0, latitude: 0 },
        { longitude: 1, latitude: 0 },
        { longitude: 1, latitude: 1 },
      ];

      const polygon = createPolygon(positions, { outline: false });

      expect(polygon.polygon?.outline).toBe(false);
    });
  });

  describe('buildCZMLDocument - additional tests', () => {
    it('should include all document options', () => {
      const point = createPoint({ longitude: 0, latitude: 0 });

      const czml = buildCZMLDocument([point], {
        name: 'Custom Doc',
        startTime: '2024-01-01T00:00:00Z',
        stopTime: '2024-12-31T23:59:59Z',
        multiplier: 100,
      });

      expect(czml[0].name).toBe('Custom Doc');
      expect(czml[0].clock?.multiplier).toBe(100);
    });

    it('should handle empty entity array', () => {
      const czml = buildCZMLDocument([], { name: 'Empty' });

      expect(czml).toHaveLength(1);
      expect(czml[0].id).toBe('document');
    });

    it('should handle many entities', () => {
      const points = Array.from({ length: 100 }, (_, i) =>
        createPoint({ longitude: i, latitude: i }, { name: `Point ${i}` })
      );

      const czml = buildCZMLDocument(points);

      expect(czml).toHaveLength(101);
    });
  });

  describe('createColorFromName - additional tests', () => {
    it('should convert all standard colors', () => {
      const colors = ['yellow', 'orange', 'purple', 'pink', 'cyan', 'black'];

      for (const color of colors) {
        const result = createColorFromName(color);
        expect(result.rgba).toBeDefined();
        expect(result.rgba).toHaveLength(4);
      }
    });

    it('should handle gray and grey spelling', () => {
      const gray = createColorFromName('gray');
      const grey = createColorFromName('grey');

      expect(gray).toEqual(grey);
      expect(gray).toEqual({ rgba: [128, 128, 128, 255] });
    });
  });
});

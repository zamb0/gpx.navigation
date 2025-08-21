// Test to verify the GPX service structure and exports

describe('GPX Service Structure', () => {
  it('should have the correct service structure', () => {
    // Test that the service files exist and can be imported
    expect(() => {
      require('../GPXValidator');
      require('../GPXConverter');
      require('../GPXMetadataExtractor');
    }).not.toThrow();
  });

  it('should export GPX service classes', () => {
    const { GPXValidator } = require('../GPXValidator');
    const { GPXConverter } = require('../GPXConverter');
    const { GPXMetadataExtractor } = require('../GPXMetadataExtractor');

    expect(GPXValidator).toBeDefined();
    expect(GPXConverter).toBeDefined();
    expect(GPXMetadataExtractor).toBeDefined();

    // Test that classes can be instantiated
    expect(() => new GPXValidator()).not.toThrow();
    expect(() => new GPXConverter()).not.toThrow();
    expect(() => new GPXMetadataExtractor()).not.toThrow();
  });

  it('should have proper class methods', () => {
    const { GPXValidator } = require('../GPXValidator');
    const { GPXConverter } = require('../GPXConverter');
    const { GPXMetadataExtractor } = require('../GPXMetadataExtractor');

    const validator = new GPXValidator();
    const converter = new GPXConverter();
    const extractor = new GPXMetadataExtractor();

    // Check that key methods exist
    expect(typeof validator.validateGPXString).toBe('function');
    expect(typeof validator.validateGPXFile).toBe('function');
    expect(typeof validator.validateForMobile).toBe('function');

    expect(typeof converter.convertCoordinates).toBe('function');
    expect(typeof converter.simplifyTrackPoints).toBe('function');

    expect(typeof extractor.extractActivityType).toBe('function');
    expect(typeof extractor.hasElevationData).toBe('function');
    expect(typeof extractor.hasTimestampData).toBe('function');
  });

  it('should validate basic GPX string structure', () => {
    const { GPXValidator } = require('../GPXValidator');
    const validator = new GPXValidator();

    // Test empty string
    const emptyResult = validator.validateGPXString('');
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.errors).toContain('GPX content is empty');

    // Test non-GPX content
    const invalidResult = validator.validateGPXString('<xml>not gpx</xml>');
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors).toContain('Missing GPX root element');
  });

  it('should convert coordinates to different formats', () => {
    const { GPXConverter } = require('../GPXConverter');
    const converter = new GPXConverter();

    const coords = { lat: 37.7749, lon: -122.4194 };
    const converted = converter.convertCoordinates(coords);

    expect(converted.decimal).toEqual({ lat: 37.7749, lon: -122.4194 });
    expect(converted.dms.lat).toContain('37°');
    expect(converted.dms.lat).toContain('N');
    expect(converted.dms.lon).toContain('122°');
    expect(converted.dms.lon).toContain('W');
    expect(converted.utm).toMatch(/^\d+[NS]$/);
  });

  it('should simplify track points', () => {
    const { GPXConverter } = require('../GPXConverter');
    const converter = new GPXConverter();

    const points = [
      { latitude: 0, longitude: 0 },
      { latitude: 0.00001, longitude: 0.00001 }, // Very close point
      { latitude: 0.001, longitude: 0.001 }, // Further point
      { latitude: 0.002, longitude: 0.002 }, // End point
    ];

    const simplified = converter.simplifyTrackPoints(points, 0.0001);

    expect(simplified.length).toBeLessThanOrEqual(points.length);
    expect(simplified[0]).toEqual(points[0]); // First point preserved
    expect(simplified[simplified.length - 1]).toEqual(
      points[points.length - 1]
    ); // Last point preserved
  });
});

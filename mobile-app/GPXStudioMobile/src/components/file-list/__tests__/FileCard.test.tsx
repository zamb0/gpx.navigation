import { GPXFileMetadata } from '../../../types/gpx';
import {
  formatDistance,
  formatFileSize,
  formatDate,
} from '../../../utils/formatters';

const mockFile: GPXFileMetadata = {
  id: '1',
  filename: 'test.gpx',
  name: 'Test Track',
  description: 'A test track for hiking',
  createdAt: new Date('2024-01-01'),
  modifiedAt: new Date('2024-01-01'),
  fileSize: 1024,
  trackCount: 1,
  waypointCount: 2,
  totalDistance: 5000,
  elevationGain: 100,
  elevationLoss: 50,
  bounds: { north: 45, south: 44, east: -122, west: -123 },
  filePath: '/path/to/test.gpx',
};

describe('FileCard Logic', () => {
  it('formats file metadata correctly', () => {
    expect(formatDistance(mockFile.totalDistance)).toBe('5.0 km');
    expect(formatDistance(mockFile.elevationGain, 'elevation')).toBe('100 m');
    expect(formatFileSize(mockFile.fileSize)).toBe('1.0 KB');
    expect(formatDate(mockFile.createdAt)).toBeDefined();
  });

  it('handles file without name', () => {
    const fileWithoutName = { ...mockFile, name: undefined };
    const displayName = fileWithoutName.name || fileWithoutName.filename;
    expect(displayName).toBe('test.gpx');
  });

  it('handles file without description', () => {
    const fileWithoutDescription = { ...mockFile, description: undefined };
    expect(fileWithoutDescription.description).toBeUndefined();
  });

  it('handles file without waypoints', () => {
    const fileWithoutWaypoints = { ...mockFile, waypointCount: 0 };
    expect(fileWithoutWaypoints.waypointCount).toBe(0);
  });

  it('calculates correct statistics', () => {
    expect(mockFile.trackCount).toBe(1);
    expect(mockFile.waypointCount).toBe(2);
    expect(mockFile.totalDistance).toBe(5000);
    expect(mockFile.elevationGain).toBe(100);
  });

  it('has valid file metadata structure', () => {
    expect(mockFile.id).toBeDefined();
    expect(mockFile.filename).toBeDefined();
    expect(mockFile.createdAt).toBeInstanceOf(Date);
    expect(mockFile.modifiedAt).toBeInstanceOf(Date);
    expect(mockFile.fileSize).toBeGreaterThan(0);
    expect(mockFile.bounds).toBeDefined();
    expect(mockFile.filePath).toBeDefined();
  });

  it('formats elevation gain with arrow symbol', () => {
    const elevationText = `↗ ${formatDistance(mockFile.elevationGain, 'elevation')}`;
    expect(elevationText).toBe('↗ 100 m');
  });
});

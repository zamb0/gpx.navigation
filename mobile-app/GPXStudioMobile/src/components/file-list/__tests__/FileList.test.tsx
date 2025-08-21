import { GPXFileMetadata } from '../../../types/gpx';
import { SortOption, SortDirection } from '../FileList';

// Mock data
const mockFiles: GPXFileMetadata[] = [
  {
    id: '1',
    filename: 'test1.gpx',
    name: 'Test Track 1',
    description: 'A test track',
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
    fileSize: 1024,
    trackCount: 1,
    waypointCount: 2,
    totalDistance: 5000,
    elevationGain: 100,
    elevationLoss: 50,
    bounds: { north: 45, south: 44, east: -122, west: -123 },
    filePath: '/path/to/test1.gpx',
  },
  {
    id: '2',
    filename: 'test2.gpx',
    name: 'Test Track 2',
    createdAt: new Date('2024-01-02'),
    modifiedAt: new Date('2024-01-02'),
    fileSize: 2048,
    trackCount: 2,
    waypointCount: 0,
    totalDistance: 10000,
    elevationGain: 200,
    elevationLoss: 100,
    bounds: { north: 46, south: 45, east: -121, west: -122 },
    filePath: '/path/to/test2.gpx',
  },
];

// Helper function to simulate file filtering logic
function filterFiles(
  files: GPXFileMetadata[],
  searchQuery: string,
  sortBy: SortOption,
  sortDirection: SortDirection
): GPXFileMetadata[] {
  let filtered = [...files];

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (file) =>
        file.filename.toLowerCase().includes(query) ||
        file.name?.toLowerCase().includes(query) ||
        file.description?.toLowerCase().includes(query)
    );
  }

  // Apply sorting
  filtered.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case 'name':
        comparison = (a.name || a.filename).localeCompare(b.name || b.filename);
        break;
      case 'distance':
        comparison = a.totalDistance - b.totalDistance;
        break;
      case 'size':
        comparison = a.fileSize - b.fileSize;
        break;
    }

    return sortDirection === 'desc' ? -comparison : comparison;
  });

  return filtered;
}

describe('FileList Logic', () => {
  it('filters files by search query correctly', () => {
    const filtered = filterFiles(mockFiles, 'Track 1', 'date', 'desc');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Test Track 1');
  });

  it('filters files by filename', () => {
    const filtered = filterFiles(mockFiles, 'test2.gpx', 'date', 'desc');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].filename).toBe('test2.gpx');
  });

  it('filters files by description', () => {
    const filtered = filterFiles(mockFiles, 'A test track', 'date', 'desc');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].description).toBe('A test track');
  });

  it('sorts files by name ascending', () => {
    const sorted = filterFiles(mockFiles, '', 'name', 'asc');
    expect(sorted[0].name).toBe('Test Track 1');
    expect(sorted[1].name).toBe('Test Track 2');
  });

  it('sorts files by name descending', () => {
    const sorted = filterFiles(mockFiles, '', 'name', 'desc');
    expect(sorted[0].name).toBe('Test Track 2');
    expect(sorted[1].name).toBe('Test Track 1');
  });

  it('sorts files by date ascending', () => {
    const sorted = filterFiles(mockFiles, '', 'date', 'asc');
    expect(sorted[0].createdAt.getTime()).toBeLessThan(
      sorted[1].createdAt.getTime()
    );
  });

  it('sorts files by distance', () => {
    const sorted = filterFiles(mockFiles, '', 'distance', 'desc');
    expect(sorted[0].totalDistance).toBeGreaterThan(sorted[1].totalDistance);
  });

  it('sorts files by size', () => {
    const sorted = filterFiles(mockFiles, '', 'size', 'desc');
    expect(sorted[0].fileSize).toBeGreaterThan(sorted[1].fileSize);
  });

  it('returns empty array when no files match search', () => {
    const filtered = filterFiles(mockFiles, 'nonexistent', 'date', 'desc');
    expect(filtered).toHaveLength(0);
  });

  it('returns all files when search query is empty', () => {
    const filtered = filterFiles(mockFiles, '', 'date', 'desc');
    expect(filtered).toHaveLength(mockFiles.length);
  });
});

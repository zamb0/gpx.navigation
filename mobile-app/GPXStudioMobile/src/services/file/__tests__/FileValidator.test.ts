import { FileValidator, FileValidationOptions } from '../FileValidator';
import * as FileSystem from 'expo-file-system';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('../../../services/gpx/GPXValidator');

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('FileValidator', () => {
  let fileValidator: FileValidator;

  const validGPXContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="45.0" lon="-122.0">
        <ele>100</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

  beforeEach(() => {
    jest.clearAllMocks();
    fileValidator = new FileValidator();
  });

  describe('validateFile', () => {
    it('should validate a correct GPX file successfully', async () => {
      const testUri = '/mock/valid.gpx';

      // Mock file exists and has reasonable size
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 1024,
        modificationTime: Date.now(),
        uri: testUri,
      });

      mockFileSystem.readAsStringAsync.mockResolvedValue(validGPXContent);

      const result = await fileValidator.validateFile(testUri);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for non-existent files', async () => {
      const testUri = '/mock/nonexistent.gpx';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false,
        uri: testUri,
      });

      const result = await fileValidator.validateFile(testUri);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File does not exist');
    });

    it('should fail validation for empty files', async () => {
      const testUri = '/mock/empty.gpx';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 0,
        modificationTime: Date.now(),
        uri: testUri,
      });

      const result = await fileValidator.validateFile(testUri);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should handle file read errors gracefully', async () => {
      const testUri = '/mock/unreadable.gpx';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 1024,
        modificationTime: Date.now(),
        uri: testUri,
      });

      mockFileSystem.readAsStringAsync.mockRejectedValue(
        new Error('Permission denied')
      );

      const result = await fileValidator.validateFile(testUri);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) => error.includes('Failed to read file'))
      ).toBe(true);
    });
  });

  describe('getFileInfo', () => {
    it('should return correct file information for existing files', async () => {
      const testUri = '/mock/test.gpx';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 1024,
        modificationTime: Date.now(),
        uri: testUri,
      });

      const result = await fileValidator.getFileInfo(testUri);

      expect(result.exists).toBe(true);
      expect(result.isReadable).toBe(true);
      expect(result.size).toBe(1024);
      expect(result.uri).toBe(testUri);
    });

    it('should handle non-existent files', async () => {
      const testUri = '/mock/nonexistent.gpx';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false,
        uri: testUri,
      });

      const result = await fileValidator.getFileInfo(testUri);

      expect(result.exists).toBe(false);
      expect(result.isReadable).toBe(false);
    });
  });

  describe('repairFile', () => {
    it('should remove BOM from file content', async () => {
      const contentWithBOM = '\uFEFF' + validGPXContent;

      const result = await fileValidator.repairFile(contentWithBOM);

      expect(result.success).toBe(true);
      expect(result.repairedContent).toBe(validGPXContent);
      expect(result.changes).toContain('Removed BOM (Byte Order Mark)');
    });

    it('should add XML declaration if missing', async () => {
      const contentWithoutDeclaration = validGPXContent.replace(
        '<?xml version="1.0" encoding="UTF-8"?>\n',
        ''
      );

      const result = await fileValidator.repairFile(contentWithoutDeclaration);

      expect(result.success).toBe(true);
      expect(
        result.repairedContent?.startsWith(
          '<?xml version="1.0" encoding="UTF-8"?>'
        )
      ).toBe(true);
      expect(result.changes).toContain('Added XML declaration');
    });

    it('should return no changes for already valid content', async () => {
      const result = await fileValidator.repairFile(validGPXContent);

      expect(result.success).toBe(false);
      expect(result.repairedContent).toBeUndefined();
      expect(result.changes).toHaveLength(0);
    });
  });
});

import {
  formatDistance,
  formatFileSize,
  formatDate,
  formatDuration,
  formatSpeed,
  formatCoordinates,
  formatElevationChange,
} from '../formatters';

describe('formatters', () => {
  describe('formatDistance', () => {
    it('formats small distances in meters', () => {
      expect(formatDistance(0)).toBe('0 m');
      expect(formatDistance(500)).toBe('500 m');
      expect(formatDistance(999)).toBe('999 m');
    });

    it('formats medium distances in kilometers with decimal', () => {
      expect(formatDistance(1500)).toBe('1.5 km');
      expect(formatDistance(5432)).toBe('5.4 km');
      expect(formatDistance(9999)).toBe('10.0 km');
    });

    it('formats large distances in whole kilometers', () => {
      expect(formatDistance(10000)).toBe('10 km');
      expect(formatDistance(25000)).toBe('25 km');
      expect(formatDistance(100000)).toBe('100 km');
    });

    it('formats elevation distances appropriately', () => {
      expect(formatDistance(50, 'elevation')).toBe('50 m');
      expect(formatDistance(1500, 'elevation')).toBe('1.5 km');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048575)).toBe('1024.0 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(5242880)).toBe('5.0 MB');
    });

    it('formats gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
      expect(formatFileSize(2147483648)).toBe('2.0 GB');
    });
  });

  describe('formatDate', () => {
    const now = new Date('2024-01-15T12:00:00Z');

    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('formats today', () => {
      const today = new Date('2024-01-15T10:00:00Z');
      expect(formatDate(today)).toBe('Today');
    });

    it('formats yesterday', () => {
      const yesterday = new Date('2024-01-14T10:00:00Z');
      expect(formatDate(yesterday)).toBe('Yesterday');
    });

    it('formats days ago', () => {
      const threeDaysAgo = new Date('2024-01-12T10:00:00Z');
      expect(formatDate(threeDaysAgo)).toBe('3 days ago');
    });

    it('formats weeks ago', () => {
      const twoWeeksAgo = new Date('2024-01-01T10:00:00Z');
      expect(formatDate(twoWeeksAgo)).toBe('2 weeks ago');
    });

    it('formats months ago', () => {
      const twoMonthsAgo = new Date('2023-11-15T10:00:00Z');
      expect(formatDate(twoMonthsAgo)).toBe('2 months ago');
    });

    it('formats old dates with full date', () => {
      const oldDate = new Date('2022-01-15T10:00:00Z');
      expect(formatDate(oldDate)).toBe(oldDate.toLocaleDateString());
    });
  });

  describe('formatDuration', () => {
    it('formats seconds', () => {
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(59)).toBe('59s');
    });

    it('formats minutes and seconds', () => {
      expect(formatDuration(60)).toBe('1m');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(3599)).toBe('59m 59s');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(3600)).toBe('1h');
      expect(formatDuration(5400)).toBe('1h 30m');
      expect(formatDuration(86399)).toBe('23h 59m');
    });

    it('formats days and hours', () => {
      expect(formatDuration(86400)).toBe('1d');
      expect(formatDuration(90000)).toBe('1d 1h');
    });
  });

  describe('formatSpeed', () => {
    it('formats slow speeds in m/s', () => {
      expect(formatSpeed(0.1)).toBe('0.1 m/s');
      expect(formatSpeed(0.27)).toBe('0.3 m/s');
    });

    it('formats normal speeds in km/h', () => {
      expect(formatSpeed(1)).toBe('3.6 km/h');
      expect(formatSpeed(5)).toBe('18 km/h');
      expect(formatSpeed(13.89)).toBe('50 km/h');
    });
  });

  describe('formatCoordinates', () => {
    it('formats positive coordinates', () => {
      expect(formatCoordinates(45.12345, -122.6789)).toBe(
        '45.12345°N, 122.6789°W'
      );
    });

    it('formats negative coordinates', () => {
      expect(formatCoordinates(-45.12345, 122.6789)).toBe(
        '45.12345°S, 122.6789°E'
      );
    });

    it('respects precision parameter', () => {
      expect(formatCoordinates(45.123456789, -122.678901234, 2)).toBe(
        '45.12°N, 122.68°W'
      );
    });
  });

  describe('formatElevationChange', () => {
    it('formats positive elevation change', () => {
      expect(formatElevationChange(100)).toBe('+100 m');
      expect(formatElevationChange(1500)).toBe('+1.5 km');
    });

    it('formats negative elevation change', () => {
      expect(formatElevationChange(-100)).toBe('-100 m');
      expect(formatElevationChange(-1500)).toBe('-1.5 km');
    });

    it('formats zero elevation change', () => {
      expect(formatElevationChange(0)).toBe('+0 m');
    });
  });
});

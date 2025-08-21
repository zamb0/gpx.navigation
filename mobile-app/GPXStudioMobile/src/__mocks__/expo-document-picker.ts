export const getDocumentAsync = jest.fn().mockResolvedValue({
  canceled: false,
  assets: [
    {
      uri: 'file://test.gpx',
      name: 'test.gpx',
      size: 1024,
      mimeType: 'application/gpx+xml',
    },
  ],
});

export default {
  getDocumentAsync,
};

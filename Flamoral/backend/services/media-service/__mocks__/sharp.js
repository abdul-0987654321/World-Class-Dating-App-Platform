// Mock implementation of sharp for testing
const mockSharpInstance = {
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-thumbnail-jpeg-data')),
  toFile: jest.fn().mockResolvedValue({}),
  metadata: jest.fn().mockResolvedValue({ width: 1920, height: 1080, format: 'jpeg' }),
};

const sharpMock = jest.fn(() => mockSharpInstance);

// For ES6 default export
module.exports = sharpMock;
module.exports.default = sharpMock;
